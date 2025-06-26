import Message, { MessageType } from "./Message";
import Chat from "../modules/chat/Chat";
/**
 * Representa uma mensagem de texto.
 */
export default class TextMessage extends Message {
    /** O tipo da mensagem é sempre MessageType.Text. */
    readonly type: MessageType.Text;
    /**
     * Cria uma nova instância de TextMessage.
     * @param chat - O chat associado à mensagem de texto (opcional).
     * @param text - O texto da mensagem (opcional).
     * @param others - Outras propriedades da mensagem de texto (opcional).
     */
    constructor(chat?: Chat | string, text?: string, others?: Partial<TextMessage>);
    /**
     * Converte o objeto atual para uma representação em formato JSON.
     * @returns Um objeto JSON que representa o estado atual do objeto.
     */
    toJSON(): any;
    /**
     * Cria uma instância de TextMessage a partir de uma representação em formato JSON.
     * @param data - Os dados JSON a serem usados para criar a instância.
     * @returns Uma instância de TextMessage criada a partir dos dados JSON.
     */
    static fromJSON(data: any): TextMessage;
    /**
     * Verifica se um objeto é uma instância válida de TextMessage.
     * @param message - O objeto a ser verificado.
     * @returns Verdadeiro se o objeto for uma instância válida de TextMessage, caso contrário, falso.
     */
    static isValid(message: any): message is TextMessage;
}
