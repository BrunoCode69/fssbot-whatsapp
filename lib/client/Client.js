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
const fs_1 = require("fs");
const ChatNotDefinedError_1 = __importDefault(require("../errors/ChatNotDefinedError"));
const Defaults_1 = require("../configs/Defaults");
const Message_1 = __importStar(require("../messages/Message"));
const ErrorMessage_1 = __importDefault(require("../messages/ErrorMessage"));
const ReactionMessage_1 = __importDefault(require("../messages/ReactionMessage"));
const ChatStatus_1 = __importDefault(require("../modules/chat/ChatStatus"));
const Chat_1 = __importDefault(require("../modules/chat/Chat"));
const User_1 = __importDefault(require("../modules/user/User"));
const ClientEvents_1 = __importDefault(require("./ClientEvents"));
const ClientFunctionHandler_1 = __importDefault(require("./ClientFunctionHandler"));
const BotStatus_1 = require("../bot/BotStatus");
const BotBase_1 = __importDefault(require("../bot/BotBase"));
const Generic_1 = require("../utils/Generic");
const MessageHandler_1 = __importDefault(require("../utils/MessageHandler"));
const Call_1 = __importDefault(require("../models/Call"));
class Client extends ClientEvents_1.default {
    constructor(bot, config = {}) {
        super();
        this.funcHandler = new ClientFunctionHandler_1.default(this, {
            bot: [],
            chat: [],
            user: [],
            message: [],
            sendMessage: [],
            sendMediaMessage: [],
            downloadMedia: [],
        });
        this.messageHandler = new MessageHandler_1.default();
        this.reconnectTimes = 0;
        this.config = { ...Defaults_1.DEFAULT_CONNECTION_CONFIG, ...config };
        this.id = Client.generateId();
        this.bot = bot;
        this.configEvents();
        Client.saveClient(this);
    }
    configEvents() {
        this.bot.on('message', async (message) => {
            var _a;
            try {
                message.inject({ clientId: this.id, botId: this.bot.id });
                if (!message.fromMe && !this.config.disableAutoRead) {
                    if (!message.isDeleted && !message.isUpdate) {
                        await message.read();
                    }
                }
                message.user = (await this.getUser(message.user)) || message.user;
                message.chat = (await this.getChat(message.chat)) || message.chat;
                if (!message.chat.timestamp ||
                    message.timestamp > message.chat.timestamp) {
                    message.chat.timestamp = message.timestamp;
                }
                if (message.mention) {
                    if (message.mention.chat.id != message.chat.id) {
                        message.mention.chat =
                            (await this.getChat(message.mention.chat)) ||
                                message.mention.chat;
                    }
                    else {
                        message.mention.chat = message.chat;
                    }
                    if (message.mention.user.id != message.user.id) {
                        message.mention.user =
                            (await this.getUser(message.mention.user)) ||
                                message.mention.user;
                    }
                    else {
                        message.mention.user = message.user;
                    }
                }
                if (this.messageHandler.resolveMessage(message))
                    return;
                this.emit('message', message);
            }
            catch (err) {
                console.error('[Rompot client] message handling failed', {
                    type: message.type,
                    messageId: message.id,
                    chatId: (_a = message.chat) === null || _a === void 0 ? void 0 : _a.id,
                    error: err instanceof Error ? err.message : String(err),
                    stack: err instanceof Error ? err.stack : undefined,
                });
                this.emit('message', new ErrorMessage_1.default(message.chat, err));
            }
        });
        this.bot.on('open', (update) => {
            try {
                this.reconnectTimes = 0;
                this.emit('open', update);
            }
            catch (err) {
                this.emit('error', (0, Generic_1.getError)(err));
            }
        });
        this.bot.on('reconnecting', (update) => {
            try {
                this.emit('reconnecting', update);
            }
            catch (err) {
                this.emit('error', (0, Generic_1.getError)(err));
            }
        });
        this.bot.on('connecting', (update) => {
            try {
                this.emit('connecting', update);
            }
            catch (err) {
                this.emit('error', (0, Generic_1.getError)(err));
            }
        });
        this.bot.on('close', async (update) => {
            try {
                this.emit('close', update);
                if (this.reconnectTimes < this.config.maxReconnectTimes) {
                    this.reconnectTimes++;
                    await (0, Generic_1.sleep)(this.config.reconnectTimeout);
                    this.reconnect();
                }
            }
            catch (err) {
                this.emit('error', (0, Generic_1.getError)(err));
            }
        });
        this.bot.on('stop', async (update) => {
            try {
                this.emit('stop', update);
            }
            catch (err) {
                this.emit('error', (0, Generic_1.getError)(err));
            }
        });
        this.bot.on('qr', (qr) => {
            try {
                this.emit('qr', qr);
            }
            catch (err) {
                this.emit('error', (0, Generic_1.getError)(err));
            }
        });
        this.bot.on('code', (code) => {
            try {
                this.emit('code', code);
            }
            catch (err) {
                this.emit('error', (0, Generic_1.getError)(err));
            }
        });
        this.bot.on('chat', (update) => {
            this.emit('chat', {
                ...update,
                chat: { ...update.chat, clientId: this.id, botId: this.bot.id },
            });
        });
        this.bot.on('user', (update) => {
            try {
                this.emit('user', {
                    event: update.event,
                    action: update.action,
                    chat: Chat_1.default.apply(update.chat, {
                        clientId: this.id,
                        botId: this.bot.id,
                    }),
                    user: User_1.default.apply(update.user, {
                        clientId: this.id,
                        botId: this.bot.id,
                    }),
                    fromUser: User_1.default.apply(update.fromUser, {
                        clientId: this.id,
                        botId: this.bot.id,
                    }),
                });
            }
            catch (err) {
                this.emit('error', (0, Generic_1.getError)(err));
            }
        });
        this.bot.on('call', (call) => {
            this.emit('call', Call_1.default.apply(call, { clientId: this.id, botId: this.bot.id }));
        });
        const link = { clientId: this.id, botId: this.bot.id };
        const linkUser = (user) => (user ? User_1.default.apply(user, link) : undefined);
        this.bot.on('group-update', (update) => {
            try {
                this.emit('group-update', {
                    ...update,
                    chat: Chat_1.default.apply(update.chat, link),
                    fromUser: linkUser(update.fromUser),
                });
            }
            catch (err) {
                this.emit('error', (0, Generic_1.getError)(err));
            }
        });
        this.bot.on('group-join-request', (update) => {
            try {
                this.emit('group-join-request', {
                    ...update,
                    chat: Chat_1.default.apply(update.chat, link),
                    user: User_1.default.apply(update.user, link),
                    fromUser: linkUser(update.fromUser),
                });
            }
            catch (err) {
                this.emit('error', (0, Generic_1.getError)(err));
            }
        });
        this.bot.on('presence', (update) => {
            try {
                this.emit('presence', {
                    ...update,
                    chat: Chat_1.default.apply(update.chat, link),
                    user: User_1.default.apply(update.user, link),
                });
            }
            catch (err) {
                this.emit('error', (0, Generic_1.getError)(err));
            }
        });
        this.bot.on('blocklist', (update) => this.emit('blocklist', update));
        this.bot.on('id-mapping', (update) => this.emit('id-mapping', update));
        this.bot.on('error', (err) => {
            try {
                this.emit('error', (0, Generic_1.getError)(err));
            }
            catch (err) {
                this.emit('error', (0, Generic_1.getError)(err));
            }
        });
    }
    async connect(auth) {
        await this.bot.connect(auth);
    }
    async reconnect(alert) {
        await this.bot.reconnect(alert);
    }
    async stop(reason) {
        await this.bot.stop(reason);
    }
    async logout() {
        await this.bot.logout();
    }
    async awaitEvent(eventName, maxTimeout) {
        return new Promise((res, rej) => {
            let timeout;
            if (maxTimeout) {
                timeout = setTimeout(() => {
                    rej('Wait event time out');
                }, maxTimeout);
            }
            const listener = (arg) => {
                if (timeout) {
                    clearTimeout(timeout);
                }
                this.ev.removeListener(eventName, listener);
                res(arg);
            };
            this.ev.on(eventName, listener);
        });
    }
    async awaitConnectionOpen() {
        if (this.bot.status != BotStatus_1.BotStatus.Online) {
            await this.awaitEvent('open', this.config.maxTimeout);
        }
    }
    deleteMessage(message) {
        return this.funcHandler.exec('message', this.bot.deleteMessage, message);
    }
    removeMessage(message) {
        return this.funcHandler.exec('message', this.bot.removeMessage, message);
    }
    async readMessage(message) {
        await this.funcHandler.exec('message', this.bot.readMessage, message);
        if (message.status == Message_1.MessageStatus.Sending ||
            message.status == Message_1.MessageStatus.Sended ||
            message.status == Message_1.MessageStatus.Received) {
            if (message.type == Message_1.MessageType.Audio) {
                message.status = Message_1.MessageStatus.Played;
            }
            else {
                message.status = Message_1.MessageStatus.Readed;
            }
        }
        if (message.timestamp == message.chat.timestamp) {
            message.chat.unreadCount = (message.chat.unreadCount || 0) - 1 || 0;
        }
    }
    editMessage(message, text) {
        message.text = text;
        message.isEdited = true;
        return this.funcHandler.exec('message', this.bot.editMessage, message);
    }
    addReaction(message, reaction) {
        var _a;
        return this.funcHandler.exec('message', this.bot.addReaction, new ReactionMessage_1.default(message.chat, reaction, message, {
            user: message.user,
            fromMe: message.fromMe,
            extra: ((_a = message.extra) === null || _a === void 0 ? void 0 : _a.key) ? { key: message.extra.key } : {},
        }));
    }
    removeReaction(message) {
        var _a;
        return this.funcHandler.exec('message', this.bot.removeReaction, new ReactionMessage_1.default(message.chat, '', message, {
            user: message.user,
            fromMe: message.fromMe,
            extra: ((_a = message.extra) === null || _a === void 0 ? void 0 : _a.key) ? { key: message.extra.key } : {},
        }));
    }
    addAnimatedReaction(message, reactions, interval = 2000, maxTimeout = 60000) {
        let isStoped = false;
        const now = Date.now();
        const stop = async (reactionStop) => {
            if (isStoped)
                return;
            isStoped = true;
            if (!reactionStop) {
                await this.removeReaction(message);
            }
            else {
                await this.addReaction(message, reactionStop);
            }
        };
        const addReaction = async (index) => {
            if (isStoped || now + maxTimeout < Date.now()) {
                return stop();
            }
            if (reactions[index]) {
                await this.addReaction(message, reactions[index]);
            }
            await (0, Generic_1.sleep)(interval);
            addReaction(index + 1 >= reactions.length ? 0 : index + 1);
        };
        addReaction(0);
        return stop;
    }
    async send(message) {
        message = Message_1.default.apply(message, { clientId: this.id, botId: this.bot.id });
        if (!this.config.disableAutoTyping) {
            await this.changeChatStatus(message.chat, message.type == 'audio' ? ChatStatus_1.default.Recording : ChatStatus_1.default.Typing);
        }
        try {
            if ('file' in message) {
                return Message_1.default.apply(await this.funcHandler.exec('sendMediaMessage', this.bot.send, message), { clientId: this.id, botId: this.bot.id });
            }
            return Message_1.default.apply(await this.funcHandler.exec('sendMessage', this.bot.send, message), { clientId: this.id, botId: this.bot.id });
        }
        finally {
            if (!this.config.disableAutoTyping) {
                await this.changeChatStatus(message.chat, ChatStatus_1.default.Paused);
            }
        }
    }
    async sendMessage(chat, message, mention) {
        if (Message_1.default.isValid(message)) {
            message = Message_1.default.apply(message, {
                clientId: this.id,
                botId: this.bot.id,
            });
            message.chat = Chat_1.default.apply(chat, {
                clientId: this.id,
                botId: this.bot.id,
            });
            message.mention = mention;
            return await this.send(message);
        }
        return await this.send(new Message_1.default(chat, message, { mention }));
    }
    async awaitMessage(chat, config = {}) {
        const chatId = Chat_1.default.getId(chat);
        if (!chatId) {
            throw new ChatNotDefinedError_1.default();
        }
        const message = await this.messageHandler.addMessage(chatId, config);
        return Message_1.default.apply(message, {
            clientId: this.id,
            botId: this.bot.id,
        });
    }
    async downloadStreamMessage(message) {
        if (!message.file)
            return Buffer.from('');
        if (Buffer.isBuffer(message.file))
            return message.file;
        if (typeof message.file == 'string') {
            return (0, fs_1.readFileSync)(message.file);
        }
        return this.funcHandler.exec('downloadMedia', this.bot.downloadStreamMessage, message.file);
    }
    getBotName() {
        return this.funcHandler.exec('bot', this.bot.getBotName);
    }
    setBotName(name) {
        return this.funcHandler.exec('bot', this.bot.setBotName, name);
    }
    getBotDescription() {
        return this.funcHandler.exec('bot', this.bot.getBotDescription);
    }
    setBotDescription(description) {
        return this.funcHandler.exec('bot', this.bot.setBotDescription, description);
    }
    getBotProfile(lowQuality) {
        return this.funcHandler.exec('bot', this.bot.getBotProfile, lowQuality);
    }
    setBotProfile(profile) {
        return this.funcHandler.exec('bot', this.bot.setBotProfile, profile);
    }
    async getChat(chat) {
        const chatData = await this.funcHandler.exec('chat', this.bot.getChat, Chat_1.default.apply(chat, { clientId: this.id, botId: this.bot.id }));
        if (chatData == null)
            return null;
        return Chat_1.default.apply(chatData, { clientId: this.id, botId: this.bot.id });
    }
    updateChat(id, chat) {
        return this.funcHandler.exec('chat', this.bot.updateChat, { ...chat, id });
    }
    async getChats() {
        const ids = await this.funcHandler.exec('chat', this.bot.getChats);
        const chats = [];
        await Promise.all(ids.map(async (id) => {
            const chat = await this.funcHandler.exec('chat', this.bot.getChat, new Chat_1.default(id));
            if (chat == null)
                return;
            chats.push(Chat_1.default.apply(chat, { clientId: this.id, botId: this.bot.id }));
        }));
        return chats;
    }
    setChats(chats) {
        return this.funcHandler.exec('chat', this.bot.setChats, chats);
    }
    removeChat(chat) {
        return this.funcHandler.exec('chat', this.bot.removeChat, Chat_1.default.apply(chat, { clientId: this.id, botId: this.bot.id }));
    }
    createChat(chat) {
        return this.funcHandler.exec('chat', this.bot.createChat, Chat_1.default.apply(chat, { clientId: this.id, botId: this.bot.id }));
    }
    leaveChat(chat) {
        return this.funcHandler.exec('chat', this.bot.leaveChat, Chat_1.default.apply(chat, { clientId: this.id, botId: this.bot.id }));
    }
    getChatName(chat) {
        return this.funcHandler.exec('chat', this.bot.getChatName, Chat_1.default.apply(chat, { clientId: this.id, botId: this.bot.id }));
    }
    setChatName(chat, name) {
        return this.funcHandler.exec('chat', this.bot.setChatName, Chat_1.default.apply(chat, { clientId: this.id, botId: this.bot.id }), name);
    }
    getChatDescription(chat) {
        return this.funcHandler.exec('chat', this.bot.getChatDescription, Chat_1.default.apply(chat, { clientId: this.id, botId: this.bot.id }));
    }
    setChatDescription(chat, description) {
        return this.funcHandler.exec('chat', this.bot.setChatDescription, Chat_1.default.apply(chat, { clientId: this.id, botId: this.bot.id }), description);
    }
    getChatProfile(chat, lowQuality) {
        return this.funcHandler.exec('chat', this.bot.getChatProfile, Chat_1.default.apply(chat, { clientId: this.id, botId: this.bot.id }), lowQuality);
    }
    setChatProfile(chat, profile) {
        return this.funcHandler.exec('chat', this.bot.setChatProfile, Chat_1.default.apply(chat, { clientId: this.id, botId: this.bot.id }), profile);
    }
    async getChatLeader(chat) {
        return User_1.default.apply(await this.funcHandler.exec('chat', this.bot.getChatLeader, Chat_1.default.apply(chat, { clientId: this.id, botId: this.bot.id })), { clientId: this.id, botId: this.bot.id });
    }
    async getChatUsers(chat) {
        return await this.funcHandler.exec('chat', this.bot.getChatUsers, Chat_1.default.apply(chat, { clientId: this.id, botId: this.bot.id }));
    }
    async getChatAdmins(chat) {
        return await this.funcHandler.exec('chat', this.bot.getChatAdmins, Chat_1.default.apply(chat, { clientId: this.id, botId: this.bot.id }));
    }
    addUserInChat(chat, user) {
        return this.funcHandler.exec('chat', this.bot.addUserInChat, Chat_1.default.apply(chat, { clientId: this.id, botId: this.bot.id }), User_1.default.apply(user, { clientId: this.id, botId: this.bot.id }));
    }
    removeUserInChat(chat, user) {
        return this.funcHandler.exec('chat', this.bot.removeUserInChat, Chat_1.default.apply(chat, { clientId: this.id, botId: this.bot.id }), User_1.default.apply(user, { clientId: this.id, botId: this.bot.id }));
    }
    promoteUserInChat(chat, user) {
        return this.funcHandler.exec('chat', this.bot.promoteUserInChat, Chat_1.default.apply(chat, { clientId: this.id, botId: this.bot.id }), User_1.default.apply(user, { clientId: this.id, botId: this.bot.id }));
    }
    demoteUserInChat(chat, user) {
        return this.funcHandler.exec('chat', this.bot.demoteUserInChat, Chat_1.default.apply(chat, { clientId: this.id, botId: this.bot.id }), User_1.default.apply(user, { clientId: this.id, botId: this.bot.id }));
    }
    changeChatStatus(chat, status) {
        return this.funcHandler.exec('chat', this.bot.changeChatStatus, Chat_1.default.apply(chat, { clientId: this.id, botId: this.bot.id }), status);
    }
    joinChat(code) {
        return this.funcHandler.exec('chat', this.bot.joinChat, code);
    }
    getChatInvite(chat) {
        return this.funcHandler.exec('chat', this.bot.getChatInvite, Chat_1.default.apply(chat, { clientId: this.id, botId: this.bot.id }));
    }
    revokeChatInvite(chat) {
        return this.funcHandler.exec('chat', this.bot.revokeChatInvite, Chat_1.default.apply(chat, { clientId: this.id, botId: this.bot.id }));
    }
    rejectCall(call) {
        return this.funcHandler.exec('chat', this.bot.rejectCall, Call_1.default.apply(call));
    }
    async getUsers() {
        const ids = await this.funcHandler.exec('user', this.bot.getUsers);
        const users = [];
        await Promise.all(ids.map(async (id) => {
            const user = await this.funcHandler.exec('user', this.bot.getUser, new User_1.default(id));
            if (user == null)
                return;
            users.push(User_1.default.apply(user, { clientId: this.id, botId: this.bot.id }));
        }));
        return users;
    }
    async getSavedUsers() {
        const ids = await this.funcHandler.exec('user', this.bot.getUsers);
        const users = [];
        await Promise.all(ids.map(async (id) => {
            const user = await this.funcHandler.exec('user', this.bot.getUser, new User_1.default(id));
            if (user == null || !user.savedName)
                return;
            users.push(User_1.default.apply(user, { clientId: this.id, botId: this.bot.id }));
        }));
        return users;
    }
    setUsers(users) {
        return this.funcHandler.exec('user', this.bot.setUsers, users);
    }
    async getUser(user) {
        const userData = await this.funcHandler.exec('user', this.bot.getUser, User_1.default.apply(user, { clientId: this.id, botId: this.bot.id }));
        if (userData == null)
            return null;
        return User_1.default.apply(userData, { clientId: this.id, botId: this.bot.id });
    }
    updateUser(id, user) {
        return this.funcHandler.exec('user', this.bot.updateUser, { ...user, id });
    }
    removeUser(user) {
        return this.funcHandler.exec('user', this.bot.removeUser, User_1.default.apply(user, { clientId: this.id, botId: this.bot.id }));
    }
    getUserName(user) {
        if (User_1.default.getId(user) == this.id)
            return this.getBotName();
        return this.funcHandler.exec('user', this.bot.getUserName, User_1.default.apply(user, { clientId: this.id, botId: this.bot.id }));
    }
    setUserName(user, name) {
        if (User_1.default.getId(user) == this.id)
            return this.setBotName(name);
        return this.funcHandler.exec('user', this.bot.setUserName, User_1.default.apply(user, { clientId: this.id, botId: this.bot.id }), name);
    }
    getUserDescription(user) {
        if (User_1.default.getId(user) == this.id)
            return this.getBotDescription();
        return this.funcHandler.exec('user', this.bot.getUserDescription, User_1.default.apply(user, { clientId: this.id, botId: this.bot.id }));
    }
    setUserDescription(user, description) {
        if (User_1.default.getId(user) == this.id)
            return this.setBotDescription(description);
        return this.funcHandler.exec('user', this.bot.setUserDescription, User_1.default.apply(user, { clientId: this.id, botId: this.bot.id }), description);
    }
    getUserProfile(user, lowQuality) {
        if (User_1.default.getId(user) == this.id)
            return this.getBotProfile(lowQuality);
        return this.funcHandler.exec('user', this.bot.getUserProfile, User_1.default.apply(user, { clientId: this.id, botId: this.bot.id }), lowQuality);
    }
    setUserProfile(user, profile) {
        if (User_1.default.getId(user) == this.id)
            return this.setBotProfile(profile);
        return this.funcHandler.exec('user', this.bot.setUserProfile, User_1.default.apply(user, { clientId: this.id, botId: this.bot.id }), profile);
    }
    unblockUser(user) {
        return this.funcHandler.exec('user', this.bot.unblockUser, User_1.default.apply(user, { clientId: this.id, botId: this.bot.id }));
    }
    blockUser(user) {
        return this.funcHandler.exec('user', this.bot.blockUser, User_1.default.apply(user, { clientId: this.id, botId: this.bot.id }));
    }
    //! ************************* RECURSOS OPCIONAIS *************************
    /** Retorna o método opcional do bot ou lança erro se a plataforma não suporta. */
    feature(name) {
        const fn = this.bot[name];
        if (typeof fn !== 'function') {
            throw new Error(`O recurso "${String(name)}" não está disponível nesta plataforma.`);
        }
        return fn;
    }
    /** Verifica se a plataforma atual oferece um recurso opcional. */
    supports(name) {
        return typeof this.bot[name] === 'function';
    }
    linkChat(chat) {
        return Chat_1.default.apply(chat, { clientId: this.id, botId: this.bot.id });
    }
    linkUser(user) {
        return User_1.default.apply(user, { clientId: this.id, botId: this.bot.id });
    }
    /**
     * ID único de um usuário ou chat.
     * No WhatsApp: número (`...@s.whatsapp.net`) quando conhecido, senão o LID (`...@lid`).
     */
    async resolveId(id) {
        const value = typeof id == 'string' ? id : (id === null || id === void 0 ? void 0 : id.id) || '';
        if (!this.supports('resolveId'))
            return value;
        return this.funcHandler.exec('user', this.feature('resolveId'), value);
    }
    /** Todos os identificadores conhecidos de um usuário (ID único, número e LID). */
    async getUserIdentity(user) {
        const value = typeof user == 'string' ? user : (user === null || user === void 0 ? void 0 : user.id) || '';
        if (!this.supports('getIdentity')) {
            return { id: value, phoneNumber: '', pn: undefined, lid: undefined };
        }
        return this.funcHandler.exec('user', this.feature('getIdentity'), value);
    }
    /** Só administradores podem enviar mensagens (`true`) ou todos podem (`false`). */
    setChatAnnounce(chat, enabled) {
        return this.funcHandler.exec('chat', this.feature('setChatAnnounce'), this.linkChat(chat), enabled);
    }
    /** Só administradores podem editar nome, descrição e foto (`true`). */
    setChatLocked(chat, enabled) {
        return this.funcHandler.exec('chat', this.feature('setChatLocked'), this.linkChat(chat), enabled);
    }
    /** Mensagens temporárias em segundos (0 desativa). */
    setChatEphemeral(chat, seconds) {
        return this.funcHandler.exec('chat', this.feature('setChatEphemeral'), this.linkChat(chat), seconds);
    }
    /** Qualquer membro pode adicionar participantes (`true`) ou só administradores (`false`). */
    setChatMemberAddMode(chat, allMembers) {
        return this.funcHandler.exec('chat', this.feature('setChatMemberAddMode'), this.linkChat(chat), allMembers);
    }
    /** A entrada no grupo exige aprovação de um administrador (`true`). */
    setChatJoinApproval(chat, enabled) {
        return this.funcHandler.exec('chat', this.feature('setChatJoinApproval'), this.linkChat(chat), enabled);
    }
    /** Pedidos de entrada pendentes no grupo. */
    async getChatJoinRequests(chat) {
        const requests = await this.funcHandler.exec('chat', this.feature('getChatJoinRequests'), this.linkChat(chat));
        return (requests || []).map((request) => ({ ...request, user: this.linkUser(request.user) }));
    }
    /** Aprova pedidos de entrada. Retorna os IDs aprovados. */
    approveChatJoinRequests(chat, users) {
        return this.funcHandler.exec('chat', this.feature('updateChatJoinRequests'), this.linkChat(chat), users.map((user) => this.linkUser(user)), 'approve');
    }
    /** Recusa pedidos de entrada. Retorna os IDs recusados. */
    rejectChatJoinRequests(chat, users) {
        return this.funcHandler.exec('chat', this.feature('updateChatJoinRequests'), this.linkChat(chat), users.map((user) => this.linkUser(user)), 'reject');
    }
    /** Dados de um grupo a partir do código ou link de convite, sem entrar nele. */
    async getChatInviteInfo(code) {
        const chat = await this.funcHandler.exec('chat', this.feature('getChatInviteInfo'), code);
        return chat ? this.linkChat(chat) : null;
    }
    /**
     * Fixa uma mensagem no chat.
     * @param duration - Segundos: 86400 (24 h), 604800 (7 dias) ou 2592000 (30 dias). Use 0 para desafixar.
     */
    pinMessage(message, duration = 604800) {
        return this.funcHandler.exec('message', this.feature('pinMessage'), message, duration);
    }
    /** Desafixa uma mensagem. */
    unpinMessage(message) {
        return this.funcHandler.exec('message', this.feature('pinMessage'), message, 0);
    }
    /** Marca (`true`) ou desmarca (`false`) uma mensagem com estrela. */
    starMessage(message, star = true) {
        return this.funcHandler.exec('message', this.feature('starMessage'), message, star);
    }
    /** Encaminha uma mensagem para outro chat. */
    async forwardMessage(chat, message) {
        const sent = await this.funcHandler.exec('sendMessage', this.feature('forwardMessage'), this.linkChat(chat), message);
        return Message_1.default.apply(sent, { clientId: this.id, botId: this.bot.id });
    }
    /** Passa a receber o evento `presence` (digitando, gravando, online) deste chat. */
    subscribePresence(chat) {
        return this.funcHandler.exec('chat', this.feature('subscribePresence'), this.linkChat(chat));
    }
    /** IDs dos usuários bloqueados. */
    getBlockedUsers() {
        return this.funcHandler.exec('user', this.feature('getBlockedUsers'));
    }
    /** Verifica se um número ou ID existe no WhatsApp. */
    isOnWhatsApp(id) {
        const value = typeof id == 'string' ? id : (id === null || id === void 0 ? void 0 : id.id) || '';
        return this.funcHandler.exec('user', this.feature('onExists'), value);
    }
    static getClients() {
        if (!('rompot-clients' in global) ||
            typeof global['rompot-clients'] != 'object') {
            global['rompot-clients'] = {};
        }
        return global['rompot-clients'];
    }
    static saveClients(clients) {
        global['rompot-clients'] = clients;
    }
    static getClient(id) {
        const clients = Client.getClients();
        if (id in clients && typeof clients[id] == 'object') {
            return clients[id];
        }
        return new Client(new BotBase_1.default());
    }
    static saveClient(client) {
        if (!('rompot-clients' in global) ||
            typeof global['rompot-clients'] != 'object') {
            global['rompot-clients'] = {};
        }
        global['rompot-clients'][client.id] = client;
    }
    static generateId() {
        return `${process.pid}-${Date.now()}-${Object.keys(Client.getClients()).length}`;
    }
}
exports.default = Client;
//# sourceMappingURL=Client.js.map