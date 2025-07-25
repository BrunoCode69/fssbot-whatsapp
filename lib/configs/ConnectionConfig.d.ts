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
    /** Máximo de reconexões possíveis */
    maxReconnectTimes: number;
    /** Tempo de aguarde para se reconectar */
    reconnectTimeout: number;
    /** Máximo de tentativas de solitação acaso a primeira falhe */
    maxRequests: number;
    /** Tempo necessário de aguardo para próxima tentativa de solicitação */
    requestsDelay: number;
    /** Tempo máximo de espera */
    maxTimeout: number;
}
