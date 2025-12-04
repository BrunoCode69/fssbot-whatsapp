"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const baileys_1 = __importStar(require("baileys"));
const baileys_helper_1 = require("baileys_helper");
const node_cache_1 = __importDefault(require("node-cache"));
const stream_1 = __importDefault(require("stream"));
const pino_1 = __importDefault(require("pino"));
const long_1 = __importDefault(require("long"));
const WAConfigs_1 = require("../configs/WAConfigs");
const messages_1 = require("../messages");
const Generic_1 = require("../utils/Generic");
const Auth_1 = require("./Auth");
const Message_1 = require("../messages/Message");
const ConvertToWAMessage_1 = __importDefault(require("./ConvertToWAMessage"));
const makeInMemoryStore_1 = __importDefault(require("./makeInMemoryStore"));
const ConvertWAMessage_1 = __importDefault(require("./ConvertWAMessage"));
const ConfigWAEvents_1 = __importDefault(require("./ConfigWAEvents"));
const ID_1 = require("./ID");
const BotStatus_1 = require("../bot/BotStatus");
const ChatType_1 = __importDefault(require("../modules/chat/ChatType"));
const BotEvents_1 = __importDefault(require("../bot/BotEvents"));
const WAStatus_1 = require("./WAStatus");
const User_1 = __importDefault(require("../modules/user/User"));
const Chat_1 = __importDefault(require("../modules/chat/Chat"));
class WhatsAppBot extends BotEvents_1.default {
    constructor(config) {
        super();
        //@ts-ignore
        this.sock = {};
        this.auth = new Auth_1.MultiFileAuthState('./session', undefined, false);
        this.messagesCached = [];
        this.msgRetryCountercache = new node_cache_1.default({
            stdTTL: baileys_1.DEFAULT_CACHE_TTLS.MSG_RETRY,
            useClones: false,
        });
        this.saveCreds = (creds) => new Promise((res) => res);
        this.connectionListeners = [];
        this.DisconnectReason = baileys_1.DisconnectReason;
        this.logger = (0, pino_1.default)({ level: 'silent' });
        this.id = '';
        this.status = BotStatus_1.BotStatus.Offline;
        this.phoneNumber = '';
        this.name = '';
        this.profileUrl = '';
        this.lastConnectionUpdateDate = Date.now();
        this.checkConnectionInterval = null;
        this.configEvents = new ConfigWAEvents_1.default(this);
        const store = (0, makeInMemoryStore_1.default)({ logger: this.logger });
        this.store = store;
        const waBot = this;
        this.config = {
            ...baileys_1.DEFAULT_CONNECTION_CONFIG,
            //printQRInTerminal: true,
            logger: this.logger,
            qrTimeout: 60000,
            defaultQueryTimeoutMs: 10000,
            retryRequestDelayMs: 500,
            maxMsgRetryCount: 5,
            readAllFailedMessages: false,
            msgRetryCounterCache: this.msgRetryCountercache,
            autoRestartInterval: 1000 * 60 * 30,
            useExperimentalServers: false,
            autoSyncHistory: false,
            autoLoadContactInfo: false,
            autoLoadGroupInfo: false,
            shouldIgnoreJid: () => false,
            async patchMessageBeforeSending(msg) {
                var _a, _b, _c, _d;
                if (((_c = (_b = (_a = msg.deviceSentMessage) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.listMessage) === null || _c === void 0 ? void 0 : _c.listType) ==
                    baileys_1.proto.Message.ListMessage.ListType.PRODUCT_LIST) {
                    msg = JSON.parse(JSON.stringify(msg));
                    msg.deviceSentMessage.message.listMessage.listType =
                        baileys_1.proto.Message.ListMessage.ListType.SINGLE_SELECT;
                }
                if (((_d = msg.listMessage) === null || _d === void 0 ? void 0 : _d.listType) ==
                    baileys_1.proto.Message.ListMessage.ListType.PRODUCT_LIST) {
                    msg = JSON.parse(JSON.stringify(msg));
                    msg.listMessage.listType =
                        baileys_1.proto.Message.ListMessage.ListType.SINGLE_SELECT;
                }
                return msg;
            },
            async getMessage(key) {
                var _a;
                return (((_a = (await waBot.store.loadMessage((0, ID_1.fixID)(key.remoteJid), key.id))) === null || _a === void 0 ? void 0 : _a.message) || undefined);
            },
            ...config,
        };
        delete this.config.auth;
    }
    // ============================================
    // MÉTODOS AUXILIARES PARA NORMALIZAR JIDs
    // ============================================
    /**
     * Normaliza um JID para o formato correto do Baileys 7.x
     * Usa o jidNormalizedUser oficial do Baileys
     * @param jid - JID a ser normalizado
     * @returns JID normalizado ou undefined se inválido
     */
    safeNormalizeJid(jid) {
        var _a, _b;
        if (!jid || typeof jid !== 'string')
            return undefined;
        try {
            // Se já tem @, usa jidNormalizedUser
            if (jid.includes('@')) {
                return (0, baileys_1.jidNormalizedUser)(jid);
            }
            // Se é só número, adiciona @s.whatsapp.net primeiro
            if (/^\d+$/.test(jid)) {
                return (0, baileys_1.jidNormalizedUser)(`${jid}@s.whatsapp.net`);
            }
            return undefined;
        }
        catch (error) {
            (_b = (_a = this.logger) === null || _a === void 0 ? void 0 : _a.error) === null || _b === void 0 ? void 0 : _b.call(_a, 'Error normalizing JID:', jid, error);
            return undefined;
        }
    }
    /**
     * Normaliza um array de JIDs
     */
    safeNormalizeJids(jids) {
        return jids
            .map((jid) => this.safeNormalizeJid(jid))
            .filter((jid) => jid !== undefined);
    }
    // ============================================
    // MÉTODOS DE CONEXÃO
    // ============================================
    async connect(auth) {
        var _a, _b, _c;
        if (!auth || typeof auth == 'string') {
            this.auth = new Auth_1.MultiFileAuthState(`${auth || './session'}`);
        }
        else {
            this.auth = auth;
        }
        if (!this.auth.botPhoneNumber) {
            await this.internalConnect({ browser: WhatsAppBot.Browser() });
        }
        else {
            await this.internalConnect({
                browser: ['Chrome (linux)', 'Falcão SSH BOT', '22.5.0'],
            });
            if (!((_c = (_b = (_a = this.sock) === null || _a === void 0 ? void 0 : _a.authState) === null || _b === void 0 ? void 0 : _b.creds) === null || _c === void 0 ? void 0 : _c.registered)) {
                await this.sock.waitForConnectionUpdate((update) => !!update.qr);
                const code = await this.sock.requestPairingCode(this.auth.botPhoneNumber);
                this.emit('code', code);
            }
        }
        await this.awaitConnectionState('open');
    }
    async internalConnect(additionalOptions = {}) {
        return new Promise(async (resolve, reject) => {
            try {
                const { state, saveCreds } = await (0, Auth_1.getBaileysAuth)(this.auth);
                this.saveCreds = saveCreds;
                this.sock = (0, baileys_1.default)({
                    auth: {
                        creds: state.creds,
                        keys: (0, baileys_1.makeCacheableSignalKeyStore)(state.keys, this.config.logger || this.logger),
                    },
                    ...additionalOptions,
                    ...this.config,
                });
                this.store.bind(this.sock.ev);
                this.configEvents.configureAll();
                resolve();
                await this.awaitConnectionState('open');
                this.sock.ev.on('creds.update', saveCreds);
            }
            catch (err) {
                this.ev.emit('error', err);
            }
        });
    }
    async reconnect(stopEvents = false, showOpen) {
        if (stopEvents) {
            this.eventsIsStoped = true;
            let state = this.status == BotStatus_1.BotStatus.Online ? 'close' : 'connecting';
            let status = baileys_1.DisconnectReason.connectionClosed;
            let retryCount = 0;
            this.connectionListeners.push((update) => {
                var _a, _b, _c, _d, _e, _f, _g, _h;
                if (!update.connection)
                    return false;
                if (retryCount >= 3) {
                    this.eventsIsStoped = false;
                    return true;
                }
                if (update.connection != state) {
                    if (update.connection == 'close') {
                        state = 'connecting';
                        status =
                            ((_c = (_b = (_a = update.lastDisconnect) === null || _a === void 0 ? void 0 : _a.error) === null || _b === void 0 ? void 0 : _b.output) === null || _c === void 0 ? void 0 : _c.statusCode) ||
                                ((_d = update.lastDisconnect) === null || _d === void 0 ? void 0 : _d.error) ||
                                baileys_1.DisconnectReason.connectionClosed;
                        retryCount++;
                    }
                    else {
                        this.eventsIsStoped = false;
                        if (state == 'connecting') {
                            this.emit('close', { reason: status });
                        }
                        else if (state == 'open') {
                            this.emit('close', { reason: status });
                            this.emit('connecting', {});
                        }
                    }
                    return true;
                }
                if (state == 'close') {
                    state = 'connecting';
                    status =
                        ((_g = (_f = (_e = update.lastDisconnect) === null || _e === void 0 ? void 0 : _e.error) === null || _f === void 0 ? void 0 : _f.output) === null || _g === void 0 ? void 0 : _g.statusCode) ||
                            ((_h = update.lastDisconnect) === null || _h === void 0 ? void 0 : _h.error) ||
                            baileys_1.DisconnectReason.connectionClosed;
                }
                else if (state == 'connecting') {
                    state = 'open';
                }
                else if (state == 'open' && showOpen) {
                    this.eventsIsStoped = !showOpen;
                    return true;
                }
                return false;
            });
        }
        await this.stop();
        this.emit('reconnecting', {});
        await this.internalConnect();
    }
    async stop(reason = 402) {
        var _a;
        try {
            this.status = BotStatus_1.BotStatus.Offline;
            (_a = this.sock) === null || _a === void 0 ? void 0 : _a.end(reason);
        }
        catch (err) {
            this.emit('error', err);
        }
    }
    async logout() {
        var _a;
        await ((_a = this.sock) === null || _a === void 0 ? void 0 : _a.logout());
    }
    async awaitConnectionState(connection) {
        return new Promise((res) => {
            this.connectionListeners.push((update) => {
                if (update.connection != connection)
                    return false;
                res(update);
                return true;
            });
        });
    }
    // ============================================
    // MÉTODOS DE LEITURA
    // ============================================
    async readChat(chat, metadata, updateMetadata = true) {
        try {
            // Normaliza o chat.id primeiro
            const normalizedId = this.safeNormalizeJid(chat.id);
            if (!normalizedId)
                return;
            chat.id = normalizedId;
            chat.type = (0, baileys_1.isJidGroup)(normalizedId) ? ChatType_1.default.Group : ChatType_1.default.PV;
            if (chat.type == ChatType_1.default.Group) {
                if (updateMetadata) {
                    chat.profileUrl =
                        (await this.getChatProfileUrl(new Chat_1.default(chat.id))) || undefined;
                    if (!metadata) {
                        try {
                            metadata = await this.sock.groupMetadata(chat.id);
                        }
                        catch (_a) { }
                    }
                    else if (!metadata.participants) {
                        try {
                            metadata = {
                                ...metadata,
                                ...(await this.sock.groupMetadata(chat.id)),
                            };
                        }
                        catch (_b) { }
                        if (metadata.participant) {
                            metadata.participants = [
                                ...(metadata.participants || []),
                                ...metadata.participant.map((p) => {
                                    return {
                                        id: p.userJid,
                                        isSuperAdmin: p.rank == baileys_1.proto.GroupParticipant.Rank.SUPERADMIN,
                                        isAdmin: p.rank == baileys_1.proto.GroupParticipant.Rank.ADMIN,
                                    };
                                }),
                            ];
                        }
                    }
                }
                if (metadata === null || metadata === void 0 ? void 0 : metadata.participants) {
                    chat.users = [];
                    chat.admins = [];
                    for (const p of metadata.participants) {
                        const normalizedParticipantId = this.safeNormalizeJid(p.id);
                        if (!normalizedParticipantId)
                            continue;
                        chat.users.push(normalizedParticipantId);
                        if (p.admin == 'admin' || p.isAdmin) {
                            chat.admins.push(normalizedParticipantId);
                        }
                        else if (p.isSuperAdmin) {
                            chat.leader = normalizedParticipantId;
                            chat.admins.push(normalizedParticipantId);
                        }
                    }
                }
                if (metadata === null || metadata === void 0 ? void 0 : metadata.subjectOwner) {
                    const normalizedOwner = this.safeNormalizeJid(metadata.subjectOwner);
                    if (normalizedOwner) {
                        chat.leader = normalizedOwner;
                    }
                }
            }
            if ((metadata === null || metadata === void 0 ? void 0 : metadata.subject) || (metadata === null || metadata === void 0 ? void 0 : metadata.name)) {
                chat.name = metadata.subject || metadata.name || undefined;
            }
            if ((metadata === null || metadata === void 0 ? void 0 : metadata.desc) || (metadata === null || metadata === void 0 ? void 0 : metadata.description)) {
                chat.description = metadata.desc || metadata.description || undefined;
            }
            if (metadata === null || metadata === void 0 ? void 0 : metadata.unreadCount) {
                chat.unreadCount = metadata.unreadCount || undefined;
            }
            if (metadata === null || metadata === void 0 ? void 0 : metadata.conversationTimestamp) {
                if (long_1.default.isLong(metadata.conversationTimestamp)) {
                    chat.timestamp = metadata.conversationTimestamp.toNumber() * 1000;
                }
                else {
                    chat.timestamp = Number(metadata.conversationTimestamp) * 1000;
                }
            }
            await this.updateChat({ id: chat.id, ...chat });
        }
        catch (_c) { }
    }
    async readUser(user, metadata) {
        try {
            // Normaliza o user.id primeiro
            const normalizedId = this.safeNormalizeJid(user.id);
            if (!normalizedId)
                return;
            user.id = normalizedId;
            if (metadata === null || metadata === void 0 ? void 0 : metadata.imgUrl) {
                user.profileUrl = await this.getUserProfileUrl(new User_1.default(user.id));
            }
            else {
                const userData = await this.getUser(new User_1.default(user.id || ''));
                if (userData == null || !userData.profileUrl) {
                    user.profileUrl = await this.getUserProfileUrl(new User_1.default(user.id));
                }
            }
            if ((metadata === null || metadata === void 0 ? void 0 : metadata.notify) || (metadata === null || metadata === void 0 ? void 0 : metadata.verifiedName)) {
                user.name = (metadata === null || metadata === void 0 ? void 0 : metadata.notify) || (metadata === null || metadata === void 0 ? void 0 : metadata.verifiedName);
            }
            if (metadata === null || metadata === void 0 ? void 0 : metadata.name) {
                user.savedName = metadata.name;
            }
            user.name = user.name || user.savedName;
            await this.updateUser({ id: user.id || '', ...user });
        }
        catch (err) {
            this.emit('error', err);
        }
    }
    // ============================================
    // MÉTODOS DE POLL
    // ============================================
    async getPollMessage(pollMessageId) {
        const pollMessage = await this.auth.get(`polls-${pollMessageId}`);
        if (!pollMessage || !messages_1.PollMessage.isValid(pollMessage))
            return messages_1.PollMessage.fromJSON({ id: pollMessageId });
        if (pollMessage.type == Message_1.MessageType.PollUpdate) {
            return messages_1.PollUpdateMessage.fromJSON(pollMessage);
        }
        return messages_1.PollMessage.fromJSON(pollMessage);
    }
    async savePollMessage(pollMessage) {
        await this.auth.set(`polls-${pollMessage.id}`, pollMessage.toJSON());
    }
    // ============================================
    // GROUP PARTICIPANTS
    // ============================================
    async groupParticipantsUpdate(action, chatId, userId, fromId) {
        // Normaliza todos os IDs
        const normalizedChatId = this.safeNormalizeJid(chatId);
        const normalizedUserId = this.safeNormalizeJid(userId);
        const normalizedFromId = this.safeNormalizeJid(fromId);
        if (!normalizedChatId || !(0, baileys_1.isJidGroup)(normalizedChatId))
            return;
        if (!normalizedUserId || !normalizedFromId)
            return;
        const event = action == 'join' ? 'add' : action == 'leave' ? 'remove' : action;
        let chat = await this.getChat(new Chat_1.default(normalizedChatId));
        if (!chat) {
            if (!this.config.autoLoadGroupInfo)
                return;
            chat = Chat_1.default.fromJSON({
                id: normalizedChatId,
                phoneNumber: (0, ID_1.getPhoneNumber)(normalizedChatId),
                type: ChatType_1.default.Group,
            });
        }
        const fromUser = (await this.getUser(new User_1.default(normalizedFromId))) ||
            User_1.default.fromJSON({ id: normalizedFromId, phoneNumber: (0, ID_1.getPhoneNumber)(normalizedFromId) });
        const user = (await this.getUser(new User_1.default(normalizedUserId))) ||
            User_1.default.fromJSON({ id: normalizedUserId, phoneNumber: (0, ID_1.getPhoneNumber)(normalizedUserId) });
        let users = chat.users || [];
        const admins = chat.admins || [];
        if (event == 'add')
            users.push(user.id);
        if (event == 'remove')
            users = users.filter((u) => u != user.id);
        if (event == 'demote')
            chat.admins = admins.filter((admin) => admin != user.id);
        if (event == 'promote')
            admins.push(user.id);
        chat.users = users;
        chat.admins = admins;
        if (user.id == this.id) {
            if (event == 'remove')
                await this.removeChat(chat);
            if (event == 'add')
                await this.updateChat(chat);
        }
        else {
            await this.updateChat(chat);
        }
        this.ev.emit('user', { action, event, user, fromUser, chat });
    }
    //! ********************************* CHAT *********************************
    async getChatName(chat) {
        var _a;
        return ((_a = (await this.getChat(chat))) === null || _a === void 0 ? void 0 : _a.name) || '';
    }
    async setChatName(chat, name) {
        const normalizedId = this.safeNormalizeJid(chat.id);
        if (!normalizedId || !(0, baileys_1.isJidGroup)(normalizedId))
            return;
        const admins = await this.getChatAdmins(chat);
        if (admins.length && !admins.includes(this.id))
            return;
        await this.sock.groupUpdateSubject(normalizedId, name);
    }
    async getChatDescription(chat) {
        var _a;
        return ((_a = (await this.getChat(chat))) === null || _a === void 0 ? void 0 : _a.description) || '';
    }
    async setChatDescription(chat, description) {
        const normalizedId = this.safeNormalizeJid(chat.id);
        if (!normalizedId || !(0, baileys_1.isJidGroup)(normalizedId))
            return;
        const admins = await this.getChatAdmins(chat);
        if (admins.length && !admins.includes(this.id))
            return;
        await this.sock.groupUpdateDescription(normalizedId, description);
    }
    async getChatProfile(chat, lowQuality) {
        const uri = await this.getChatProfileUrl(chat, lowQuality);
        return await (0, Generic_1.getImageURL)(uri);
    }
    async getChatProfileUrl(chat, lowQuality) {
        try {
            const normalizedId = this.safeNormalizeJid(chat.id);
            if (!normalizedId)
                return '';
            return ((await this.sock.profilePictureUrl(normalizedId, lowQuality ? 'preview' : 'image')) || '');
        }
        catch (_a) {
            return '';
        }
    }
    async setChatProfile(chat, image) {
        const normalizedId = this.safeNormalizeJid(chat.id);
        if (!normalizedId || !(0, baileys_1.isJidGroup)(normalizedId))
            return;
        const admins = await this.getChatAdmins(chat);
        if (admins.length && !admins.includes(this.id))
            return;
        await this.sock.updateProfilePicture(normalizedId, image);
    }
    async updateChat(chat) {
        const normalizedId = this.safeNormalizeJid(chat.id);
        if (!normalizedId)
            return;
        chat.id = normalizedId;
        const chatData = await this.getChat(new Chat_1.default(chat.id));
        if (chatData != null) {
            chat = Object.keys(chat).reduce((data, key) => {
                if (chat[key] == undefined || chat[key] == null)
                    return data;
                if ((0, Generic_1.verifyIsEquals)(chat[key], chatData[key]))
                    return data;
                return { ...data, [key]: chat[key] };
            }, { id: chat.id });
            if (Object.keys(chat).length < 2)
                return;
        }
        const newChat = Chat_1.default.fromJSON({ ...(chatData || {}), ...chat });
        newChat.type = (0, baileys_1.isJidGroup)(chat.id) ? ChatType_1.default.Group : ChatType_1.default.PV;
        newChat.phoneNumber = newChat.phoneNumber || (0, ID_1.getPhoneNumber)(chat.id);
        await this.auth.set(`chats-${chat.id}`, newChat.toJSON());
        this.ev.emit('chat', { action: chatData != null ? 'update' : 'add', chat });
    }
    async removeChat(chat) {
        const normalizedId = this.safeNormalizeJid(chat.id);
        if (!normalizedId)
            return;
        await this.auth.remove(`chats-${normalizedId}`);
        this.ev.emit('chat', { action: 'remove', chat });
    }
    async getChat(chat) {
        const normalizedId = this.safeNormalizeJid(chat.id);
        if (!normalizedId)
            return null;
        const chatData = await this.auth.get(`chats-${normalizedId}`);
        if (!chatData)
            return null;
        if (!chat.name || !chat.profileUrl) {
            const user = await this.getUser(new User_1.default(normalizedId));
            if (user != null) {
                return Chat_1.default.fromJSON({ ...chat, ...user });
            }
        }
        return Chat_1.default.fromJSON(chatData);
    }
    async getChats() {
        return (await this.auth.listAll('chats-')).map((id) => id.replace('chats-', ''));
    }
    async setChats(chats) {
        await Promise.all(chats.map(async (chat) => await this.updateChat(chat)));
    }
    async getChatUsers(chat) {
        var _a;
        return ((_a = (await this.getChat(chat))) === null || _a === void 0 ? void 0 : _a.users) || [];
    }
    async getChatAdmins(chat) {
        var _a, _b;
        const chatReaded = await this.getChat(chat);
        if (!chatReaded)
            return [];
        if ((_a = chatReaded.admins) === null || _a === void 0 ? void 0 : _a.length) {
            return chatReaded.admins || [];
        }
        if (chatReaded.type !== ChatType_1.default.Group)
            return [];
        await this.readChat(chat);
        return ((_b = (await this.getChat(chat))) === null || _b === void 0 ? void 0 : _b.admins) || [];
    }
    async getChatLeader(chat) {
        var _a;
        return ((_a = (await this.getChat(chat))) === null || _a === void 0 ? void 0 : _a.leader) || '';
    }
    async addUserInChat(chat, user) {
        const normalizedChatId = this.safeNormalizeJid(chat.id);
        const normalizedUserId = this.safeNormalizeJid(user.id);
        if (!normalizedChatId || !normalizedUserId)
            return;
        if (!(0, baileys_1.isJidGroup)(normalizedChatId))
            return;
        const admins = await this.getChatAdmins(chat);
        if (admins.length && !admins.includes(this.id))
            return;
        await this.sock.groupParticipantsUpdate(normalizedChatId, [normalizedUserId], 'add');
    }
    async removeUserInChat(chat, user) {
        const normalizedChatId = this.safeNormalizeJid(chat.id);
        const normalizedUserId = this.safeNormalizeJid(user.id);
        if (!normalizedChatId || !normalizedUserId)
            return;
        if (!(0, baileys_1.isJidGroup)(normalizedChatId))
            return;
        const admins = await this.getChatAdmins(chat);
        if (admins.length && !admins.includes(this.id))
            return;
        await this.sock.groupParticipantsUpdate(normalizedChatId, [normalizedUserId], 'remove');
    }
    async promoteUserInChat(chat, user) {
        const normalizedChatId = this.safeNormalizeJid(chat.id);
        const normalizedUserId = this.safeNormalizeJid(user.id);
        if (!normalizedChatId || !normalizedUserId)
            return;
        if (!(0, baileys_1.isJidGroup)(normalizedChatId))
            return;
        const admins = await this.getChatAdmins(chat);
        if (admins.length && !admins.includes(this.id))
            return;
        await this.sock.groupParticipantsUpdate(normalizedChatId, [normalizedUserId], 'promote');
    }
    async demoteUserInChat(chat, user) {
        const normalizedChatId = this.safeNormalizeJid(chat.id);
        const normalizedUserId = this.safeNormalizeJid(user.id);
        if (!normalizedChatId || !normalizedUserId)
            return;
        if (!(0, baileys_1.isJidGroup)(normalizedChatId))
            return;
        const admins = await this.getChatAdmins(chat);
        if (admins.length && !admins.includes(this.id))
            return;
        await this.sock.groupParticipantsUpdate(normalizedChatId, [normalizedUserId], 'demote');
    }
    async changeChatStatus(chat, status) {
        var _a, _b, _c, _d;
        const normalizedId = this.safeNormalizeJid(chat.id);
        if (!normalizedId) {
            (_b = (_a = this.logger) === null || _a === void 0 ? void 0 : _a.error) === null || _b === void 0 ? void 0 : _b.call(_a, 'Invalid chat.id for changeChatStatus:', chat.id);
            return;
        }
        try {
            await this.sock.sendPresenceUpdate(WAStatus_1.WAStatus[status] || 'available', normalizedId);
        }
        catch (error) {
            (_d = (_c = this.logger) === null || _c === void 0 ? void 0 : _c.error) === null || _d === void 0 ? void 0 : _d.call(_c, 'Error updating chat status:', error);
        }
    }
    async createChat(chat) {
        await this.sock.groupCreate(chat.name || '', [this.id]);
    }
    async leaveChat(chat) {
        const normalizedId = this.safeNormalizeJid(chat.id);
        if (!normalizedId || !(0, baileys_1.isJidGroup)(normalizedId))
            return;
        if ((await this.getChat(chat)) == null)
            return;
        await this.sock.groupLeave(normalizedId);
        await this.removeChat(chat);
    }
    async joinChat(code) {
        await this.sock.groupAcceptInvite(code.replace('https://chat.whatsapp.com/', ''));
    }
    async getChatInvite(chat) {
        const normalizedId = this.safeNormalizeJid(chat.id);
        if (!normalizedId || !(0, baileys_1.isJidGroup)(normalizedId))
            return '';
        const admins = await this.getChatAdmins(chat);
        if (admins.length && !admins.includes(this.id))
            return '';
        return (await this.sock.groupInviteCode(normalizedId)) || '';
    }
    async revokeChatInvite(chat) {
        const normalizedId = this.safeNormalizeJid(chat.id);
        if (!normalizedId || !(0, baileys_1.isJidGroup)(normalizedId))
            return '';
        const admins = await this.getChatAdmins(chat);
        if (admins.length && !admins.includes(this.id))
            return '';
        return (await this.sock.groupRevokeInvite(normalizedId)) || '';
    }
    async rejectCall(call) {
        const normalizedChatId = this.safeNormalizeJid(call.chat.id);
        if (!normalizedChatId)
            return;
        await this.sock.rejectCall(call.id, normalizedChatId);
    }
    //! ********************************* USER *********************************
    async getUserName(user) {
        var _a;
        return ((_a = (await this.getUser(user))) === null || _a === void 0 ? void 0 : _a.name) || '';
    }
    async setUserName(user, name) {
        if (user.id != this.id)
            return;
        await this.setBotName(name);
    }
    async getUserDescription(user) {
        var _a;
        const normalizedId = this.safeNormalizeJid(user.id);
        if (!normalizedId)
            return '';
        return ((_a = (await this.sock.fetchStatus(normalizedId))) === null || _a === void 0 ? void 0 : _a.status) || '';
    }
    async setUserDescription(user, description) {
        if (user.id != this.id)
            return;
        await this.setBotDescription(description);
    }
    async getUserProfile(user, lowQuality) {
        const uri = await this.getUserProfileUrl(user, lowQuality);
        return await (0, Generic_1.getImageURL)(uri);
    }
    async getUserProfileUrl(user, lowQuality) {
        try {
            const normalizedId = this.safeNormalizeJid(user.id);
            if (!normalizedId)
                return '';
            return ((await this.sock.profilePictureUrl(normalizedId, lowQuality ? 'preview' : 'image')) || '');
        }
        catch (_a) {
            return '';
        }
    }
    async setUserProfile(user, image) {
        if (user.id != this.id)
            return;
        await this.setBotProfile(image);
    }
    async getUser(user) {
        const normalizedId = this.safeNormalizeJid(user.id);
        if (!normalizedId)
            return null;
        const userData = await this.auth.get(`users-${normalizedId}`);
        if (!userData)
            return null;
        return User_1.default.fromJSON(userData);
    }
    async getUsers() {
        return (await this.auth.listAll('users-')).map((id) => id.replace('users-', ''));
    }
    async updateUser(user) {
        const normalizedId = this.safeNormalizeJid(user.id);
        if (!normalizedId)
            return;
        user.id = normalizedId;
        const userData = await this.getUser(new User_1.default(user.id));
        if (userData != null) {
            user = Object.keys(user).reduce((data, key) => {
                if (user[key] == undefined || user[key] == null)
                    return data;
                if ((0, Generic_1.verifyIsEquals)(user[key], userData[key]))
                    return data;
                return { ...data, [key]: user[key] };
            }, { id: user.id });
            if (Object.keys(user).length < 2)
                return;
        }
        const newUser = User_1.default.fromJSON({ ...(userData || {}), ...user });
        newUser.phoneNumber = newUser.phoneNumber || (0, ID_1.getPhoneNumber)(user.id);
        await this.auth.set(`users-${user.id}`, newUser.toJSON());
    }
    async setUsers(users) {
        await Promise.all(users.map(async (user) => await this.updateUser(user)));
    }
    async removeUser(user) {
        const normalizedId = this.safeNormalizeJid(user.id);
        if (!normalizedId)
            return;
        await this.auth.remove(`users-${normalizedId}`);
    }
    async blockUser(user) {
        const normalizedId = this.safeNormalizeJid(user.id);
        if (!normalizedId || normalizedId == this.id)
            return;
        await this.sock.updateBlockStatus(normalizedId, 'block');
    }
    async unblockUser(user) {
        const normalizedId = this.safeNormalizeJid(user.id);
        if (!normalizedId || normalizedId == this.id)
            return;
        await this.sock.updateBlockStatus(normalizedId, 'unblock');
    }
    //! ******************************** BOT ********************************
    async getBotName() {
        return await this.getUserName(new User_1.default(this.id));
    }
    async setBotName(name) {
        await this.sock.updateProfileName(name);
    }
    async getBotDescription() {
        return await this.getUserDescription(new User_1.default(this.id));
    }
    async setBotDescription(description) {
        await this.sock.updateProfileStatus(description);
    }
    async getBotProfile(lowQuality) {
        return await this.getUserProfile(new User_1.default(this.id), lowQuality);
    }
    async getBotProfileUrl(lowQuality) {
        return (await this.getUserProfileUrl(new User_1.default(this.id), lowQuality)) || '';
    }
    async setBotProfile(image) {
        await this.sock.updateProfilePicture(this.id, image);
    }
    //! ******************************* MESSAGE *******************************
    async readMessage(message) {
        const normalizedChatId = this.safeNormalizeJid(message.chat.id);
        const normalizedUserId = this.safeNormalizeJid(message.user.id);
        if (!normalizedChatId || !normalizedUserId)
            return;
        const key = {
            remoteJid: normalizedChatId,
            id: message.id || '',
            fromMe: message.fromMe || normalizedUserId == this.id,
            participant: (0, baileys_1.isJidGroup)(normalizedChatId)
                ? normalizedUserId || this.id || undefined
                : undefined,
            toJSON: () => key,
        };
        const chat = await this.getChat(message.chat);
        if (chat != null) {
            await this.updateChat({
                id: normalizedChatId,
                unreadCount: (chat.unreadCount || 1) - 1,
            });
        }
        return await this.sock.readMessages([key]);
    }
    async removeMessage(message) {
        const normalizedChatId = this.safeNormalizeJid(message.chat.id);
        const normalizedUserId = this.safeNormalizeJid(message.user.id);
        if (!normalizedChatId || !normalizedUserId)
            return;
        const key = {
            remoteJid: normalizedChatId,
            id: message.id,
            fromMe: message.fromMe || normalizedUserId == this.id,
            participant: (0, baileys_1.isJidGroup)(normalizedChatId)
                ? normalizedUserId || this.id
                : undefined,
        };
        await this.sock.chatModify({
            deleteForMe: {
                deleteMedia: false,
                key,
                timestamp: Number(message.timestamp || Date.now()),
            },
        }, normalizedChatId);
    }
    async deleteMessage(message) {
        const normalizedChatId = this.safeNormalizeJid(message.chat.id);
        const normalizedUserId = this.safeNormalizeJid(message.user.id);
        if (!normalizedChatId || !normalizedUserId)
            return;
        const key = {
            remoteJid: normalizedChatId,
            id: message.id,
            fromMe: message.fromMe || normalizedUserId == this.id,
            participant: (0, baileys_1.isJidGroup)(normalizedChatId)
                ? normalizedUserId || this.id
                : undefined,
        };
        if (key.participant && key.participant != this.id) {
            const admins = await this.getChatAdmins(message.chat);
            if (admins.length && !admins.includes(this.id))
                return;
        }
        await this.sock.sendMessage(normalizedChatId, { delete: key });
    }
    async addReaction(message) {
        await this.send(message);
    }
    async removeReaction(message) {
        await this.send(message);
    }
    async editMessage(message) {
        await this.send(message);
    }
    /**
   * Envia mensagem interativa usando baileys_helper
   * @param jid - ID do chat (deve estar normalizado)
   * @param content - Conteúdo da mensagem interativa
   */
    async sendInteractive(jid, content) {
        const normalizedJid = this.safeNormalizeJid(jid);
        if (!normalizedJid) {
            throw new Error(`Invalid JID: ${jid}`);
        }
        return await (0, baileys_helper_1.sendInteractiveMessage)(this.sock, normalizedJid, content);
    }
    async send(content) {
        var _a, _b;
        const waMSG = new ConvertToWAMessage_1.default(this, content);
        await waMSG.refactory(content);
        // Normaliza o chatId antes de enviar
        const normalizedChatId = this.safeNormalizeJid(waMSG.chatId);
        if (!normalizedChatId) {
            throw new Error(`Invalid chat ID: ${waMSG.chatId}`);
        }
        // Se a mensagem usa baileys_helper
        if (waMSG.waMessage.__useBaileysHelper) {
            delete waMSG.waMessage.__useBaileysHelper;
            // Importa dinamicamente o baileys_helper
            await (0, baileys_helper_1.sendInteractiveMessage)(this.sock, normalizedChatId, waMSG.waMessage);
            // Retorna a mensagem original
            return content;
        }
        // Lógica normal de envio
        if (waMSG.isRelay) {
            try {
                await this.sock.relayMessage(normalizedChatId, waMSG.waMessage, {
                    ...waMSG.options,
                });
            }
            catch (err) {
                throw err;
            }
            const msgRes = (0, baileys_1.generateWAMessageFromContent)(normalizedChatId, waMSG.waMessage, { ...waMSG.options, userJid: this.id });
            return await new ConvertWAMessage_1.default(this, msgRes).get();
        }
        const sendedMessage = await this.sock.sendMessage(normalizedChatId, waMSG.waMessage, waMSG.options);
        if (typeof sendedMessage == 'boolean')
            return content;
        const msgRes = (await new ConvertWAMessage_1.default(this, sendedMessage).get()) || content;
        if (messages_1.PollMessage.isValid(msgRes) && messages_1.PollMessage.isValid(content)) {
            msgRes.options = content.options;
            msgRes.secretKey =
                (_b = (_a = sendedMessage === null || sendedMessage === void 0 ? void 0 : sendedMessage.message) === null || _a === void 0 ? void 0 : _a.messageContextInfo) === null || _b === void 0 ? void 0 : _b.messageSecret;
            await this.savePollMessage(msgRes);
        }
        return msgRes;
    }
    addMessageCache(id) {
        this.messagesCached.push(id);
        setTimeout(() => {
            this.messagesCached = this.messagesCached.filter((msgId) => msgId != id);
        }, 1000 * 60);
    }
    async downloadStreamMessage(media) {
        if (this.config.useExperimentalServers) {
            return await this.experimentalDownloadMediaMessage(media);
        }
        const stream = await (0, baileys_1.downloadMediaMessage)(media.stream, 'buffer', {}, {
            logger: this.logger,
            reuploadRequest: (m) => Promise.resolve(m),
        });
        if (stream instanceof stream_1.default.Transform) {
            const buffer = await stream.read();
            return buffer || Buffer.from('');
        }
        return stream;
    }
    async experimentalDownloadMediaMessage(media, maxRetryCount) {
        var _a, _b;
        let count = 0;
        while (count < (maxRetryCount || this.config.maxMsgRetryCount || 5)) {
            try {
                const serverIndex = Math.floor(Math.random() * WAConfigs_1.WA_MEDIA_SERVERS.length);
                const stream = await (0, baileys_1.downloadMediaMessage)(media.stream, 'buffer', {
                    options: {
                        lookup(hostname, options, cb) {
                            cb(null, WAConfigs_1.WA_MEDIA_SERVERS[serverIndex], 4);
                        },
                    },
                }, {
                    logger: this.logger,
                    reuploadRequest: (m) => Promise.resolve(m),
                });
                if (stream instanceof stream_1.default.Transform) {
                    const buffer = await stream.read();
                    return buffer || Buffer.from('');
                }
                return stream;
            }
            catch (error) {
                (_b = (_a = this.logger) === null || _a === void 0 ? void 0 : _a.warn) === null || _b === void 0 ? void 0 : _b.call(_a, `Failed to download media message. Retry count: ${count}`);
                count++;
                if (count >= (maxRetryCount || this.config.maxMsgRetryCount || 5)) {
                    this.emit('error', error);
                }
            }
        }
        throw new Error('Failed to download media message');
    }
    download(message, type, options, ctx) {
        // downloadMediaMessage expects a WAMessage type; cast to any to avoid the WebMessageInfo vs WAMessage type mismatch
        return (0, baileys_1.downloadMediaMessage)(message, type, options, ctx);
    }
    async onExists(id) {
        const normalizedId = this.safeNormalizeJid(id);
        if (!normalizedId)
            return { exists: false, id };
        const user = await this.sock.onWhatsApp(normalizedId);
        if (user && user.length > 0)
            return { exists: user[0].exists, id: user[0].jid };
        return { exists: false, id: normalizedId };
    }
    async updateMediaMessage(message) {
        // Cast to any because Baileys expects a WAMessage type; IWebMessageInfo is compatible at runtime.
        return await this.sock.updateMediaMessage(message);
    }
    async groupAcceptInvite(code) {
        var _a;
        return (await ((_a = this.sock) === null || _a === void 0 ? void 0 : _a.groupAcceptInvite(code))) || '';
    }
    static Browser(plataform, browser, version) {
        const browserAppropriated = baileys_1.Browsers.appropriate(browser || 'Rompot');
        return [
            plataform || browserAppropriated[0],
            browser || browserAppropriated[1],
            version || browserAppropriated[2],
        ];
    }
}
exports.default = WhatsAppBot;
//# sourceMappingURL=WhatsAppBot.js.map