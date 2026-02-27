/**
 * Gerencia o mapeamento bidirecional entre LID e JID/Phone Number
 * Evita duplicação de conversas e mensagens ao manter consistência
 * entre identificadores LID (@lid) e JID tradicionais (@s.whatsapp.net)
 */
export declare class LIDMapper {
    private lidToJid;
    private jidToLid;
    constructor();
    /**
     * Registra um mapeamento LID ↔ JID
     * @param lid - Local ID no formato número:sequência@lid
     * @param jid - Jabber ID no formato número@s.whatsapp.net
     */
    register(lid: string, jid: string): void;
    /**
     * Obtém o JID correspondente a um LID
     * @param lid - Local ID
     * @returns JID correspondente ou undefined
     */
    getJID(lid: string): string | undefined;
    /**
     * Obtém o LID correspondente a um JID
     * @param jid - Jabber ID
     * @returns LID correspondente ou undefined
     */
    getLID(jid: string): string | undefined;
    /**
     * Resolve o identificador canônico (preferindo LID)
     * Se o ID fornecido é um JID e existe um LID mapeado, retorna o LID
     * Caso contrário, retorna o ID original
     * @param id - Identificador (JID ou LID)
     * @returns Identificador canônico (preferencialmente LID)
     */
    resolve(id: string): string;
    /**
     * Verifica se existe um mapeamento para o identificador fornecido
     * @param id - Identificador (JID ou LID)
     * @returns true se existe mapeamento
     */
    has(id: string): boolean;
    /**
     * Remove um mapeamento
     * @param id - Identificador (JID ou LID)
     */
    remove(id: string): void;
    /**
     * Limpa todo o cache de mapeamentos
     */
    clear(): void;
    /**
     * Retorna estatísticas do cache
     */
    getStats(): {
        lidToJidCount: number;
        jidToLidCount: number;
    };
}
