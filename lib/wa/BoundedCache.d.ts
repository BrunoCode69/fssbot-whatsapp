import NodeCache from 'node-cache';
/**
 * Cria um NodeCache com limite de chaves. `maxKeys <= 0` (ou indefinido) desativa o limite.
 * Use sempre `safeCacheSet` para gravar: o NodeCache lança `ECACHEFULL` quando o limite é atingido.
 */
export declare function createBoundedCache(options: {
    stdTTL: number;
    maxKeys?: number;
}): NodeCache;
/**
 * Grava no cache sem lançar `ECACHEFULL`. Quando o limite é atingido, remove as entradas
 * mais antigas (ordem de inserção, ~10% do limite de uma vez para não varrer as chaves a cada
 * gravação). Se ainda assim falhar, esvazia o cache: perder entradas de cache é preferível a
 * derrubar um handler de evento.
 */
export declare function safeCacheSet<T>(cache: NodeCache, key: string, value: T, ttl?: number): boolean;
