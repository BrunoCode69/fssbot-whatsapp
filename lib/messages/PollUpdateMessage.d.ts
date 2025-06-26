import PollMessage, { PollAction, PollOption } from "./PollMessage";
import { MessageType } from "./Message";
import Chat from "../modules/chat/Chat";
/**
 * Representa uma mensagem de atualização de enquete, que é uma extensão da mensagem de enquete.
 */
export default class PollUpdateMessage extends PollMessage {
    /** O tipo da mensagem é MessageType.PollUpdate. */
    readonly type = MessageType.PollUpdate;
    /**
     * Ação relacionada à mensagem de atualização de enquete.
     * Pode ser PollAction.Add ou PollAction.Remove, padrão é PollAction.Add.
     */
    action: PollAction;
    /**
     * Cria uma nova instância de PollUpdateMessage.
     * @param chat - O chat associado à mensagem de atualização de enquete (opcional).
     * @param text - O texto da mensagem (opcional).
     * @param options - Lista de opções da enquete (opcional).
     * @param others - Outras propriedades da mensagem de atualização de enquete (opcional).
     */
    constructor(chat?: Chat | string, text?: string, options?: PollOption[], others?: Partial<PollUpdateMessage>);
    /**
     * Serializa a mensagem de atualização de enquete em um objeto JSON.
     * @returns O objeto JSON representando a mensagem de atualização de enquete.
     */
    toJSON(): any;
    /**
     * Desserializa um objeto JSON em uma instância de PollUpdateMessage.
     * @param message - O objeto JSON a ser desserializado.
     * @returns Uma instância de PollUpdateMessage.
     */
    static fromJSON(message: any): PollUpdateMessage;
    /**
     * Verifica se um objeto é uma instância válida de PollUpdateMessage.
     * @param message - O objeto a ser verificado como uma instância de PollUpdateMessage.
     * @returns `true` se o objeto for uma instância válida de PollUpdateMessage, caso contrário, `false`.
     */
    static isValid(message: any): message is PollUpdateMessage;
}
