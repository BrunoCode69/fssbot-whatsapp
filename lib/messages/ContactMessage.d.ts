import Message, { MessageType } from "./Message";
import User from "../modules/user/User";
import Chat from "../modules/chat/Chat";
/**
 * Representa uma mensagem de contato.
 */
export default class ContactMessage extends Message {
    /** O tipo da mensagem é sempre MessageType.Contact. */
    readonly type = MessageType.Contact;
    /** Lista de contatos associados à mensagem. */
    contacts: Array<User>;
    /**
     * Cria uma nova instância de ContactMessage.
     * @param contacts - Uma matriz de contatos, que podem ser objetos User ou IDs de usuário (opcional).
     * @param chat - O chat associado à mensagem de contato (opcional).
     * @param text - O texto da mensagem (opcional).
     * @param others - Outras propriedades da mensagem de contato (opcional).
     */
    constructor(chat?: Chat | string, text?: string, contacts?: Array<User | string>, others?: Partial<ContactMessage>);
    /**
     * Converte o objeto atual para uma representação em formato JSON.
     * @returns Um objeto JSON que representa o estado atual do objeto.
     */
    toJSON(): any;
    /**
     * Desserializa um objeto JSON em uma instância de ContactMessage.
     * @param data - O objeto JSON a ser desserializado.
     * @returns Uma instância de ContactMessage.
     */
    static fromJSON(data: any): ContactMessage;
    /**
     * Verifica se um objeto é uma instância válida de ContactMessage.
     * @param message - O objeto a ser verificado como uma instância de ContactMessage.
     * @returns Verdadeiro se o objeto for uma instância válida de ContactMessage, caso contrário, falso.
     */
    static isValid(message: any): message is ContactMessage;
}
