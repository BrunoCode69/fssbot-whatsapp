import { isLidJid, isPnJid, isUserJid, normalizeJid } from './ID';

/** Par PN ↔ LID (mesmo formato do Baileys). */
export type LIDPNPair = { lid: string; pn: string };

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

export type LIDMappingListener = (pair: LIDPNPair) => void;

/**
 * Mapeia LID ↔ PN e define o ID canônico de cada pessoa.
 *
 * - Leitura síncrona em memória (`getJID`, `getLID`, `canonical`) para os caminhos quentes.
 * - Leitura assíncrona (`resolvePN`, `canonicalAsync`) que consulta o store persistente do Baileys
 *   quando o par ainda não está em memória.
 *
 * ID canônico = PN quando conhecido; LID quando o WhatsApp não revela o número.
 */
export class LIDMapper {
  /** Limite de pares em memória. Acima disso os mais antigos são descartados (o store do Baileys mantém todos). */
  public static MAX_ENTRIES = 200_000;

  private lidToPn = new Map<string, string>();
  private pnToLid = new Map<string, string>();
  private store?: LIDMappingStoreLike;
  private listeners = new Set<LIDMappingListener>();

  /**
   * Conecta o mapper ao store persistente do Baileys.
   * @param store - `sock.signalRepository.lidMapping`
   */
  public attachStore(store?: LIDMappingStoreLike): void {
    this.store = store;
  }

  /**
   * Registra uma função chamada quando um par novo é aprendido.
   * @returns Função que remove o ouvinte.
   */
  public onMapping(listener: LIDMappingListener): () => void {
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
  public register(first?: string | null, second?: string | null, persist: boolean = false): boolean {
    const a = normalizeJid(first || '');
    const b = normalizeJid(second || '');

    if (!a || !b) return false;

    const lid = isLidJid(a) ? a : isLidJid(b) ? b : '';
    const pn = isPnJid(a) ? a : isPnJid(b) ? b : '';

    if (!lid || !pn) return false;
    if (this.lidToPn.get(lid) === pn && this.pnToLid.get(pn) === lid) return false;

    const previousPn = this.lidToPn.get(lid);
    if (previousPn && previousPn !== pn) this.pnToLid.delete(previousPn);

    const previousLid = this.pnToLid.get(pn);
    if (previousLid && previousLid !== lid) this.lidToPn.delete(previousLid);

    this.lidToPn.set(lid, pn);
    this.pnToLid.set(pn, lid);
    this.trim();

    if (persist && this.store) {
      this.store.storeLIDPNMappings([{ lid, pn }]).catch(() => undefined);
    }

    for (const listener of this.listeners) {
      try {
        listener({ lid, pn });
      } catch {
        // ouvintes não podem quebrar o registro
      }
    }

    return true;
  }

  /**
   * Retorna o PN (`@s.whatsapp.net`) de um LID, se estiver em memória.
   * Mantém o nome antigo por compatibilidade.
   */
  public getJID(lid: string): string | undefined {
    const id = normalizeJid(lid);
    if (!id) return undefined;
    if (isPnJid(id)) return id;

    return this.lidToPn.get(id);
  }

  /** Alias de `getJID`. */
  public getPN(lid: string): string | undefined {
    return this.getJID(lid);
  }

  /** Retorna o LID de um PN, se estiver em memória. */
  public getLID(jid: string): string | undefined {
    const id = normalizeJid(jid);
    if (!id) return undefined;
    if (isLidJid(id)) return id;

    return this.pnToLid.get(id);
  }

  /**
   * ID canônico (síncrono, só memória): PN quando conhecido, senão o próprio ID normalizado.
   * Grupos, canais e listas são apenas normalizados.
   */
  public canonical(id?: string | null): string {
    const normalized = normalizeJid(id || '');
    if (!normalized || !isLidJid(normalized)) return normalized;

    return this.lidToPn.get(normalized) || normalized;
  }

  /**
   * @deprecated Use `canonical`. Antes priorizava LID; agora retorna o ID canônico (PN quando conhecido).
   */
  public resolve(id: string): string {
    return this.canonical(id) || id;
  }

  /**
   * Resolve o PN de um LID consultando a memória e depois o store persistente do Baileys.
   * Não faz consulta de rede.
   */
  public async resolvePN(lid: string): Promise<string | undefined> {
    const id = normalizeJid(lid);
    if (!id) return undefined;
    if (isPnJid(id)) return id;
    if (!isLidJid(id)) return undefined;

    const cached = this.lidToPn.get(id);
    if (cached) return cached;

    if (!this.store) return undefined;

    try {
      const pn = normalizeJid((await this.store.getPNForLID(id)) || '');
      if (!pn || !isPnJid(pn)) return undefined;

      this.register(id, pn);

      return pn;
    } catch {
      return undefined;
    }
  }

  /**
   * Resolve o LID de um PN. Pode consultar a rede (USync) quando o par não é conhecido.
   */
  public async resolveLID(pn: string): Promise<string | undefined> {
    const id = normalizeJid(pn);
    if (!id) return undefined;
    if (isLidJid(id)) return id;
    if (!isPnJid(id)) return undefined;

    const cached = this.pnToLid.get(id);
    if (cached) return cached;

    if (!this.store) return undefined;

    try {
      const lid = normalizeJid((await this.store.getLIDForPN(id)) || '');
      if (!lid || !isLidJid(lid)) return undefined;

      this.register(lid, id);

      return lid;
    } catch {
      return undefined;
    }
  }

  /** ID canônico (assíncrono): igual a `canonical`, mas consulta o store do Baileys para LIDs desconhecidos. */
  public async canonicalAsync(id?: string | null): Promise<string> {
    const normalized = normalizeJid(id || '');
    if (!normalized || !isLidJid(normalized)) return normalized;

    return (await this.resolvePN(normalized)) || normalized;
  }

  /** Retorna todos os IDs conhecidos de uma pessoa (canônico, PN e LID). */
  public aliases(id?: string | null): string[] {
    const normalized = normalizeJid(id || '');
    if (!normalized) return [];
    if (!isUserJid(normalized)) return [normalized];

    const pn = isPnJid(normalized) ? normalized : this.lidToPn.get(normalized);
    const lid = isLidJid(normalized) ? normalized : this.pnToLid.get(normalized);

    return [...new Set([pn, lid, normalized].filter(Boolean) as string[])];
  }

  /** Dois IDs pertencem à mesma pessoa (considerando PN ↔ LID). */
  public isSameUser(first?: string | null, second?: string | null): boolean {
    const a = this.canonical(first);
    const b = this.canonical(second);

    return !!a && a === b;
  }

  /** Verifica se existe mapeamento para o identificador. */
  public has(id: string): boolean {
    const normalized = normalizeJid(id);
    if (!normalized) return false;

    return isLidJid(normalized) ? this.lidToPn.has(normalized) : this.pnToLid.has(normalized);
  }

  /** Remove um mapeamento da memória. */
  public remove(id: string): void {
    const normalized = normalizeJid(id);
    if (!normalized) return;

    if (isLidJid(normalized)) {
      const pn = this.lidToPn.get(normalized);
      this.lidToPn.delete(normalized);
      if (pn) this.pnToLid.delete(pn);
    } else {
      const lid = this.pnToLid.get(normalized);
      this.pnToLid.delete(normalized);
      if (lid) this.lidToPn.delete(lid);
    }
  }

  /** Limpa os mapeamentos em memória (o store do Baileys não é afetado). */
  public clear(): void {
    this.lidToPn.clear();
    this.pnToLid.clear();
  }

  /** Estatísticas do cache em memória. */
  public getStats() {
    return {
      lidToJidCount: this.lidToPn.size,
      jidToLidCount: this.pnToLid.size,
    };
  }

  private trim(): void {
    while (this.lidToPn.size > LIDMapper.MAX_ENTRIES) {
      const oldest = this.lidToPn.keys().next().value as string | undefined;
      if (!oldest) break;

      const pn = this.lidToPn.get(oldest);
      this.lidToPn.delete(oldest);
      if (pn && this.pnToLid.get(pn) === oldest) this.pnToLid.delete(pn);
    }
  }
}
