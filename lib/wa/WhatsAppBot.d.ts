/// <reference types="node" />
/// <reference types="node" />
import makeWASocket, { MediaDownloadOptions, AuthenticationCreds, WAConnectionState, DisconnectReason, ConnectionState, GroupMetadata, SocketConfig, Contact, proto, Chat as BaileysChat } from '@whiskeysockets/baileys';
import NodeCache from 'node-cache';
import { PollMessage, PollUpdateMessage, ReactionMessage } from '../messages';
import Message from '../messages/Message';
import makeInMemoryStore from './makeInMemoryStore';
import { Media } from '../messages/MediaMessage';
import { UserAction } from '../modules/user';
import ConfigWAEvents from './ConfigWAEvents';
import { BotStatus } from '../bot/BotStatus';
import BotEvents from '../bot/BotEvents';
import ChatStatus from '../modules/chat/ChatStatus';
import IAuth from '../client/IAuth';
import User from '../modules/user/User';
import Chat from '../modules/chat/Chat';
import IBot from '../bot/IBot';
import Call from '../models/Call';
export declare type WhatsAppBotConfig = Partial<SocketConfig> & {
    /** Auto carrega o histórico de mensagens ao se conectar */
    autoSyncHistory: boolean;
    /** Lê todas as mensagens falhadas */
    readAllFailedMessages: boolean;
    /** Intervalo em milesgundos para reiniciar conexão */
    autoRestartInterval: number;
    /** Usar servidor experimental para download de mídias */
    useExperimentalServers: boolean;
    /** Auto carrega informações de contatos */
    autoLoadContactInfo: boolean;
    /** Auto carrega informações de contatos */
    autoLoadGroupInfo: boolean;
};
export default class WhatsAppBot extends BotEvents implements IBot {
    sock: ReturnType<typeof makeWASocket>;
    config: WhatsAppBotConfig;
    auth: IAuth;
    messagesCached: string[];
    store: ReturnType<typeof makeInMemoryStore>;
    msgRetryCountercache: NodeCache;
    saveCreds: (creds: Partial<AuthenticationCreds>) => Promise<void>;
    connectionListeners: ((update: Partial<ConnectionState>) => boolean)[];
    DisconnectReason: typeof DisconnectReason;
    logger: any;
    id: string;
    status: BotStatus;
    phoneNumber: string;
    name: string;
    profileUrl: string;
    lastConnectionUpdateDate: number;
    checkConnectionInterval: NodeJS.Timer | null;
    configEvents: ConfigWAEvents;
    constructor(config?: Partial<WhatsAppBotConfig>);
    connect(auth?: string | IAuth): Promise<void>;
    internalConnect(additionalOptions?: Partial<WhatsAppBot['config']>): Promise<void>;
    /**
     * * Reconecta ao servidor do WhatsApp
     * @returns
     */
    reconnect(stopEvents?: boolean, showOpen?: boolean): Promise<void>;
    /**
     * * Desliga a conexão com o servidor do WhatsApp
     * @param reason
     * @returns
     */
    stop(reason?: any): Promise<void>;
    logout(): Promise<void>;
    /**
     * * Aguarda um status de conexão
     */
    awaitConnectionState(connection: WAConnectionState): Promise<Partial<ConnectionState>>;
    /**
     * * Lê o chat
     * @param chat Sala de bate-papo
     */
    readChat(chat: Partial<Chat>, metadata?: Partial<GroupMetadata> & Partial<BaileysChat>, updateMetadata?: boolean): Promise<void>;
    /**
     * * Lê o usuário
     * @param user Usuário
     */
    readUser(user: Partial<User>, metadata?: Partial<Contact>): Promise<void>;
    /**
     * Obtem uma mensagem de enquete.
     * @param pollMessageId - ID da mensagem de enquete que será obtida.
     * @returns A mensagem de enquete salva.
     */
    getPollMessage(pollMessageId: string): Promise<PollMessage | PollUpdateMessage>;
    /**
     * Salva a mensagem de enquete.
     * @param pollMessage - Mensagem de enquete que será salva.
     */
    savePollMessage(pollMessage: PollMessage | PollUpdateMessage): Promise<void>;
    /**
     * * Trata atualizações de participantes
     * @param action Ação realizada
     * @param chatId Sala de bate-papo que a ação foi realizada
     * @param userId Usuário que foi destinado a ação
     * @param fromId Usuário que realizou a ação
     */
    groupParticipantsUpdate(action: UserAction, chatId: string, userId: string, fromId: string): Promise<void>;
    getChatName(chat: Chat): Promise<string>;
    setChatName(chat: Chat, name: string): Promise<void>;
    getChatDescription(chat: Chat): Promise<string>;
    setChatDescription(chat: Chat, description: string): Promise<any>;
    getChatProfile(chat: Chat, lowQuality?: boolean): Promise<Buffer>;
    getChatProfileUrl(chat: Chat, lowQuality?: boolean): Promise<string>;
    setChatProfile(chat: Chat, image: Buffer): Promise<void>;
    updateChat(chat: {
        id: string;
    } & Partial<Chat>): Promise<void>;
    removeChat(chat: Chat): Promise<void>;
    getChat(chat: Chat): Promise<Chat | null>;
    getChats(): Promise<string[]>;
    setChats(chats: Chat[]): Promise<void>;
    getChatUsers(chat: Chat): Promise<string[]>;
    getChatAdmins(chat: Chat): Promise<string[]>;
    getChatLeader(chat: Chat): Promise<string>;
    addUserInChat(chat: Chat, user: User): Promise<void>;
    removeUserInChat(chat: Chat, user: User): Promise<void>;
    promoteUserInChat(chat: Chat, user: User): Promise<void>;
    demoteUserInChat(chat: Chat, user: User): Promise<void>;
    changeChatStatus(chat: Chat, status: ChatStatus): Promise<void>;
    createChat(chat: Chat): Promise<void>;
    leaveChat(chat: Chat): Promise<void>;
    joinChat(code: string): Promise<void>;
    getChatInvite(chat: Chat): Promise<string>;
    revokeChatInvite(chat: Chat): Promise<string>;
    rejectCall(call: Call): Promise<void>;
    getUserName(user: User): Promise<string>;
    setUserName(user: User, name: string): Promise<void>;
    getUserDescription(user: User): Promise<string>;
    setUserDescription(user: User, description: string): Promise<void>;
    getUserProfile(user: User, lowQuality?: boolean): Promise<Buffer>;
    getUserProfileUrl(user: User, lowQuality?: boolean): Promise<string>;
    setUserProfile(user: User, image: Buffer): Promise<void>;
    getUser(user: User): Promise<User | null>;
    getUsers(): Promise<string[]>;
    updateUser(user: {
        id: string;
    } & Partial<User>): Promise<void>;
    setUsers(users: User[]): Promise<void>;
    removeUser(user: User): Promise<void>;
    blockUser(user: User): Promise<void>;
    unblockUser(user: User): Promise<void>;
    getBotName(): Promise<string>;
    setBotName(name: string): Promise<void>;
    getBotDescription(): Promise<string>;
    setBotDescription(description: string): Promise<void>;
    getBotProfile(lowQuality?: boolean): Promise<Buffer>;
    getBotProfileUrl(lowQuality?: boolean): Promise<string>;
    setBotProfile(image: Buffer): Promise<void>;
    readMessage(message: Message): Promise<void>;
    removeMessage(message: Message): Promise<void>;
    deleteMessage(message: Message): Promise<void>;
    addReaction(message: ReactionMessage): Promise<void>;
    removeReaction(message: ReactionMessage): Promise<void>;
    editMessage(message: Message): Promise<void>;
    send(content: Message): Promise<Message>;
    /**
     * * Cacheia uma mensagem.
     * @param id - Mensagem a ser cacheada.
     * @remarks Auto remove a mensagem cacheada após 1 minuto.
     */
    addMessageCache(id: string): void;
    downloadStreamMessage(media: Media): Promise<Buffer>;
    experimentalDownloadMediaMessage(media: Media, maxRetryCount?: number): Promise<Buffer>;
    /**
     * * Faz o download de arquivos do WhatsApp
     * @param message
     * @param type
     * @param options
     * @param ctx
     * @returns
     */
    download(message: proto.WebMessageInfo, type: 'buffer' | 'stream', options: MediaDownloadOptions, ctx?: any): Promise<any>;
    /**
     * * Verifica se o número está registrado no WhatsApp
     * @returns
     */
    onExists(id: string): Promise<{
        exists: boolean;
        id: string;
    }>;
    /**
     * * Atualiza uma mensagem de mídia
     * @param message
     * @returns
     */
    updateMediaMessage(message: proto.IWebMessageInfo): Promise<proto.IWebMessageInfo>;
    /**
     * * Aceita o convite para um grupo
     * @param code
     * @returns
     */
    groupAcceptInvite(code: string): Promise<string>;
    /**
     * * Gera a configuração de navegador
     * @param plataform Nome da plataforma
     * @param browser Nome do navegador
     * @param version Versão do navegador
     */
    static Browser(plataform?: string, browser?: string, version?: string): [string, string, string];
}
