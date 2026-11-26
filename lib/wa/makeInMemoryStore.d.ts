export interface InMemoryStoreConfig {
    logger?: any;
    stdTTL?: number;
}
/**
 * Armazenamento em memória leve para compatibilidade.
 * Com a migração para zapo-js e @zapo-js/store-sqlite, o armazenamento
 * principal é persistido de forma robusta e nativa em SQLite.
 */
export default function makeInMemoryStore(config?: InMemoryStoreConfig): {
    chats: Record<string, any>;
    contacts: Record<string, any>;
    groupMetadata: Record<string, any>;
    bind(_ev: any): void;
    loadMessage(jid: string, id: string): Promise<any>;
    saveMessage(jid: string, id: string, message: any): void;
    writeToFile(_path: string): void;
    readFromFile(_path: string): void;
};
