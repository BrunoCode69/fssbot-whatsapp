"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiFileAuthState = exports.SqliteAuthState = exports.BufferJSON = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const zapo_js_1 = require("zapo-js");
const store_sqlite_1 = require("@zapo-js/store-sqlite");
/** Serializador / deserializador JSON com suporte a Buffer. */
exports.BufferJSON = {
    replacer: (_k, value) => {
        if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
            return { type: 'Buffer', data: Array.from(value) };
        }
        return value;
    },
    reviver: (_k, value) => {
        if (typeof value === 'object' &&
            value !== null &&
            (value.buffer === true || value.type === 'Buffer') &&
            Array.isArray(value.data)) {
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
class SqliteAuthState {
    constructor(pathOrFolder = './session', botPhoneNumber = '', sessionId = 'default') {
        this.connection = null;
        this.store = null;
        this.preparePromise = null;
        this.legacyMigrated = false;
        this.botPhoneNumber = botPhoneNumber ? String(botPhoneNumber).trim() : '';
        this.sessionId = sessionId || 'default';
        if (pathOrFolder === ':memory:' ||
            pathOrFolder.endsWith('.sqlite') ||
            pathOrFolder.endsWith('.db')) {
            this.path = pathOrFolder;
            this.folder = pathOrFolder === ':memory:' ? undefined : './session';
        }
        else {
            this.folder = pathOrFolder;
            try {
                if (!(0, fs_1.existsSync)(pathOrFolder)) {
                    (0, fs_1.mkdirSync)(pathOrFolder, { recursive: true });
                }
            }
            catch { }
            this.path = (0, path_1.join)(pathOrFolder, 'session.sqlite');
        }
    }
    async prepare() {
        if (this.connection)
            return;
        if (this.preparePromise)
            return this.preparePromise;
        this.preparePromise = (async () => {
            if (this.folder && this.path !== ':memory:') {
                try {
                    if (!(0, fs_1.existsSync)(this.folder)) {
                        (0, fs_1.mkdirSync)(this.folder, { recursive: true });
                    }
                }
                catch { }
            }
            this.connection = await (0, store_sqlite_1.openSqliteConnection)({
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
        }
        finally {
            this.preparePromise = null;
        }
    }
    /**
     * Importa registros legados em JSON (`chats-*.json`, `users-*.json`, `polls-*.json`)
     * da pasta de sessão para o banco SQLite (apenas uma vez).
     */
    async migrateLegacyFiles() {
        if (this.legacyMigrated || !this.folder || this.path === ':memory:')
            return;
        this.legacyMigrated = true;
        try {
            if (!(0, fs_1.existsSync)(this.folder))
                return;
            const entries = (0, fs_1.readdirSync)(this.folder);
            const jsonFiles = entries.filter((f) => f.endsWith('.json') &&
                (f.startsWith('chats-') || f.startsWith('users-') || f.startsWith('polls-')));
            if (!jsonFiles.length || !this.connection)
                return;
            for (const file of jsonFiles) {
                try {
                    const key = file.replace('.json', '');
                    const fullPath = (0, path_1.join)(this.folder, file);
                    const raw = (0, fs_1.readFileSync)(fullPath, 'utf-8');
                    const parsed = JSON.parse(raw, exports.BufferJSON.reviver);
                    const serialized = JSON.stringify(parsed, exports.BufferJSON.replacer);
                    await this.connection.run(`INSERT INTO rompot_records (key, value, updated_at)
             VALUES (?, ?, ?)
             ON CONFLICT(key) DO NOTHING`, [key, serialized, Date.now()]);
                }
                catch { }
            }
        }
        catch { }
    }
    async get(key) {
        await this.prepare();
        if (!this.connection)
            return null;
        try {
            const row = (await this.connection.get('SELECT value FROM rompot_records WHERE key = ?', [key]));
            if (!row || !row.value)
                return null;
            try {
                return JSON.parse(row.value, exports.BufferJSON.reviver);
            }
            catch {
                return row.value;
            }
        }
        catch {
            return null;
        }
    }
    async set(key, data) {
        await this.prepare();
        if (!this.connection)
            return;
        if (data === null || data === undefined) {
            await this.remove(key);
            return;
        }
        try {
            const serialized = JSON.stringify(data, exports.BufferJSON.replacer);
            await this.connection.run(`INSERT INTO rompot_records (key, value, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`, [key, serialized, Date.now()]);
        }
        catch { }
    }
    async remove(key) {
        await this.prepare();
        if (!this.connection)
            return;
        try {
            await this.connection.run('DELETE FROM rompot_records WHERE key = ?', [key]);
        }
        catch { }
    }
    async listAll(pattern = '') {
        await this.prepare();
        if (!this.connection)
            return [];
        try {
            const sqlPattern = pattern ? `${pattern}%` : '%';
            const rows = (await this.connection.all('SELECT key FROM rompot_records WHERE key LIKE ?', [sqlPattern]));
            return (rows || []).map((r) => r.key);
        }
        catch {
            return [];
        }
    }
    /**
     * Construtor da store do Zapo conectada à mesma base SQLite.
     */
    async getStore(sessionId = this.sessionId) {
        await this.prepare();
        if (!this.connection) {
            throw new Error('SQLite connection not available');
        }
        if (!this.store) {
            const sqliteBackend = (0, store_sqlite_1.createSqliteStore)({ connection: this.connection });
            this.store = (0, zapo_js_1.createStore)({
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
                },
            });
        }
        return this.store;
    }
    /**
     * Retorna a interface de armazenamento de mapeamentos PN ↔ LID conectada ao SQLite.
     */
    getLidStore() {
        const auth = this;
        return {
            async getPNForLID(lid) {
                await auth.prepare();
                if (!auth.connection)
                    return null;
                try {
                    const row = (await auth.connection.get('SELECT pn FROM rompot_lid_mapping WHERE lid = ?', [lid]));
                    return row?.pn || null;
                }
                catch {
                    return null;
                }
            },
            async getLIDForPN(pn) {
                await auth.prepare();
                if (!auth.connection)
                    return null;
                try {
                    const row = (await auth.connection.get('SELECT lid FROM rompot_lid_mapping WHERE pn = ?', [pn]));
                    return row?.lid || null;
                }
                catch {
                    return null;
                }
            },
            async storeLIDPNMappings(pairs) {
                await auth.prepare();
                if (!auth.connection || !pairs.length)
                    return;
                try {
                    await auth.connection.runInTransaction(() => {
                        for (const { lid, pn } of pairs) {
                            if (!lid || !pn)
                                continue;
                            auth.connection.run(`INSERT INTO rompot_lid_mapping (lid, pn, updated_at)
                 VALUES (?, ?, ?)
                 ON CONFLICT(lid) DO UPDATE SET pn = excluded.pn, updated_at = excluded.updated_at`, [lid, pn, Date.now()]);
                        }
                    });
                }
                catch { }
            },
        };
    }
    getConnection() {
        return this.connection;
    }
    async close() {
        if (this.store) {
            try {
                await this.store.destroy();
            }
            catch { }
            this.store = null;
        }
        if (this.connection) {
            try {
                this.connection.close();
            }
            catch { }
            this.connection = null;
        }
    }
}
exports.SqliteAuthState = SqliteAuthState;
/**
 * Adaptador de compatibilidade para código que instancie `MultiFileAuthState`.
 * Internamente utiliza SQLite para persistência sólida e eficiente.
 */
class MultiFileAuthState extends SqliteAuthState {
    constructor(folder = './session', botPhoneNumber = '', autoCreateDir = true, sessionId = 'default') {
        super(folder, botPhoneNumber, sessionId);
        this.fixFileName = (file) => file?.replace(/\//g, '__')?.replace(/:/g, '-');
        this.autoCreateDir = autoCreateDir;
    }
    getStat(folder) {
        try {
            return (0, fs_1.statSync)(folder);
        }
        catch {
            return null;
        }
    }
}
exports.MultiFileAuthState = MultiFileAuthState;
//# sourceMappingURL=Auth.js.map