"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LIDMapper = void 0;
const ID_1 = require("./ID");
/**
 * Mapeia LID ↔ PN e define o ID canônico de cada pessoa.
 *
 * - Leitura síncrona em memória (`getJID`, `getLID`, `canonical`) para os caminhos quentes.
 * - Leitura assíncrona (`resolvePN`, `canonicalAsync`) que consulta o store persistente do Baileys
 *   quando o par ainda não está em memória.
 *
 * ID canônico = PN quando conhecido; LID quando o WhatsApp não revela o número.
 */
class LIDMapper {
    constructor() {
        this.lidToPn = new Map();
        this.pnToLid = new Map();
        this.listeners = new Set();
        this.pendingPersist = [];
    }
    /**
     * Conecta o mapper ao store persistente do Baileys.
     * @param store - `sock.signalRepository.lidMapping`
     */
    attachStore(store) {
        this.store = store;
    }
    /**
     * Registra uma função chamada quando um par novo é aprendido.
     * @returns Função que remove o ouvinte.
     */
    onMapping(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    /**
     * Registra um par LID ↔ PN. Aceita os dois IDs em qualquer ordem.
     * @param first - LID ou PN
     * @param second - PN ou LID
     * @param persist - Também grava o par no store do Baileys
     * @returns `true` se o par era desconhecido
     */
    register(first, second, persist = false) {
        const a = (0, ID_1.normalizeJid)(first || '');
        const b = (0, ID_1.normalizeJid)(second || '');
        if (!a || !b)
            return false;
        const lid = (0, ID_1.isLidJid)(a) ? a : (0, ID_1.isLidJid)(b) ? b : '';
        const pn = (0, ID_1.isPnJid)(a) ? a : (0, ID_1.isPnJid)(b) ? b : '';
        if (!lid || !pn)
            return false;
        if (this.lidToPn.get(lid) === pn && this.pnToLid.get(pn) === lid)
            return false;
        const previousPn = this.lidToPn.get(lid);
        if (previousPn && previousPn !== pn)
            this.pnToLid.delete(previousPn);
        const previousLid = this.pnToLid.get(pn);
        if (previousLid && previousLid !== lid)
            this.lidToPn.delete(previousLid);
        this.lidToPn.set(lid, pn);
        this.pnToLid.set(pn, lid);
        this.trim();
        if (persist && this.store)
            this.queuePersist({ lid, pn });
        for (const listener of this.listeners) {
            try {
                listener({ lid, pn });
            }
            catch (_a) {
                // ouvintes não podem quebrar o registro
            }
        }
        return true;
    }
    /**
     * Retorna o PN (`@s.whatsapp.net`) de um LID, se estiver em memória.
     * Mantém o nome antigo por compatibilidade.
     */
    getJID(lid) {
        const id = (0, ID_1.normalizeJid)(lid);
        if (!id)
            return undefined;
        if ((0, ID_1.isPnJid)(id))
            return id;
        return this.lidToPn.get(id);
    }
    /** Alias de `getJID`. */
    getPN(lid) {
        return this.getJID(lid);
    }
    /** Retorna o LID de um PN, se estiver em memória. */
    getLID(jid) {
        const id = (0, ID_1.normalizeJid)(jid);
        if (!id)
            return undefined;
        if ((0, ID_1.isLidJid)(id))
            return id;
        return this.pnToLid.get(id);
    }
    /**
     * ID canônico (síncrono, só memória): PN quando conhecido, senão o próprio ID normalizado.
     * Grupos, canais e listas são apenas normalizados.
     */
    canonical(id) {
        const normalized = (0, ID_1.normalizeJid)(id || '');
        if (!normalized || !(0, ID_1.isLidJid)(normalized))
            return normalized;
        return this.lidToPn.get(normalized) || normalized;
    }
    /**
     * @deprecated Use `canonical`. Antes priorizava LID; agora retorna o ID canônico (PN quando conhecido).
     */
    resolve(id) {
        return this.canonical(id) || id;
    }
    /**
     * Resolve o PN de um LID consultando a memória e depois o store persistente do Baileys.
     * Não faz consulta de rede.
     */
    async resolvePN(lid) {
        const id = (0, ID_1.normalizeJid)(lid);
        if (!id)
            return undefined;
        if ((0, ID_1.isPnJid)(id))
            return id;
        if (!(0, ID_1.isLidJid)(id))
            return undefined;
        const cached = this.lidToPn.get(id);
        if (cached)
            return cached;
        if (!this.store)
            return undefined;
        try {
            const pn = (0, ID_1.normalizeJid)((await this.store.getPNForLID(id)) || '');
            if (!pn || !(0, ID_1.isPnJid)(pn))
                return undefined;
            this.register(id, pn);
            return pn;
        }
        catch (_a) {
            return undefined;
        }
    }
    /**
     * Resolve o LID de um PN. Pode consultar a rede (USync) quando o par não é conhecido.
     */
    async resolveLID(pn) {
        const id = (0, ID_1.normalizeJid)(pn);
        if (!id)
            return undefined;
        if ((0, ID_1.isLidJid)(id))
            return id;
        if (!(0, ID_1.isPnJid)(id))
            return undefined;
        const cached = this.pnToLid.get(id);
        if (cached)
            return cached;
        if (!this.store)
            return undefined;
        try {
            const lid = (0, ID_1.normalizeJid)((await this.store.getLIDForPN(id)) || '');
            if (!lid || !(0, ID_1.isLidJid)(lid))
                return undefined;
            this.register(lid, id);
            return lid;
        }
        catch (_a) {
            return undefined;
        }
    }
    /** ID canônico (assíncrono): igual a `canonical`, mas consulta o store do Baileys para LIDs desconhecidos. */
    async canonicalAsync(id) {
        const normalized = (0, ID_1.normalizeJid)(id || '');
        if (!normalized || !(0, ID_1.isLidJid)(normalized))
            return normalized;
        return (await this.resolvePN(normalized)) || normalized;
    }
    /** Retorna todos os IDs conhecidos de uma pessoa (canônico, PN e LID). */
    aliases(id) {
        const normalized = (0, ID_1.normalizeJid)(id || '');
        if (!normalized)
            return [];
        if (!(0, ID_1.isUserJid)(normalized))
            return [normalized];
        const pn = (0, ID_1.isPnJid)(normalized) ? normalized : this.lidToPn.get(normalized);
        const lid = (0, ID_1.isLidJid)(normalized) ? normalized : this.pnToLid.get(normalized);
        return [...new Set([pn, lid, normalized].filter(Boolean))];
    }
    /** Dois IDs pertencem à mesma pessoa (considerando PN ↔ LID). */
    isSameUser(first, second) {
        const a = this.canonical(first);
        const b = this.canonical(second);
        return !!a && a === b;
    }
    /** Verifica se existe mapeamento para o identificador. */
    has(id) {
        const normalized = (0, ID_1.normalizeJid)(id);
        if (!normalized)
            return false;
        return (0, ID_1.isLidJid)(normalized) ? this.lidToPn.has(normalized) : this.pnToLid.has(normalized);
    }
    /** Remove um mapeamento da memória. */
    remove(id) {
        const normalized = (0, ID_1.normalizeJid)(id);
        if (!normalized)
            return;
        if ((0, ID_1.isLidJid)(normalized)) {
            const pn = this.lidToPn.get(normalized);
            this.lidToPn.delete(normalized);
            if (pn)
                this.pnToLid.delete(pn);
        }
        else {
            const lid = this.pnToLid.get(normalized);
            this.pnToLid.delete(normalized);
            if (lid)
                this.lidToPn.delete(lid);
        }
    }
    /** Limpa os mapeamentos em memória (o store do Baileys não é afetado). */
    clear() {
        this.lidToPn.clear();
        this.pnToLid.clear();
    }
    /** Estatísticas do cache em memória. */
    getStats() {
        return {
            lidToJidCount: this.lidToPn.size,
            jidToLidCount: this.pnToLid.size,
        };
    }
    /** Agrupa os pares a persistir numa única gravação no store do Baileys. */
    queuePersist(pair) {
        var _a, _b;
        this.pendingPersist.push(pair);
        if (this.persistTimer)
            return;
        this.persistTimer = setTimeout(() => {
            this.persistTimer = undefined;
            const pairs = this.pendingPersist.splice(0, this.pendingPersist.length);
            if (pairs.length && this.store) {
                this.store.storeLIDPNMappings(pairs).catch(() => undefined);
            }
        }, 500);
        (_b = (_a = this.persistTimer).unref) === null || _b === void 0 ? void 0 : _b.call(_a);
    }
    trim() {
        while (this.lidToPn.size > LIDMapper.MAX_ENTRIES) {
            const oldest = this.lidToPn.keys().next().value;
            if (!oldest)
                break;
            const pn = this.lidToPn.get(oldest);
            this.lidToPn.delete(oldest);
            if (pn && this.pnToLid.get(pn) === oldest)
                this.pnToLid.delete(pn);
        }
    }
}
exports.LIDMapper = LIDMapper;
/** Limite de pares em memória. Acima disso os mais antigos são descartados (o store do Baileys mantém todos). */
LIDMapper.MAX_ENTRIES = 200000;
//# sourceMappingURL=LIDMapper.js.map