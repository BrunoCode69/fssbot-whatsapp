/** Par PN ↔ LID (mesmo formato do Baileys). */
export declare type LIDPNPair = {
    lid: string;
    pn: string;
};
/**
 * Subconjunto do `LIDMappingStore` do Baileys (`sock.signalRepository.lidMapping`).
 * O store do Baileys persiste os pares nas chaves de autenticação (`lid-mapping-*`),
 * então eles sobrevivem a reinícios.
 */
export interface LIDMappingStoreLike {
    getPNForLID(lid: string): Promise<string | null>;
    getLIDForPN(pn: string): Promise<string | null>;
    storeLIDPNMappings(pairs: LIDPNPair[]): Promise<void>;
}
export declare type LIDMappingListener = (pair: LIDPNPair) => void;
/**
 * Mapeia LID ↔ PN e define o ID canônico de cada pessoa.
 *
 * - Leitura síncrona em memória (`getJID`, `getLID`, `canonical`) para os caminhos quentes.
 * - Leitura assíncrona (`resolvePN`, `canonicalAsync`) que consulta o store persistente do Baileys
 *   quando o par ainda não está em memória.
 *
 * ID canônico = PN quando conhecido; LID quando o WhatsApp não revela o número.
 */
export declare class LIDMapper {
    /** Limite de pares em memória. Acima disso os mais antigos são descartados (o store do Baileys mantém todos). */
    static MAX_ENTRIES: number;
    private lidToPn;
    private pnToLid;
    private store?;
    private listeners;
    /**
     * Conecta o mapper ao store persistente do Baileys.
     * @param store - `sock.signalRepository.lidMapping`
     */
    attachStore(store?: LIDMappingStoreLike): void;
    /**
     * Registra uma função chamada quando um par novo é aprendido.
     * @returns Função que remove o ouvinte.
     */
    onMapping(listener: LIDMappingListener): () => void;
    /**
     * Registra um par LID ↔ PN. Aceita os dois IDs em qualquer ordem.
     * @param first - LID ou PN
     * @param second - PN ou LID
     * @param persist - Também grava o par no store do Baileys
     * @returns `true` se o par era desconhecido
     */
    register(first?: string | null, second?: string | null, persist?: boolean): boolean;
    /**
     * Retorna o PN (`@s.whatsapp.net`) de um LID, se estiver em memória.
     * Mantém o nome antigo por compatibilidade.
     */
    getJID(lid: string): string | undefined;
    /** Alias de `getJID`. */
    getPN(lid: string): string | undefined;
    /** Retorna o LID de um PN, se estiver em memória. */
    getLID(jid: string): string | undefined;
    /**
     * ID canônico (síncrono, só memória): PN quando conhecido, senão o próprio ID normalizado.
     * Grupos, canais e listas são apenas normalizados.
     */
    canonical(id?: string | null): string;
    /**
     * @deprecated Use `canonical`. Antes priorizava LID; agora retorna o ID canônico (PN quando conhecido).
     */
    resolve(id: string): string;
    /**
     * Resolve o PN de um LID consultando a memória e depois o store persistente do Baileys.
     * Não faz consulta de rede.
     */
    resolvePN(lid: string): Promise<string | undefined>;
    /**
     * Resolve o LID de um PN. Pode consultar a rede (USync) quando o par não é conhecido.
     */
    resolveLID(pn: string): Promise<string | undefined>;
    /** ID canônico (assíncrono): igual a `canonical`, mas consulta o store do Baileys para LIDs desconhecidos. */
    canonicalAsync(id?: string | null): Promise<string>;
    /** Retorna todos os IDs conhecidos de uma pessoa (canônico, PN e LID). */
    aliases(id?: string | null): string[];
    /** Dois IDs pertencem à mesma pessoa (considerando PN ↔ LID). */
    isSameUser(first?: string | null, second?: string | null): boolean;
    /** Verifica se existe mapeamento para o identificador. */
    has(id: string): boolean;
    /** Remove um mapeamento da memória. */
    remove(id: string): void;
    /** Limpa os mapeamentos em memória (o store do Baileys não é afetado). */
    clear(): void;
    /** Estatísticas do cache em memória. */
    getStats(): {
        lidToJidCount: number;
        jidToLidCount: number;
    };
    private trim;
}
