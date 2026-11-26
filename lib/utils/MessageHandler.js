"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Representa um objeto que lida com mensagens e seus tratamentos personalizados.
 */
class MessageHandler {
    /**
     * Cria uma nova instância de MessageHandler.
     * @param messages - Um registro de mensagens e tratamentos personalizados (opcional).
     */
    constructor(messages = {}) {
        /**
         * Um registro de mensagens e seus tratamentos associados, organizados por chat ID.
         */
        this.messages = {};
        this.messages = messages;
    }
    /**
     * Adiciona uma mensagem e seu tratamento personalizado associado a um chat ID.
     * @param chatId - O ID do chat ao qual a mensagem está associada.
     * @param config - As configurações do tratamento personalizado.
     * @returns Uma promessa que resolve com a mensagem.
     */
    async addMessage(chatId, config) {
        if (!(chatId in this.messages)) {
            this.messages[chatId] = [];
        }
        return new Promise((resolve, reject) => {
            const signal = config.signal;
            if (signal?.aborted) {
                reject(signal.reason ?? new Error('Espera cancelada'));
                return;
            }
            const entry = {
                stopRead: !!config.stopRead,
                patterns: config.patterns || [],
                resolve: (message) => {
                    signal?.removeEventListener('abort', onAbort);
                    resolve(message);
                },
            };
            const onAbort = () => {
                this.removeMessage(chatId, entry);
                reject(signal?.reason ?? new Error('Espera cancelada'));
            };
            signal?.addEventListener('abort', onAbort, { once: true });
            this.messages[chatId].push(entry);
        });
    }
    /** Tira uma espera da fila do chat (e o chat do registro, se ficar vazio). */
    removeMessage(chatId, entry) {
        const waiting = this.messages[chatId];
        if (!waiting)
            return;
        const remaining = waiting.filter((item) => item !== entry);
        if (remaining.length)
            this.messages[chatId] = remaining;
        else
            delete this.messages[chatId];
    }
    /**
     * Resolve uma mensagem e seus tratamentos personalizados associados a um chat ID.
     * @param message - A mensagem a ser resolvida.
     * @returns Verdadeiro se a resolução deve interromper a leitura adicional de mensagens, caso contrário, falso.
     */
    resolveMessage(message) {
        const chatId = message.chat.id;
        if (!chatId || !(chatId in this.messages))
            return false;
        let stopRead = false;
        // Cópia: resolver uma espera altera a lista.
        for (const msg of [...this.messages[chatId]]) {
            // Esta espera ignora a mensagem (ex.: é de outro usuário): passa para a próxima.
            // Antes era `return false`, e a espera de um usuário num grupo travava as dos outros.
            if (msg.patterns.some((ptn) => ptn(message)))
                continue;
            this.removeMessage(chatId, msg);
            msg.resolve(message);
            stopRead = stopRead || msg.stopRead;
        }
        return stopRead;
    }
    /**
     * Ignora mensagens provenientes do próprio usuário.
     * @param message - A mensagem a ser verificada.
     * @returns Verdadeiro se a mensagem deve ser ignorada, caso contrário, falso.
     */
    static ignoreMessageFromMe(message) {
        return !!message?.fromMe;
    }
    /**
     * Ignora mensagens não oficiais.
     * @param message - A mensagem a ser verificada.
     * @returns Verdadeiro se a mensagem deve ser ignorada, caso contrário, falso.
     */
    static ignoreUnofficialMessage(message) {
        return !!message?.isUnofficial;
    }
    /**
     * Ignora um conjunto específico de mensagens.
     * @param messages - Um conjunto de mensagens a serem ignoradas.
     * @returns Uma função que verifica se uma mensagem deve ser ignorada.
     */
    static ignoreMessages(...messages) {
        return (message) => messages.some((msg) => msg.id == message.id);
    }
}
exports.default = MessageHandler;
//# sourceMappingURL=MessageHandler.js.map