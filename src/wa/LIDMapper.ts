import NodeCache from 'node-cache';

/**
 * Gerencia o mapeamento bidirecional entre LID e JID/Phone Number
 * Evita duplicação de conversas e mensagens ao manter consistência
 * entre identificadores LID (@lid) e JID tradicionais (@s.whatsapp.net)
 */
export class LIDMapper {
    private lidToJid: NodeCache;
    private jidToLid: NodeCache;

    constructor() {
        // Cache com TTL de 24 horas (86400 segundos)
        // useClones: false para melhor performance
        this.lidToJid = new NodeCache({ stdTTL: 86400, useClones: false });
        this.jidToLid = new NodeCache({ stdTTL: 86400, useClones: false });
    }

    /**
     * Registra um mapeamento LID ↔ JID
     * @param lid - Local ID no formato número:sequência@lid
     * @param jid - Jabber ID no formato número@s.whatsapp.net
     */
    public register(lid: string, jid: string): void {
        if (!lid || !jid) return;

        // Ignora se ambos são do mesmo tipo
        if (lid.includes('@lid') === jid.includes('@lid')) return;

        this.lidToJid.set(lid, jid);
        this.jidToLid.set(jid, lid);
    }

    /**
     * Obtém o JID correspondente a um LID
     * @param lid - Local ID
     * @returns JID correspondente ou undefined
     */
    public getJID(lid: string): string | undefined {
        return this.lidToJid.get(lid);
    }

    /**
     * Obtém o LID correspondente a um JID
     * @param jid - Jabber ID
     * @returns LID correspondente ou undefined
     */
    public getLID(jid: string): string | undefined {
        return this.jidToLid.get(jid);
    }

    /**
     * Resolve o identificador canônico (preferindo LID)
     * Se o ID fornecido é um JID e existe um LID mapeado, retorna o LID
     * Caso contrário, retorna o ID original
     * @param id - Identificador (JID ou LID)
     * @returns Identificador canônico (preferencialmente LID)
     */
    public resolve(id: string): string {
        if (!id) return id;

        // Se já é LID, retorna
        if (id.includes('@lid')) return id;

        // Tenta encontrar LID correspondente
        const lid = this.getLID(id);
        return lid || id;
    }

    /**
     * Verifica se existe um mapeamento para o identificador fornecido
     * @param id - Identificador (JID ou LID)
     * @returns true se existe mapeamento
     */
    public has(id: string): boolean {
        if (!id) return false;

        if (id.includes('@lid')) {
            return this.lidToJid.has(id);
        } else {
            return this.jidToLid.has(id);
        }
    }

    /**
     * Remove um mapeamento
     * @param id - Identificador (JID ou LID)
     */
    public remove(id: string): void {
        if (!id) return;

        if (id.includes('@lid')) {
            const jid = this.lidToJid.get(id);
            this.lidToJid.del(id as string);
            if (jid) this.jidToLid.del(jid as string);
        } else {
            const lid = this.jidToLid.get(id);
            this.jidToLid.del(id as string);
            if (lid) this.lidToJid.del(lid as string);
        }
    }

    /**
     * Limpa todo o cache de mapeamentos
     */
    public clear(): void {
        this.lidToJid.flushAll();
        this.jidToLid.flushAll();
    }

    /**
     * Retorna estatísticas do cache
     */
    public getStats() {
        return {
            lidToJidCount: this.lidToJid.keys().length,
            jidToLidCount: this.jidToLid.keys().length,
        };
    }
}
