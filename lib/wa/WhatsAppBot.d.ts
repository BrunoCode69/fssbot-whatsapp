import { proto, type WaClient } from 'zapo-js';
import NodeCache from 'node-cache';
import { PollMessage, PollUpdateMessage, ReactionMessage } from '../messages';
import Message from '../messages/Message';
import makeInMemoryStore from './makeInMemoryStore';
import { Media } from '../messages/MediaMessage';
import { UserAction } from '../modules/user';
import ConfigWAEvents from './ConfigWAEvents';
import { LIDMapper } from './LIDMapper';
import { BotStatus } from '../bot/BotStatus';
import BotEvents from '../bot/BotEvents';
import ChatStatus from '../modules/chat/ChatStatus';
import IAuth from '../client/IAuth';
import User from '../modules/user/User';
import Chat from '../modules/chat/Chat';
import IBot from '../bot/IBot';
import Call from '../models/Call';
export type WALogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';
export declare function createDefaultLogger(level?: WALogLevel): any;
export type WAMessage = proto.IWebMessageInfo;
export type WAVersion = [number, number, number] | [number, number, number, number] | any[];
export interface SocketConfig {
    logger?: any;
    version?: WAVersion;
    printQRInTerminal?: boolean;
    qrTimeout?: number;
    defaultQueryTimeoutMs?: number;
    retryRequestDelayMs?: number;
    maxMsgRetryCount?: number;
    keepAliveIntervalMs?: number;
    browser?: [string, string, string];
    syncFullHistory?: boolean;
    shouldIgnoreJid?: (jid: string) => boolean;
    patchMessageBeforeSending?: (msg: any) => Promise<any> | any;
    getMessage?: (key: any) => Promise<any>;
    ignoreStatusBroadcast?: boolean;
    [key: string]: any;
}
export declare const DEFAULT_CONNECTION_CONFIG: Partial<SocketConfig>;
export declare const DEFAULT_CACHE_TTLS: {
    MSG_RETRY: number;
};
export type WAConnectionState = 'open' | 'connecting' | 'close';
export declare const DisconnectReason: {
    readonly connectionClosed: 428;
    readonly connectionLost: 408;
    readonly loggedOut: 401;
    readonly timedOut: 408;
    readonly restartRequired: 515;
    readonly badSession: 500;
};
export interface ConnectionState {
    connection?: WAConnectionState;
    lastDisconnect?: {
        error?: any;
        date?: Date;
    };
    isNewLogin?: boolean;
    qr?: string;
    receivedPendingNotifications?: boolean;
}
export interface GroupParticipant {
    id: string;
    admin?: 'admin' | 'superadmin' | null;
    phoneNumber?: string;
    isAdmin?: boolean;
    isSuperAdmin?: boolean;
    [key: string]: any;
}
export interface GroupMetadata {
    id: string;
    owner?: string;
    subject: string;
    subjectOwner?: string;
    subjectTime?: number;
    creation?: number;
    desc?: string;
    descOwner?: string;
    descId?: string;
    restrict?: boolean;
    announce?: boolean;
    size?: number;
    participants: GroupParticipant[];
    ephemeralDuration?: number;
    inviteCode?: string;
    author?: string;
    [key: string]: any;
}
export interface Contact {
    id: string;
    name?: string;
    notify?: string;
    verifiedName?: string;
    imgUrl?: string | null;
    status?: string;
    phoneNumber?: string;
    lid?: string;
    [key: string]: any;
}
export type AuthenticationCreds = any;
export type BaileysChat = any;
export declare const Browsers: {
    appropriate: (browser: string) => [string, string, string];
    ubuntu: (browser: string) => [string, string, string];
};
export declare function makeCacheableSignalKeyStore(store: any, _logger?: any): any;
export declare function generateWAMessageFromContent(chatId: string, message: any, options?: any): any;
/**
 * Converte payloads de conveniência (`{ text, title, subtitle, footer, interactiveButtons }`)
 * no formato `proto.Message.interactiveMessage` aceito nativamente pelo ZapoJS (sem injetar nó `bot`).
 */
export declare function toInteractiveProtoMessage(content: any): any;
export declare function sendInteractiveMessage(sock: any, jid: string, content: any, options?: any): Promise<any>;
export type WhatsAppBotConfig = Partial<SocketConfig> & {
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
    /** Busca a versão mais recente do WhatsApp Web antes de conectar (recomendado) */
    autoFetchLatestVersion: boolean;
    /** Tempo, em segundos, que os metadados de grupo ficam em cache */
    groupMetadataCacheTTL: number;
    /** Tempo, em segundos, que mensagens ficam em cache para reenvio, citação e encaminhamento */
    messageCacheTTL: number;
};
/** Identidade de um usuário no WhatsApp. */
export type WAIdentity = {
    /** ID canônico (PN quando conhecido, senão LID) */
    id: string;
    /** JID baseado no número (`@s.whatsapp.net`), quando conhecido */
    pn?: string;
    /** LID (`@lid`), quando conhecido */
    lid?: string;
    /** Número em dígitos, ou vazio quando oculto */
    phoneNumber: string;
};
/** Pedido de entrada pendente num grupo. */
export type WAJoinRequest = {
    user: User;
    /** Momento do pedido em milissegundos */
    requestedAt?: number;
    /** Origem do pedido */
    method?: string;
};
/** Tempo de fixação aceito pelo WhatsApp: 24 horas, 7 dias ou 30 dias. */
export type WAPinDuration = 86400 | 604800 | 2592000;
/**
 * Extrai a entrada aceita por `zapo.downloadMediaMessage`: eventos reais trazem `rawNode`,
 * enquanto mensagens citadas/construídas localmente trazem `{ key, message }` sem `rawNode`
 * e precisam passar `source.message` diretamente para `resolveMediaPayload` enxergar a mídia.
 */
export declare function resolveDownloadMediaInput(source: any): any;
export default class WhatsAppBot extends BotEvents implements IBot {
    /** Versão do WhatsApp Web obtida em tempo de execução (compartilhada entre instâncias). */
    private static latestVersion?;
    sock: any;
    zapo?: WaClient;
    get native(): WaClient | undefined;
    reportError(context: string, err: any): void;
    hasMessageCache(id: string): boolean;
    hasListeners(event: string): boolean;
    config: WhatsAppBotConfig;
    auth: IAuth;
    messagesCached: string[];
    store: ReturnType<typeof makeInMemoryStore>;
    msgRetryCountercache: NodeCache;
    /** Mensagens recentes por ID (reenvio, votos de enquete, citação e encaminhamento) */
    messageCache: NodeCache;
    /** Metadados de grupo (usado pelo Baileys em `cachedGroupMetadata`) */
    groupMetadataCache: NodeCache;
    saveCreds: (creds: Partial<AuthenticationCreds>) => Promise<void>;
    connectionListeners: ((update: Partial<ConnectionState>) => boolean)[];
    DisconnectReason: {
        readonly connectionClosed: 428;
        readonly connectionLost: 408;
        readonly loggedOut: 401;
        readonly timedOut: 408;
        readonly restartRequired: 515;
        readonly badSession: 500;
    };
    logger: any;
    id: string;
    /** LID do próprio bot */
    lid: string;
    status: BotStatus;
    phoneNumber: string;
    name: string;
    profileUrl: string;
    lastConnectionUpdateDate: number;
    checkConnectionInterval: NodeJS.Timer | null;
    configEvents: ConfigWAEvents;
    lidMapper: LIDMapper;
    /** Cache dos registros `chats-*` e `users-*` (null = não existe no disco) */
    private recordCache;
    private pendingRecordWrites;
    /** Chaves de registros antigos salvos com LID, carregadas sob demanda para migração */
    private legacyLidRecords?;
    private legacyLidRecordsLoading?;
    private userConfig;
    constructor(config?: Partial<WhatsAppBotConfig>);
    /**
     * ID canônico de um usuário ou chat, só com dados em memória.
     * Pessoas: PN quando conhecido, senão LID. Grupos/canais: apenas normalizados.
     */
    canonicalId(id?: string | null): string;
    /**
     * ID canônico de um usuário ou chat, consultando também o store persistente do Baileys.
     * Aceita número puro, PN, LID, grupo, com ou sem sufixo de dispositivo.
     */
    resolveId(id?: string | null): Promise<string>;
    /** Retorna todos os identificadores conhecidos de um usuário. */
    getIdentity(id?: string | null): Promise<WAIdentity>;
    /**
     * Busca o LID de um número no WhatsApp (pode consultar a rede).
     */
    getUserLID(id: string): Promise<string>;
    /**
     * Registra os pares PN ↔ LID de uma chave de mensagem.
     * Mantido por compatibilidade.
     */
    extractAndMapLID(message: any): {
        id: string;
        lid?: string;
    };
    /** Registra um par PN ↔ LID descoberto fora das mensagens (participantes, contatos, chamadas). */
    registerIdentity(first?: string | null, second?: string | null, persist?: boolean): boolean;
    /** Chamado quando um par PN ↔ LID novo é aprendido. */
    private onIdentityMapping;
    /**
     * Move registros salvos com LID (`users-<lid>`, `chats-<lid>`) para o ID canônico (PN),
     * para que a mesma pessoa não tenha dois registros.
     */
    private migrateLegacyRecords;
    private getRecord;
    private setRecord;
    private removeRecord;
    private scheduleRecordWrite;
    private writeRecord;
    /** Grava imediatamente todos os registros pendentes. */
    flushRecords(): Promise<void>;
    /** Guarda uma mensagem recebida ou enviada (reenvio, votos de enquete, citação, encaminhamento). */
    cacheWAMessage(message?: WAMessage | null): void;
    /** Retorna a mensagem original do WhatsApp pelo ID, se ainda estiver em cache. */
    getCachedWAMessage(id?: string): WAMessage | undefined;
    /** Registra os pares PN ↔ LID presentes nos participantes de um grupo. */
    registerParticipants(participants?: Array<Partial<Contact>> | null): void;
    /** Atualiza o cache de metadados de um grupo. */
    setGroupMetadata(metadata?: GroupMetadata | null): void;
    /**
     * Aplica uma mudança de participantes no cache do grupo, sem nova consulta à rede.
     * Mantém o cache correto para o próximo envio ao grupo.
     */
    applyParticipantsUpdate(groupId: string, participants: Array<Partial<Contact> & {
        admin?: 'admin' | 'superadmin' | null;
    }>, action: 'add' | 'remove' | 'promote' | 'demote' | 'modify'): void;
    /** Remove um grupo do cache para que o próximo acesso busque dados atuais. */
    invalidateGroupMetadata(id: string): void;
    /**
     * Metadados de um grupo, usando cache.
     * @param chat - Grupo
     * @param force - Ignora o cache e consulta o WhatsApp
     */
    getGroupMetadata(chat: Chat | string, force?: boolean): Promise<GroupMetadata | null>;
    connect(auth?: string | IAuth): Promise<void>;
    /**
     * Versão do WhatsApp Web usada na conexão.
     * Busca a versão atual (com cache de 6 horas) e usa a versão embutida no Baileys se a busca falhar.
     */
    resolveVersion(): Promise<WAVersion | undefined>;
    createZapoAdapter(zapo: any): any;
    internalConnect(additionalOptions?: Partial<WhatsAppBot['config']>): Promise<void>;
    reconnect(stopEvents?: boolean, showOpen?: boolean): Promise<void>;
    stop(reason?: any): Promise<void>;
    logout(): Promise<void>;
    awaitConnectionState(connection: WAConnectionState): Promise<Partial<ConnectionState>>;
    readChat(chat: Partial<Chat>, metadata?: Partial<GroupMetadata> & Partial<BaileysChat>, updateMetadata?: boolean): Promise<void>;
    readUser(user: Partial<User>, metadata?: Partial<Contact>): Promise<void>;
    getPollMessage(pollMessageId: string): Promise<PollMessage | PollUpdateMessage>;
    savePollMessage(pollMessage: PollMessage | PollUpdateMessage): Promise<void>;
    groupParticipantsUpdate(action: UserAction, chatId: string, userId: string, fromId: string): Promise<void>;
    getChatName(chat: Chat): Promise<string>;
    /** Garante que o chat é um grupo e que o bot é administrador. Retorna o JID do grupo. */
    private requireGroupAdmin;
    setChatName(chat: Chat, name: string): Promise<void>;
    getChatDescription(chat: Chat): Promise<string>;
    setChatDescription(chat: Chat, description: string): Promise<any>;
    getChatProfile(chat: Chat, lowQuality?: boolean): Promise<Buffer>;
    getChatProfileUrl(chat: Chat, lowQuality?: boolean): Promise<any>;
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
    private participantsAction;
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
    /**
     * Define se só administradores podem enviar mensagens no grupo.
     * @param enabled - `true` fecha o grupo para membros comuns
     */
    setChatAnnounce(chat: Chat, enabled: boolean): Promise<void>;
    /**
     * Define se só administradores podem editar nome, descrição e foto do grupo.
     */
    setChatLocked(chat: Chat, enabled: boolean): Promise<void>;
    /**
     * Ativa ou desativa mensagens temporárias.
     * @param seconds - 0 desativa; valores comuns: 86400 (24 h), 604800 (7 dias), 7776000 (90 dias)
     */
    setChatEphemeral(chat: Chat, seconds: number): Promise<void>;
    /**
     * Define se qualquer membro pode adicionar participantes.
     */
    setChatMemberAddMode(chat: Chat, allMembers: boolean): Promise<void>;
    /**
     * Define se a entrada no grupo exige aprovação de um administrador.
     */
    setChatJoinApproval(chat: Chat, enabled: boolean): Promise<void>;
    /** Lista os pedidos de entrada pendentes num grupo. */
    getChatJoinRequests(chat: Chat): Promise<WAJoinRequest[]>;
    /**
     * Aprova ou recusa pedidos de entrada.
     * @returns IDs processados com sucesso
     */
    updateChatJoinRequests(chat: Chat, users: User[], action: 'approve' | 'reject'): Promise<string[]>;
    /** Consulta os dados de um grupo pelo código de convite, sem entrar nele. */
    getChatInviteInfo(code: string): Promise<Chat | null>;
    rejectCall(call: Call): Promise<void>;
    getUserName(user: User): Promise<string>;
    setUserName(user: User, name: string): Promise<void>;
    getUserDescription(user: User): Promise<string>;
    setUserDescription(user: User, description: string): Promise<void>;
    getUserProfile(user: User, lowQuality?: boolean): Promise<Buffer>;
    getUserProfileUrl(user: User, lowQuality?: boolean): Promise<any>;
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
    /** Lista os usuários bloqueados (IDs canônicos). */
    getBlockedUsers(): Promise<string[]>;
    /**
     * Passa a receber eventos `presence` (digitando, online...) deste chat.
     */
    subscribePresence(chat: Chat): Promise<void>;
    getBotName(): Promise<string>;
    setBotName(name: string): Promise<void>;
    getBotDescription(): Promise<string>;
    setBotDescription(description: string): Promise<void>;
    getBotProfile(lowQuality?: boolean): Promise<Buffer>;
    getBotProfileUrl(lowQuality?: boolean): Promise<any>;
    setBotProfile(image: Buffer): Promise<void>;
    /**
     * Chave da mensagem no WhatsApp.
     * Usa a chave original recebida (preserva LID/PN exatamente como o WhatsApp enviou);
     * sem ela, monta a chave a partir dos IDs canônicos.
     */
    getMessageKey(message: Message): Promise<proto.IMessageKey | null>;
    readMessage(message: Message): Promise<void>;
    removeMessage(message: Message): Promise<void>;
    deleteMessage(message: Message): Promise<void>;
    /**
     * Fixa ou desafixa uma mensagem no chat.
     * @param duration - Tempo de fixação (24 h, 7 dias ou 30 dias). Use 0 para desafixar.
     */
    pinMessage(message: Message, duration?: WAPinDuration | 0): Promise<void>;
    /** Marca ou desmarca uma mensagem com estrela. */
    starMessage(message: Message, star?: boolean): Promise<void>;
    /**
     * Encaminha uma mensagem recebida ou enviada (precisa estar no cache de mensagens).
     */
    forwardMessage(chat: Chat, message: Message): Promise<Message>;
    addReaction(message: ReactionMessage): Promise<void>;
    removeReaction(message: ReactionMessage): Promise<void>;
    editMessage(message: Message): Promise<void>;
    /**
   * Envia mensagem interativa usando baileys_helper
   * @param jid - ID do chat (deve estar normalizado)
   * @param content - Conteúdo da mensagem interativa
   */
    sendInteractive(jid: string, content: {
        text?: string;
        title?: string;
        footer?: string;
        interactiveButtons: Array<{
            name: string;
            buttonParamsJson: string;
        }>;
    }): Promise<any>;
    send(content: Message): Promise<Message>;
    addMessageCache(id: string): void;
    downloadStreamMessage(media: Media): Promise<Buffer>;
    experimentalDownloadMediaMessage(media: Media, maxRetryCount?: number): Promise<Buffer>;
    download(message: proto.IWebMessageInfo, type?: 'buffer' | 'stream', options?: any, ctx?: any): Promise<any>;
    onExists(id: string): Promise<{
        exists: boolean;
        id: string;
    }>;
    updateMediaMessage(message: proto.IWebMessageInfo): Promise<proto.IWebMessageInfo>;
    groupAcceptInvite(code: string): Promise<string>;
    private requireZapo;
    pinChat(chat: Chat | string, pinned?: boolean): Promise<void>;
    muteChat(chat: Chat | string, muted?: boolean, durationMs?: number): Promise<void>;
    archiveChat(chat: Chat | string, archived?: boolean): Promise<void>;
    markChatAsRead(chat: Chat | string, read?: boolean): Promise<void>;
    clearChat(chat: Chat | string): Promise<void>;
    deleteChat(chat: Chat | string): Promise<void>;
    lockChat(chat: Chat | string, locked?: boolean): Promise<void>;
    deleteMessageForMe(message: Message): Promise<void>;
    sendRaw(chatId: string, payload: any, options?: any): Promise<any>;
    private resolveStatusRecipients;
    sendStatusText(text: string, recipients?: string[]): Promise<any>;
    sendStatusMedia(media: string | Buffer, type?: 'image' | 'video' | 'audio', caption?: string, recipients?: string[]): Promise<any>;
    revokeStatus(messageId: string, recipients?: string[]): Promise<any>;
    getNewsletterInfo(jid: string): Promise<any>;
    followNewsletter(jid: string): Promise<void>;
    unfollowNewsletter(jid: string): Promise<void>;
    muteNewsletter(jid: string, muted?: boolean): Promise<void>;
    sendNewsletterMessage(jid: string, content: any): Promise<any>;
    createCommunity(subject: string, description?: string): Promise<any>;
    deactivateCommunity(communityJid: string): Promise<void>;
    linkCommunitySubGroups(communityJid: string, subGroupJids: string[]): Promise<any>;
    unlinkCommunitySubGroups(communityJid: string, subGroupJids: string[], removeOrphanedMembers?: boolean): Promise<any>;
    getCommunitySubGroups(communityJid: string): Promise<any>;
    setGroupMemberLinkMode(chat: Chat | string, allMembers: boolean): Promise<void>;
    setGroupHistoryShareMode(chat: Chat | string, shareHistory: boolean): Promise<void>;
    getPrivacySettings(): Promise<any>;
    setPrivacySetting(setting: any, value: any): Promise<any>;
    getDisappearingMode(jid: string): Promise<any>;
    setDefaultDisappearingMode(seconds: number): Promise<void>;
    resolveUsername(username: string): Promise<any>;
    getBusinessProfile(jid: string): Promise<any>;
    editBusinessProfile(input: any): Promise<void>;
    setBroadcastList(id: string, name: string, recipients: string[]): Promise<void>;
    removeBroadcastList(id: string): Promise<void>;
    sendBroadcastList(listJid: string, content: any, recipients: string[]): Promise<any>;
    static Browser(plataform?: string, browser?: string, version?: string): [string, string, string];
}
