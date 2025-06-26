import Message from '../messages/Message';
/**
 * Mensagem a ser tratada
 */
export declare type MessageHandlerConfig = {
    stopRead: boolean;
    patterns: Array<(message: Message) => boolean>;
    resolve(message: Message): void;
};
/**
 * Representa um objeto que lida com mensagens e seus tratamentos personalizados.
 */
export default class MessageHandler {
    /**
     * Um registro de mensagens e seus tratamentos associados, organizados por chat ID.
     */
    messages: Record<string, Array<MessageHandlerConfig>>;
    /**
     * Cria uma nova instância de MessageHandler.
     * @param messages - Um registro de mensagens e tratamentos personalizados (opcional).
     */
    constructor(messages?: Record<string, Array<MessageHandlerConfig>>);
    /**
     * Adiciona uma mensagem e seu tratamento personalizado associado a um chat ID.
     * @param chatId - O ID do chat ao qual a mensagem está associada.
     * @param config - As configurações do tratamento personalizado.
     * @returns Uma promessa que resolve com a mensagem.
     */
    addMessage(chatId: string, config: Partial<MessageHandlerConfig>): Promise<Message>;
    /**
     * Resolve uma mensagem e seus tratamentos personalizados associados a um chat ID.
     * @param message - A mensagem a ser resolvida.
     * @returns Verdadeiro se a resolução deve interromper a leitura adicional de mensagens, caso contrário, falso.
     */
    resolveMessage(message: Message): boolean;
    /**
     * Ignora mensagens provenientes do próprio usuário.
     * @param message - A mensagem a ser verificada.
     * @returns Verdadeiro se a mensagem deve ser ignorada, caso contrário, falso.
     */
    static ignoreMessageFromMe(message: Message): boolean;
    /**
     * Ignora mensagens não oficiais.
     * @param message - A mensagem a ser verificada.
     * @returns Verdadeiro se a mensagem deve ser ignorada, caso contrário, falso.
     */
    static ignoreUnofficialMessage(message: Message): boolean;
    /**
     * Ignora um conjunto específico de mensagens.
     * @param messages - Um conjunto de mensagens a serem ignoradas.
     * @returns Uma função que verifica se uma mensagem deve ser ignorada.
     */
    static ignoreMessages(...messages: Message[]): (message: Message) => boolean;
}
