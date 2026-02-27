"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LIDMapper = void 0;
const node_cache_1 = __importDefault(require("node-cache"));
/**
 * Gerencia o mapeamento bidirecional entre LID e JID/Phone Number
 * Evita duplicação de conversas e mensagens ao manter consistência
 * entre identificadores LID (@lid) e JID tradicionais (@s.whatsapp.net)
 */
class LIDMapper {
    constructor() {
        // Cache com TTL de 24 horas (86400 segundos)
        // useClones: false para melhor performance
        this.lidToJid = new node_cache_1.default({ stdTTL: 86400, useClones: false });
        this.jidToLid = new node_cache_1.default({ stdTTL: 86400, useClones: false });
    }
    /**
     * Registra um mapeamento LID ↔ JID
     * @param lid - Local ID no formato número:sequência@lid
     * @param jid - Jabber ID no formato número@s.whatsapp.net
     */
    register(lid, jid) {
        if (!lid || !jid)
            return;
        // Ignora se ambos são do mesmo tipo
        if (lid.includes('@lid') === jid.includes('@lid'))
            return;
        this.lidToJid.set(lid, jid);
        this.jidToLid.set(jid, lid);
    }
    /**
     * Obtém o JID correspondente a um LID
     * @param lid - Local ID
     * @returns JID correspondente ou undefined
     */
    getJID(lid) {
        return this.lidToJid.get(lid);
    }
    /**
     * Obtém o LID correspondente a um JID
     * @param jid - Jabber ID
     * @returns LID correspondente ou undefined
     */
    getLID(jid) {
        return this.jidToLid.get(jid);
    }
    /**
     * Resolve o identificador canônico (preferindo LID)
     * Se o ID fornecido é um JID e existe um LID mapeado, retorna o LID
     * Caso contrário, retorna o ID original
     * @param id - Identificador (JID ou LID)
     * @returns Identificador canônico (preferencialmente LID)
     */
    resolve(id) {
        if (!id)
            return id;
        // Se já é LID, retorna
        if (id.includes('@lid'))
            return id;
        // Tenta encontrar LID correspondente
        const lid = this.getLID(id);
        return lid || id;
    }
    /**
     * Verifica se existe um mapeamento para o identificador fornecido
     * @param id - Identificador (JID ou LID)
     * @returns true se existe mapeamento
     */
    has(id) {
        if (!id)
            return false;
        if (id.includes('@lid')) {
            return this.lidToJid.has(id);
        }
        else {
            return this.jidToLid.has(id);
        }
    }
    /**
     * Remove um mapeamento
     * @param id - Identificador (JID ou LID)
     */
    remove(id) {
        if (!id)
            return;
        if (id.includes('@lid')) {
            const jid = this.lidToJid.get(id);
            this.lidToJid.del(id);
            if (jid)
                this.jidToLid.del(jid);
        }
        else {
            const lid = this.jidToLid.get(id);
            this.jidToLid.del(id);
            if (lid)
                this.lidToJid.del(lid);
        }
    }
    /**
     * Limpa todo o cache de mapeamentos
     */
    clear() {
        this.lidToJid.flushAll();
        this.jidToLid.flushAll();
    }
    /**
     * Retorna estatísticas do cache
     */
    getStats() {
        return {
            lidToJidCount: this.lidToJid.keys().length,
            jidToLidCount: this.jidToLid.keys().length,
        };
    }
}
exports.LIDMapper = LIDMapper;
//# sourceMappingURL=LIDMapper.js.map