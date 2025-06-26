import Chat from '../modules/chat/Chat';
import Message, { MessageType } from './Message';
/**
 * Mensagem customizada.
 * @description Utilize para personalizar diretamente o conteúdo a ser enviado.
 */
export default class CustomMessage<T extends any = unknown> extends Message {
    /** O tipo da mensagem é sempre MessageType.Custom. */
    readonly type = MessageType.Custom;
    /** Conteúdo que será enviado. */
    content: T;
    /**.
     * @param chat - O chat associado à mensagem.
     * @param content - O conteúdo da mensagem.
     * @param others - Outras propriedades da mensagem.
     */
    constructor(chat?: Chat | string, content?: T, others?: Partial<CustomMessage<T>>);
    /**
     * Converte o objeto atual para uma representação em formato JSON.
     * @returns Um objeto JSON que representa o estado atual do objeto.
     */
    toJSON(): any;
    /**
     * Desserializa um objeto JSON em uma instância de CustomMessage.
     * @param data - O objeto JSON a ser desserializado.
     * @returns Uma instância de CustomMessage.
     */
    static fromJSON<T extends any>(data: any): CustomMessage<T>;
    /**
     * Verifica se um objeto é uma instância válida de CustomMessage.
     * @param message - O objeto a ser verificado como uma instância de CustomMessage.
     * @returns Verdadeiro se o objeto for uma instância válida de CustomMessage, caso contrário, falso.
     */
    static isValid<T extends any>(message: any): message is CustomMessage<T>;
}
