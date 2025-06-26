import Message, { MessageType } from "./Message";
import Chat from "../modules/chat/Chat";
/**
 * Representa uma mensagem de erro.
 */
export default class ErrorMessage extends Message {
    /** O tipo da mensagem é sempre MessageType.Error. */
    readonly type = MessageType.Error;
    /** O erro da mensagem */
    error: Error;
    /**
     * Cria uma instância de ErrorMessage.
     * @param chat - O chat ou ID do chat ao qual a mensagem pertence (opcional).
     * @param text - O texto da mensagem (opcional).
     * @param others - Outros dados a serem injetados na instância (opcional).
     */
    constructor(chat?: Chat | string, error?: Error, others?: Partial<ErrorMessage>);
    /**
     * Converte o objeto atual para uma representação em formato JSON.
     * @returns Um objeto JSON que representa o estado atual do objeto.
     */
    toJSON(): any;
    /**
     * Desserializa um objeto JSON em uma instância de ErrorMessage.
     * @param data - O objeto JSON a ser desserializado.
     * @returns Uma instância de ErrorMessage.
     */
    static fromJSON(data: any): ErrorMessage;
    /**
     * Verifica se um objeto é uma instância válida de ErrorMessage.
     * @param message - O objeto a ser verificado como uma instância de ErrorMessage.
     * @returns Verdadeiro se o objeto for uma instância válida de ErrorMessage, caso contrário, falso.
     */
    static isValid(message: any): message is ErrorMessage;
}
