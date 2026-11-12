import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { createStore, type WaStore } from 'zapo-js';
import {
  createSqliteStore,
  openSqliteConnection,
  type WaSqliteConnection,
} from '@zapo-js/store-sqlite';

import IAuth from '../client/IAuth';
import type { LIDMappingStoreLike, LIDPNPair } from './LIDMapper';

/** Serializador / deserializador JSON com suporte a Buffer. */
export const BufferJSON = {
  replacer: (_k: string, value: any) => {
    if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
      return { type: 'Buffer', data: Array.from(value) };
    }
    return value;
  },
  reviver: (_k: string, value: any) => {
    if (
      typeof value === 'object' &&
      value !== null &&
      (value.buffer === true || value.type === 'Buffer') &&
      Array.isArray(value.data)
    ) {
      return Buffer.from(value.data);
    }
    return value;
  },
};

/**
 * Autenticação e armazenamento persistente do WhatsApp baseado em SQLite.
 * Utiliza o provider `@zapo-js/store-sqlite` para armazenar chaves Signal, credenciais,
 * sessões, contatos, mensagens e metadados, além de persistir os registros do bot
 * (`chats-*`, `users-*`, `polls-*`) na mesma base.
 */
export class SqliteAuthState implements IAuth {
  public path: string;
  public folder?: string;
  public botPhoneNumber?: string;
  public sessionId: string;

  private connection: WaSqliteConnection | null = null;
  private store: WaStore | null = null;
  private preparePromise: Promise<void> | null = null;
  private legacyMigrated: boolean = false;

  constructor(
    pathOrFolder: string = './session',
    botPhoneNumber: string = '',
    sessionId: string = 'default',
  ) {
    this.botPhoneNumber = botPhoneNumber ? String(botPhoneNumber).trim() : '';
    this.sessionId = sessionId || 'default';

    if (
      pathOrFolder === ':memory:' ||
      pathOrFolder.endsWith('.sqlite') ||
      pathOrFolder.endsWith('.db')
    ) {
      this.path = pathOrFolder;
      this.folder = pathOrFolder === ':memory:' ? undefined : './session';
    } else {
      this.folder = pathOrFolder;
      try {
        if (!existsSync(pathOrFolder)) {
          mkdirSync(pathOrFolder, { recursive: true });
        }
      } catch {}
      this.path = join(pathOrFolder, 'session.sqlite');
    }
  }

  public async prepare(): Promise<void> {
    if (this.connection) return;
    if (this.preparePromise) return this.preparePromise;

    this.preparePromise = (async () => {
      if (this.folder && this.path !== ':memory:') {
        try {
          if (!existsSync(this.folder)) {
            mkdirSync(this.folder, { recursive: true });
          }
        } catch {}
      }

      this.connection = await openSqliteConnection({
        path: this.path,
        sessionId: this.sessionId,
      });

      await this.connection.exec(`
        CREATE TABLE IF NOT EXISTS rompot_records (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS rompot_lid_mapping (
          lid TEXT PRIMARY KEY,
          pn TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_rompot_lid_mapping_pn ON rompot_lid_mapping(pn);
      `);

      await this.migrateLegacyFiles();
    })();

    try {
      await this.preparePromise;
    } finally {
      this.preparePromise = null;
    }
  }

  /**
   * Importa registros legados em JSON (`chats-*.json`, `users-*.json`, `polls-*.json`)
   * da pasta de sessão para o banco SQLite (apenas uma vez).
   */
  private async migrateLegacyFiles(): Promise<void> {
    if (this.legacyMigrated || !this.folder || this.path === ':memory:') return;
    this.legacyMigrated = true;

    try {
      if (!existsSync(this.folder)) return;
      const entries = readdirSync(this.folder);
      const jsonFiles = entries.filter(
        (f) =>
          f.endsWith('.json') &&
          (f.startsWith('chats-') || f.startsWith('users-') || f.startsWith('polls-')),
      );

      if (!jsonFiles.length || !this.connection) return;

      for (const file of jsonFiles) {
        try {
          const key = file.replace('.json', '');
          const fullPath = join(this.folder, file);
          const raw = readFileSync(fullPath, 'utf-8');
          const parsed = JSON.parse(raw, BufferJSON.reviver);
          const serialized = JSON.stringify(parsed, BufferJSON.replacer);

          await this.connection.run(
            `INSERT INTO rompot_records (key, value, updated_at)
             VALUES (?, ?, ?)
             ON CONFLICT(key) DO NOTHING`,
            [key, serialized, Date.now()],
          );
        } catch {}
      }
    } catch {}
  }

  public async get(key: string): Promise<any> {
    await this.prepare();
    if (!this.connection) return null;

    try {
      const row = (await this.connection.get(
        'SELECT value FROM rompot_records WHERE key = ?',
        [key],
      )) as { value: string } | undefined;

      if (!row || !row.value) return null;

      try {
        return JSON.parse(row.value, BufferJSON.reviver);
      } catch {
        return row.value;
      }
    } catch {
      return null;
    }
  }

  public async set(key: string, data: any): Promise<void> {
    await this.prepare();
    if (!this.connection) return;

    if (data === null || data === undefined) {
      await this.remove(key);
      return;
    }

    try {
      const serialized = JSON.stringify(data, BufferJSON.replacer);
      await this.connection.run(
        `INSERT INTO rompot_records (key, value, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        [key, serialized, Date.now()],
      );
    } catch {}
  }

  public async remove(key: string): Promise<void> {
    await this.prepare();
    if (!this.connection) return;

    try {
      await this.connection.run('DELETE FROM rompot_records WHERE key = ?', [key]);
    } catch {}
  }

  public async listAll(pattern: string = ''): Promise<string[]> {
    await this.prepare();
    if (!this.connection) return [];

    try {
      const sqlPattern = pattern ? `${pattern}%` : '%';
      const rows = (await this.connection.all(
        'SELECT key FROM rompot_records WHERE key LIKE ?',
        [sqlPattern],
      )) as Array<{ key: string }>;

      return (rows || []).map((r) => r.key);
    } catch {
      return [];
    }
  }

  /**
   * Construtor da store do Zapo conectada à mesma base SQLite.
   */
  public async getStore(sessionId: string = this.sessionId): Promise<WaStore> {
    await this.prepare();
    if (!this.connection) {
      throw new Error('SQLite connection not available');
    }

    if (!this.store) {
      const sqliteBackend = createSqliteStore({ connection: this.connection });
      this.store = createStore({
        backends: {
          sqlite: sqliteBackend,
        },
        providers: {
          auth: 'sqlite',
          signal: 'sqlite',
          preKey: 'sqlite',
          session: 'sqlite',
          identity: 'sqlite',
          senderKey: 'sqlite',
          appState: 'sqlite',
          privacyToken: 'sqlite',
          messages: 'sqlite',
          threads: 'sqlite',
          contacts: 'sqlite',
        } as any,
      });
    }

    return this.store;
  }

  /**
   * Retorna a interface de armazenamento de mapeamentos PN ↔ LID conectada ao SQLite.
   */
  public getLidStore(): LIDMappingStoreLike {
    const auth = this;
    return {
      async getPNForLID(lid: string): Promise<string | null> {
        await auth.prepare();
        if (!auth.connection) return null;
        try {
          const row = (await auth.connection.get(
            'SELECT pn FROM rompot_lid_mapping WHERE lid = ?',
            [lid],
          )) as { pn: string } | undefined;
          return row?.pn || null;
        } catch {
          return null;
        }
      },
      async getLIDForPN(pn: string): Promise<string | null> {
        await auth.prepare();
        if (!auth.connection) return null;
        try {
          const row = (await auth.connection.get(
            'SELECT lid FROM rompot_lid_mapping WHERE pn = ?',
            [pn],
          )) as { lid: string } | undefined;
          return row?.lid || null;
        } catch {
          return null;
        }
      },
      async storeLIDPNMappings(pairs: LIDPNPair[]): Promise<void> {
        await auth.prepare();
        if (!auth.connection || !pairs.length) return;
        try {
          await auth.connection.runInTransaction(() => {
            for (const { lid, pn } of pairs) {
              if (!lid || !pn) continue;
              auth.connection!.run(
                `INSERT INTO rompot_lid_mapping (lid, pn, updated_at)
                 VALUES (?, ?, ?)
                 ON CONFLICT(lid) DO UPDATE SET pn = excluded.pn, updated_at = excluded.updated_at`,
                [lid, pn, Date.now()],
              );
            }
          });
        } catch {}
      },
    };
  }

  public getConnection(): WaSqliteConnection | null {
    return this.connection;
  }

  public async close(): Promise<void> {
    if (this.store) {
      try {
        await this.store.destroy();
      } catch {}
      this.store = null;
    }

    if (this.connection) {
      try {
        this.connection.close();
      } catch {}
      this.connection = null;
    }
  }
}

/**
 * Adaptador de compatibilidade para código que instancie `MultiFileAuthState`.
 * Internamente utiliza SQLite para persistência sólida e eficiente.
 */
export class MultiFileAuthState extends SqliteAuthState {
  public autoCreateDir: boolean;

  constructor(
    folder: string = './session',
    botPhoneNumber: string = '',
    autoCreateDir: boolean = true,
    sessionId: string = 'default',
  ) {
    super(folder, botPhoneNumber, sessionId);
    this.autoCreateDir = autoCreateDir;
  }

  public getStat(folder: string) {
    try {
      return statSync(folder);
    } catch {
      return null;
    }
  }

  public fixFileName = (file?: string) =>
    file?.replace(/\//g, '__')?.replace(/:/g, '-');
}
