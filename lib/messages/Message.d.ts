import Chat from '../modules/chat/Chat';
import User from '../modules/user/User';
/**
 * Tipo da mensagem
 */
export declare enum MessageType {
    Empty = "empty",
    Error = "error",
    Text = "text",
    Media = "media",
    File = "file",
    Video = "video",
    Image = "image",
    Audio = "audio",
    Sticker = "sticker",
    Reaction = "reaction",
    Contact = "contact",
    Location = "location",
    Poll = "poll",
    PollUpdate = "pollUpdate",
    List = "list",
    Button = "button",
    TemplateButton = "templateButton",
    Custom = "customButton"
}
/**
 * Status da mensagem
 */
export declare enum MessageStatus {
    Error = "ERROR",
    Sending = "SENDING",
    Sended = "SENDED",
    Received = "RECEIVED",
    Readed = "READED",
    Played = "PLAYED"
}
/** Plataforma de onde foi enviado uma mensagem */
export declare enum MessagePlataform {
    Android = "android",
    Ios = "ios",
    Web = "web",
    Desktop = "desktop",
    Unknown = "unknown"
}
export default class Message {
    /** ID do bot associado a esta mensagem */
    botId: string;
    /** ID do cliente associado a esta mensagem */
    clientId: string;
    /** Tipo da mensagem */
    type: MessageType;
    /** Sala de bate-papo que foi enviada a mensagem */
    chat: Chat;
    /** Usuário que mandou a mensagem */
    user: User;
    /** Texto da mensagem */
    text: string;
    /** Mensagem mencionada na mensagem */
    mention?: Message | undefined;
    /** ID da mensagem */
    id: string;
    /** Mensagem enviada pelo bot */
    fromMe: boolean;
    /** Opção selecionada */
    selected: string;
    /** Usuários mencionados na mensagem */
    mentions: string[];
    /** Tempo em que a mensagem foi enviada */
    timestamp: number;
    /** Status da mensagem */
    status: MessageStatus;
    /** É uma mensasgem de atualização */
    isUpdate: boolean;
    /** A mensagem é editada */
    isEdited: boolean;
    /** A mensagem foi deletada */
    isDeleted: boolean;
    /** A mensagem é de visualização única */
    isViewOnce: boolean;
    /** A mensagem foi enviada por uma API não oficial */
    isUnofficial: boolean;
    /** Plataforma de onde foi enviado a mensagem */
    plataform: MessagePlataform;
    /** A mensagem recebida é antiga */
    isOld: boolean;
    /** Dados adicionais */
    extra: Record<string, any>;
    constructor(chat?: Chat | string, text?: string, others?: Partial<Message>);
    /**
     * Injeta dados de ujma mensagem na mesnagem atual.
     * @param data - Os dados que serão injetados.
     */
    inject(data: Partial<Message>): void;
    /**
     * * Adiciona uma reação a mensagem.
     * @param emoji - Emoji que será adicionado na reação.
     */
    addReaction(emoji: string): Promise<void>;
    /**
     * * Remove uma reação da mensagem.
     */
    removeReaction(): Promise<void>;
    /**
     * * Adiciona animações na reação da mensagem.
     * @param reactions Reações em sequência.
     * @param interval Intervalo entre cada reação.
     * @param maxTimeout Maximo de tempo reagindo.
     */
    addAnimatedReaction(reactions: string[], interval?: number, maxTimeout?: number): (reactionStop?: string) => Promise<void>;
    /** Envia uma mensagem mencionando a mensagem atual.
     * @param message Mensagem que será enviada.
     * @param isMention Se verdadeiro a mensagem atual é mencionada na mensagem enviada.
     */
    reply(message: Message | string, isMention?: boolean): Promise<Message>;
    /**
     * * Marca mensagem como visualizada.
     */
    read(): Promise<void>;
    /**
     * Converte o objeto atual para uma representação em formato JSON.
     * @returns Um objeto JSON que representa o estado atual do objeto.
     */
    toJSON(): any;
    /**
     * Cria uma instância de Message a partir de uma representação em formato JSON.
     * @param data - Os dados JSON a serem usados para criar a instância.
     * @returns Uma instância de Message criada a partir dos dados JSON.
     */
    static fromJSON(data: any): Message;
    static fix<T extends Message>(message: T): T;
    /**
     * Obtém uma instância de Message com base em um ID e/ou dados passados.
     * @param message - O ID da mensagem ou uma instância existente de Message.
     * @param data - Dados que serão aplicados na mensagem,.
     * @returns Uma instância de Message com os dados passados.
     */
    static apply(message: Message | string, data?: Partial<Message>): Message;
    /**
     * Verifica se um objeto é uma instância válida de Message.
     * @param message - O objeto a ser verificado.
     * @returns Verdadeiro se o objeto for uma instância válida de Message, caso contrário, falso.
     */
    static isValid(message: any): message is Message;
}
