import TelegramBotAPI from 'node-telegram-bot-api';
import IAuth from '../client/IAuth';
import ChatStatus from '../modules/chat/ChatStatus';
import Chat from '../modules/chat/Chat';
import User from '../modules/user/User';
import { BotStatus } from '../bot/BotStatus';
import BotEvents from '../bot/BotEvents';
import IBot from '../bot/IBot';
import ReactionMessage from '../messages/ReactionMessage';
import { Media } from '../messages/MediaMessage';
import Message from '../messages/Message';
import TelegramEvents from './TelegramEvents';
import { type MediaDownloadOptions } from '../utils/MediaUtils';
import Call from '../models/Call';
export default class TelegramBot extends BotEvents implements IBot {
    auth: IAuth;
    bot: TelegramBotAPI;
    events: TelegramEvents;
    options: Partial<TelegramBotAPI.ConstructorOptions>;
    id: string;
    status: BotStatus;
    phoneNumber: string;
    name: string;
    profileUrl: string;
    constructor(options?: Partial<TelegramBotAPI.ConstructorOptions>);
    connect(auth: string | IAuth): Promise<void>;
    reconnect(alert?: boolean): Promise<void>;
    stop(reason: any): Promise<void>;
    logout(): Promise<void>;
    send(message: Message): Promise<Message>;
    editMessage(message: Message): Promise<void>;
    addReaction(message: ReactionMessage): Promise<void>;
    removeReaction(message: ReactionMessage): Promise<void>;
    readMessage(message: Message): Promise<void>;
    removeMessage(message: Message): Promise<void>;
    pinMessage(message: Message, _duration?: number): Promise<void>;
    unpinMessage(message: Message): Promise<void>;
    forwardMessage(chat: Chat, message: Message): Promise<Message>;
    deleteMessage(message: Message): Promise<void>;
    /**
     * Baixa a mídia para a memória.
     * @param options Opcional: `maxBytes` (sem valor = sem limite), `signal` e `timeoutMs`.
     */
    downloadStreamMessage(media: Media, options?: MediaDownloadOptions): Promise<Buffer>;
    /**
     * Baixa a mídia direto para `filePath`, em stream (sem carregar tudo em memória).
     * Aplica `maxBytes` pelo tamanho declarado, pelo Content-Length e pelos bytes contados.
     * Em caso de falha o arquivo parcial é apagado.
     */
    downloadMediaToFile(media: Media, filePath: string, options?: MediaDownloadOptions): Promise<void>;
    /** Falha cedo quando o Telegram declara (`file_size`) um tamanho acima de `maxBytes`. */
    private static assertDeclaredMediaSize;
    getBotName(): Promise<string>;
    setBotName(name: string): Promise<void>;
    getBotDescription(): Promise<string>;
    setBotDescription(description: string): Promise<void>;
    getBotProfile(lowQuality?: boolean): Promise<Buffer>;
    getBotProfileUrl(lowQuality?: boolean): Promise<string>;
    setBotProfile(image: Buffer): Promise<void>;
    getChat(chat: Chat): Promise<Chat | null>;
    getChats(): Promise<string[]>;
    setChats(chats: Chat[]): Promise<void>;
    updateChat(chat: {
        id: string;
    } & Partial<Chat>): Promise<void>;
    removeChat(chat: Chat): Promise<void>;
    createChat(chat: Chat): Promise<void>;
    leaveChat(chat: Chat): Promise<void>;
    addUserInChat(chat: Chat, user: User): Promise<void>;
    removeUserInChat(chat: Chat, user: User): Promise<void>;
    promoteUserInChat(chat: Chat, user: User): Promise<void>;
    demoteUserInChat(chat: Chat, user: User): Promise<void>;
    changeChatStatus(chat: Chat, status: ChatStatus): Promise<void>;
    getChatUsers(chat: Chat): Promise<string[]>;
    getChatAdmins(chat: Chat): Promise<string[]>;
    getChatLeader(chat: Chat): Promise<string>;
    getChatName(chat: Chat): Promise<string>;
    setChatName(chat: Chat, name: string): Promise<void>;
    getChatDescription(chat: Chat): Promise<string>;
    setChatDescription(chat: Chat, description: string): Promise<void>;
    getChatProfile(chat: Chat, lowQuality?: boolean): Promise<Buffer>;
    getChatProfileUrl(chat: Chat, lowQuality?: boolean): Promise<string>;
    setChatProfile(chat: Chat, profile: Buffer): Promise<void>;
    joinChat(code: string): Promise<void>;
    getChatInvite(chat: Chat): Promise<string>;
    revokeChatInvite(chat: Chat): Promise<string>;
    rejectCall(call: Call): Promise<void>;
    getUser(user: User): Promise<User | null>;
    getUsers(): Promise<string[]>;
    setUsers(users: User[]): Promise<void>;
    updateUser(user: {
        id: string;
    } & Partial<User>): Promise<void>;
    removeUser(user: User): Promise<void>;
    unblockUser(user: User): Promise<void>;
    blockUser(user: User): Promise<void>;
    getUserName(user: User): Promise<string>;
    setUserName(user: User, name: string): Promise<void>;
    getUserDescription(user: User): Promise<string>;
    setUserDescription(user: User, description: string): Promise<void>;
    getUserProfile(user: User, lowQuality?: boolean): Promise<Buffer>;
    getUserProfileUrl(user: User, lowQuality?: boolean): Promise<string>;
    setUserProfile(user: User, profile: Buffer): Promise<void>;
}
