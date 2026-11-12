import NodeCache from 'node-cache';
import { normalizeJid } from './ID';

export interface InMemoryStoreConfig {
  logger?: any;
  stdTTL?: number;
}

/**
 * Armazenamento em memória leve para compatibilidade.
 * Com a migração para zapo-js e @zapo-js/store-sqlite, o armazenamento
 * principal é persistido de forma robusta e nativa em SQLite.
 */
export default function makeInMemoryStore(config: InMemoryStoreConfig = {}) {
  const messageCache = new NodeCache({
    stdTTL: config.stdTTL || 30 * 60,
    useClones: false,
    checkperiod: 120,
  });

  const chats: Record<string, any> = {};
  const contacts: Record<string, any> = {};
  const groupMetadata: Record<string, any> = {};

  return {
    chats,
    contacts,
    groupMetadata,
    bind(_ev: any) {},
    async loadMessage(jid: string, id: string): Promise<any> {
      const normalized = normalizeJid(jid);
      return (
        messageCache.get(`${normalized}:${id}`) ||
        messageCache.get(`${jid}:${id}`) ||
        messageCache.get(id) ||
        null
      );
    },
    saveMessage(jid: string, id: string, message: any): void {
      const normalized = normalizeJid(jid);
      messageCache.set(`${normalized}:${id}`, message);
      messageCache.set(id, message);
    },
    writeToFile(_path: string) {},
    readFromFile(_path: string) {},
  };
}
