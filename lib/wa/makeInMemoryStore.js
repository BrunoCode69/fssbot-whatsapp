"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = makeInMemoryStore;
const node_cache_1 = __importDefault(require("node-cache"));
const ID_1 = require("./ID");
/**
 * Armazenamento em memória leve para compatibilidade.
 * Com a migração para zapo-js e @zapo-js/store-sqlite, o armazenamento
 * principal é persistido de forma robusta e nativa em SQLite.
 */
function makeInMemoryStore(config = {}) {
    const messageCache = new node_cache_1.default({
        stdTTL: config.stdTTL || 30 * 60,
        useClones: false,
        checkperiod: 120,
    });
    const chats = {};
    const contacts = {};
    const groupMetadata = {};
    return {
        chats,
        contacts,
        groupMetadata,
        bind(_ev) { },
        async loadMessage(jid, id) {
            const normalized = (0, ID_1.normalizeJid)(jid);
            return (messageCache.get(`${normalized}:${id}`) ||
                messageCache.get(`${jid}:${id}`) ||
                messageCache.get(id) ||
                null);
        },
        saveMessage(jid, id, message) {
            const normalized = (0, ID_1.normalizeJid)(jid);
            messageCache.set(`${normalized}:${id}`, message);
            messageCache.set(id, message);
        },
        writeToFile(_path) { },
        readFromFile(_path) { },
    };
}
//# sourceMappingURL=makeInMemoryStore.js.map