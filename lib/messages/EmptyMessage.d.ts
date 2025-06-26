import Message, { MessageType } from "./Message";
/**
 * Representa uma mensagem vazia.
 */
export default class EmptyMessage extends Message {
    /** O tipo da mensagem é sempre MessageType.Empty. */
    readonly type = MessageType.Empty;
    /**
     * Converte o objeto atual para uma representação em formato JSON.
     * @returns Um objeto JSON que representa o estado atual do objeto.
     */
    toJSON(): any;
    /**
     * Desserializa um objeto JSON em uma instância de EmptyMessage.
     * @param data - O objeto JSON a ser desserializado.
     * @returns Uma instância de EmptyMessage.
     */
    static fromJSON(data: any): EmptyMessage;
    /**
     * Verifica se um objeto é uma instância válida de EmptyMessage.
     * @param message - O objeto a ser verificado como uma instância de EmptyMessage.
     * @returns Verdadeiro se o objeto for uma instância válida de EmptyMessage, caso contrário, falso.
     */
    static isValid(message: any): message is EmptyMessage;
}
