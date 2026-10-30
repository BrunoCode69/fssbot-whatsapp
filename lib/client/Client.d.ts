/// <reference types="node" />
import ConnectionConfig from '../configs/ConnectionConfig';
import Message from '../messages/Message';
import MediaMessage from '../messages/MediaMessage';
import ChatStatus from '../modules/chat/ChatStatus';
import Chat from '../modules/chat/Chat';
import User from '../modules/user/User';
import ClientEvents, { ClientEventsMap } from './ClientEvents';
import IAuth from './IAuth';
import IBot from '../bot/IBot';
import MessageHandler, { type MessageHandlerConfig } from '../utils/MessageHandler';
import Call from '../models/Call';
export default class Client<Bot extends IBot = IBot> extends ClientEvents {
    funcHandler: any;
    messageHandler: MessageHandler;
    reconnectTimes: number;
    config: ConnectionConfig;
    bot: Bot;
    id: string;
    constructor(bot: Bot, config?: Partial<ConnectionConfig>);
    configEvents(): void;
    connect(auth: IAuth | string): Promise<void>;
    reconnect(alert?: boolean): Promise<void>;
    stop(reason?: any): Promise<void>;
    logout(): Promise<void>;
    awaitEvent<T extends keyof ClientEventsMap>(eventName: T, maxTimeout?: number): Promise<ClientEventsMap[T]>;
    awaitConnectionOpen(): Promise<void>;
    deleteMessage(message: Message): Promise<void>;
    removeMessage(message: Message): Promise<void>;
    readMessage(message: Message): Promise<void>;
    editMessage(message: Message, text: string): Promise<void>;
    addReaction(message: Message, reaction: string): Promise<void>;
    removeReaction(message: Message): Promise<void>;
    addAnimatedReaction(message: Message, reactions: string[], interval?: number, maxTimeout?: number): (reactionStop?: string) => Promise<void>;
    send(message: Message): Promise<Message>;
    sendMessage(chat: Chat | string, message: string | Message, mention?: Message): Promise<Message>;
    awaitMessage(chat: Chat | string, config?: Partial<MessageHandlerConfig>): Promise<Message>;
    downloadStreamMessage(message: MediaMessage): Promise<Buffer>;
    getBotName(): Promise<string>;
    setBotName(name: string): any;
    getBotDescription(): any;
    setBotDescription(description: string): any;
    getBotProfile(lowQuality?: boolean): any;
    setBotProfile(profile: Buffer): any;
    getChat(chat: Chat | string): Promise<Chat | null>;
    updateChat(id: string, chat: Partial<Chat>): Promise<void>;
    getChats(): Promise<Chat[]>;
    setChats(chats: Chat[]): Promise<void>;
    removeChat(chat: string | Chat): Promise<void>;
    createChat(chat: Chat): any;
    leaveChat(chat: Chat | string): any;
    getChatName(chat: Chat | string): any;
    setChatName(chat: Chat | string, name: string): any;
    getChatDescription(chat: Chat | string): any;
    setChatDescription(chat: Chat | string, description: string): any;
    getChatProfile(chat: Chat | string, lowQuality?: boolean): any;
    setChatProfile(chat: Chat | string, profile: Buffer): any;
    getChatLeader(chat: Chat | string): Promise<User>;
    getChatUsers(chat: Chat | string): Promise<string[]>;
    getChatAdmins(chat: Chat | string): Promise<string[]>;
    addUserInChat(chat: Chat | string, user: User | string): any;
    removeUserInChat(chat: Chat | string, user: User | string): any;
    promoteUserInChat(chat: Chat | string, user: User | string): any;
    demoteUserInChat(chat: Chat | string, user: User | string): any;
    changeChatStatus(chat: Chat | string, status: ChatStatus): Promise<void>;
    joinChat(code: string): Promise<void>;
    getChatInvite(chat: Chat | string): Promise<string>;
    revokeChatInvite(chat: Chat | string): Promise<string>;
    rejectCall(call: Call | string): Promise<void>;
    getUsers(): Promise<User[]>;
    getSavedUsers(): Promise<User[]>;
    setUsers(users: User[]): any;
    getUser(user: User | string): Promise<User | null>;
    updateUser(id: string, user: Partial<User>): Promise<void>;
    removeUser(user: User | string): any;
    getUserName(user: User | string): any;
    setUserName(user: User | string, name: string): any;
    getUserDescription(user: User | string): any;
    setUserDescription(user: User | string, description: string): any;
    getUserProfile(user: User | string, lowQuality?: boolean): any;
    setUserProfile(user: User | string, profile: Buffer): any;
    unblockUser(user: User | string): any;
    blockUser(user: User | string): any;
    /** Retorna o método opcional do bot ou lança erro se a plataforma não suporta. */
    private feature;
    /** Verifica se a plataforma atual oferece um recurso opcional. */
    supports(name: keyof IBot): boolean;
    private linkChat;
    private linkUser;
    /**
     * ID único de um usuário ou chat.
     * No WhatsApp: número (`...@s.whatsapp.net`) quando conhecido, senão o LID (`...@lid`).
     */
    resolveId(id: User | Chat | string): Promise<string>;
    /** Todos os identificadores conhecidos de um usuário (ID único, número e LID). */
    getUserIdentity(user: User | string): Promise<any>;
    /** Só administradores podem enviar mensagens (`true`) ou todos podem (`false`). */
    setChatAnnounce(chat: Chat | string, enabled: boolean): Promise<void>;
    /** Só administradores podem editar nome, descrição e foto (`true`). */
    setChatLocked(chat: Chat | string, enabled: boolean): Promise<void>;
    /** Mensagens temporárias em segundos (0 desativa). */
    setChatEphemeral(chat: Chat | string, seconds: number): Promise<void>;
    /** Qualquer membro pode adicionar participantes (`true`) ou só administradores (`false`). */
    setChatMemberAddMode(chat: Chat | string, allMembers: boolean): Promise<void>;
    /** A entrada no grupo exige aprovação de um administrador (`true`). */
    setChatJoinApproval(chat: Chat | string, enabled: boolean): Promise<void>;
    /** Pedidos de entrada pendentes no grupo. */
    getChatJoinRequests(chat: Chat | string): Promise<any>;
    /** Aprova pedidos de entrada. Retorna os IDs aprovados. */
    approveChatJoinRequests(chat: Chat | string, users: (User | string)[]): Promise<string[]>;
    /** Recusa pedidos de entrada. Retorna os IDs recusados. */
    rejectChatJoinRequests(chat: Chat | string, users: (User | string)[]): Promise<string[]>;
    /** Dados de um grupo a partir do código ou link de convite, sem entrar nele. */
    getChatInviteInfo(code: string): Promise<Chat | null>;
    /**
     * Fixa uma mensagem no chat.
     * @param duration - Segundos: 86400 (24 h), 604800 (7 dias) ou 2592000 (30 dias). Use 0 para desafixar.
     */
    pinMessage(message: Message, duration?: number): Promise<void>;
    /** Desafixa uma mensagem. */
    unpinMessage(message: Message): Promise<void>;
    /** Marca (`true`) ou desmarca (`false`) uma mensagem com estrela. */
    starMessage(message: Message, star?: boolean): Promise<void>;
    /** Encaminha uma mensagem para outro chat. */
    forwardMessage(chat: Chat | string, message: Message): Promise<Message>;
    /** Passa a receber o evento `presence` (digitando, gravando, online) deste chat. */
    subscribePresence(chat: Chat | string): Promise<void>;
    /** IDs dos usuários bloqueados. */
    getBlockedUsers(): Promise<string[]>;
    /** Verifica se um número ou ID existe no WhatsApp. */
    isOnWhatsApp(id: User | string): Promise<{
        exists: boolean;
        id: string;
    }>;
    static getClients(): Record<string, Client<IBot>>;
    static saveClients(clients: Record<string, Client<IBot>>): void;
    static getClient(id: string): Client<IBot>;
    static saveClient(client: Client<IBot>): void;
    static generateId(): string;
}
