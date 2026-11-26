import { type WaStore } from 'zapo-js';
import { type WaSqliteConnection } from '@zapo-js/store-sqlite';
import IAuth from '../client/IAuth';
import type { LIDMappingStoreLike } from './LIDMapper';
/** Serializador / deserializador JSON com suporte a Buffer. */
export declare const BufferJSON: {
    replacer: (_k: string, value: any) => any;
    reviver: (_k: string, value: any) => any;
};
/**
 * Autenticação e armazenamento persistente do WhatsApp baseado em SQLite.
 * Utiliza o provider `@zapo-js/store-sqlite` para armazenar chaves Signal, credenciais,
 * sessões, contatos, mensagens e metadados, além de persistir os registros do bot
 * (`chats-*`, `users-*`, `polls-*`) na mesma base.
 */
export declare class SqliteAuthState implements IAuth {
    path: string;
    folder?: string;
    botPhoneNumber?: string;
    sessionId: string;
    private connection;
    private store;
    private preparePromise;
    private legacyMigrated;
    constructor(pathOrFolder?: string, botPhoneNumber?: string, sessionId?: string);
    prepare(): Promise<void>;
    /**
     * Importa registros legados em JSON (`chats-*.json`, `users-*.json`, `polls-*.json`)
     * da pasta de sessão para o banco SQLite (apenas uma vez).
     */
    private migrateLegacyFiles;
    get(key: string): Promise<any>;
    set(key: string, data: any): Promise<void>;
    remove(key: string): Promise<void>;
    listAll(pattern?: string): Promise<string[]>;
    /**
     * Construtor da store do Zapo conectada à mesma base SQLite.
     */
    getStore(sessionId?: string): Promise<WaStore>;
    /**
     * Retorna a interface de armazenamento de mapeamentos PN ↔ LID conectada ao SQLite.
     */
    getLidStore(): LIDMappingStoreLike;
    getConnection(): WaSqliteConnection | null;
    close(): Promise<void>;
}
/**
 * Adaptador de compatibilidade para código que instancie `MultiFileAuthState`.
 * Internamente utiliza SQLite para persistência sólida e eficiente.
 */
export declare class MultiFileAuthState extends SqliteAuthState {
    autoCreateDir: boolean;
    constructor(folder?: string, botPhoneNumber?: string, autoCreateDir?: boolean, sessionId?: string);
    getStat(folder: string): import("fs").Stats;
    fixFileName: (file?: string) => string;
}
