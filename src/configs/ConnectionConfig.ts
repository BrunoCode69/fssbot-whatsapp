export default interface ConnectionConfig {
  /** Desativar execução do comando automático */
  disableAutoCommand: boolean;
  /** Desativar comandos para mensagem antiga */
  disableAutoCommandForOldMessage: boolean;
  /** Desativa a execução do comando automático para mensagens não oficiais */
  disableAutoCommandForUnofficialMessage: boolean;
  /** Desativar a digitação automatica */
  disableAutoTyping: boolean;
  /** Desativar a leitura automatica de uma mensagem */
  disableAutoRead: boolean;
  /** Máximo de reconexões seguidas. Depois disso o cliente emite `stop` com `reason: 'reconnect_failed'`. */
  maxReconnectTimes: number;
  /** Espera antes da primeira reconexão (ms). Dobra a cada tentativa seguida, até `maxReconnectTimeout`. */
  reconnectTimeout: number;
  /** Espera máxima entre duas reconexões (ms). */
  maxReconnectTimeout: number;
  /** Máximo de tentativas de solitação acaso a primeira falhe */
  maxRequests: number;
  /** Tempo necessário de aguardo para próxima tentativa de solicitação */
  requestsDelay: number;
  /** Tempo máximo de espera */
  maxTimeout: number;
}
