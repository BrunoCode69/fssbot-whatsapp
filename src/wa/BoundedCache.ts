import NodeCache from 'node-cache';

/**
 * Cria um NodeCache com limite de chaves. `maxKeys <= 0` (ou indefinido) desativa o limite.
 * Use sempre `safeCacheSet` para gravar: o NodeCache lança `ECACHEFULL` quando o limite é atingido.
 */
export function createBoundedCache(options: { stdTTL: number; maxKeys?: number }): NodeCache {
  const maxKeys = options.maxKeys && options.maxKeys > 0 ? Math.floor(options.maxKeys) : -1;
  return new NodeCache({ stdTTL: options.stdTTL, useClones: false, maxKeys });
}

/**
 * Grava no cache sem lançar `ECACHEFULL`. Quando o limite é atingido, remove as entradas
 * mais antigas (ordem de inserção, ~10% do limite de uma vez para não varrer as chaves a cada
 * gravação). Se ainda assim falhar, esvazia o cache: perder entradas de cache é preferível a
 * derrubar um handler de evento.
 */
export function safeCacheSet<T>(cache: NodeCache, key: string, value: T, ttl?: number): boolean {
  const maxKeys = cache.options.maxKeys ?? -1;
  const write = () => (ttl === undefined ? cache.set(key, value) : cache.set(key, value, ttl));

  if (maxKeys > 0 && cache.getStats().keys >= maxKeys) {
    if (cache.has(key)) {
      // O NodeCache lança ECACHEFULL até ao sobrescrever uma chave existente quando está cheio
      cache.del(key);
    } else {
      cache.del(cache.keys().slice(0, Math.max(1, Math.ceil(maxKeys * 0.1))));
    }
  }

  try {
    return write();
  } catch (err: any) {
    if (err?.name !== 'ECACHEFULL' && !String(err?.message || '').includes('max keys')) throw err;
    cache.flushAll();
    return write();
  }
}
