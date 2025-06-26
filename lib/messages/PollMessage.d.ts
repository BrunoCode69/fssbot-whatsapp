import Message, { MessageType } from "./Message";
import Chat from "../modules/chat/Chat";
/**
 * Representa uma opção em uma enquete.
 */
export declare type PollOption = {
    /** Identificador exclusivo da opção. */
    id: string;
    /** Nome ou descrição da opção. */
    name: string;
};
/**
 * Enumerador que define as ações relacionadas a uma enquete.
 */
export declare enum PollAction {
    /** Ação de criação de uma nova enquete. */
    Create = "create",
    /** Ação de adição de opções a uma enquete existente. */
    Add = "add",
    /** Ação de remoção de opções de uma enquete existente. */
    Remove = "remove"
}
/**
 * Representa uma mensagem de enquete.
 */
export default class PollMessage extends Message {
    /** O tipo da mensagem é MessageType.Poll ou MessageType.PollUpdate. */
    readonly type: MessageType.Poll | MessageType.PollUpdate;
    /** Mapa de votos por usuário. */
    votes: {
        [user: string]: string[];
    };
    /** Chave secreta associada à enquete. */
    secretKey: Uint8Array;
    /** Lista de opções da enquete. */
    options: PollOption[];
    /** Ação relacionada à enquete (Create, Add ou Remove). */
    action: PollAction;
    /**
     * Cria uma nova instância de PollMessage.
     * @param chat - O chat associado à mensagem de enquete (opcional).
     * @param text - O texto da mensagem (opcional).
     * @param options - Lista de opções da enquete (padrão é uma lista vazia).
     * @param others - Outras propriedades da mensagem de enquete (opcional).
     */
    constructor(chat?: Chat | string, text?: string, options?: PollOption[], others?: Partial<PollMessage>);
    /**
     * Adiciona uma nova opção à enquete.
     * @param name - Nome da nova opção.
     * @param id - Identificador da nova opção (padrão é um timestamp em forma de string).
     */
    addOption(name: string, id?: string): void;
    /**
     * Remove uma opção da enquete.
     * @param option - Opção a ser removida.
     */
    removeOption(option: PollOption): void;
    /**
     * Obtém os votos de um usuário na enquete.
     * @param user - ID do usuário.
     * @returns Uma matriz de votos do usuário.
     */
    getUserVotes(user: string): string[];
    /**
     * Define os votos de um usuário na enquete.
     * @param user - ID do usuário.
     * @param hashVotes - Uma matriz de votos do usuário.
     */
    setUserVotes(user: string, hashVotes: string[]): void;
    /**
     * Serializa a mensagem de enquete em um objeto JSON.
     * @returns O objeto JSON representando a mensagem de enquete.
     */
    toJSON(): any;
    /**
     * Desserializa um objeto JSON em uma instância de PollMessage.
     * @param message - O objeto JSON a ser desserializado.
     * @returns Uma instância de PollMessage.
     */
    static fromJSON(message: any): PollMessage;
    /**
     * Verifica se um objeto é uma instância válida de PollMessage.
     * @param message - O objeto a ser verificado como uma instância de PollMessage.
     * @returns `true` se o objeto for uma instância válida de PollMessage, caso contrário, `false`.
     */
    static isValid(message: any): message is PollMessage;
}
