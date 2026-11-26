"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_telegram_bot_api_1 = __importDefault(require("node-telegram-bot-api"));
const ChatStatus_1 = __importDefault(require("../modules/chat/ChatStatus"));
const ChatType_1 = __importDefault(require("../modules/chat/ChatType"));
const Chat_1 = __importDefault(require("../modules/chat/Chat"));
const User_1 = __importDefault(require("../modules/user/User"));
const BotStatus_1 = require("../bot/BotStatus");
const BotEvents_1 = __importDefault(require("../bot/BotEvents"));
const TelegramSendingController_1 = __importDefault(require("./TelegramSendingController"));
const TelegramToRompotConverter_1 = __importDefault(require("./TelegramToRompotConverter"));
const TelegramUtils_1 = require("./TelegramUtils");
const TelegramEvents_1 = __importDefault(require("./TelegramEvents"));
const TelegramAuth_1 = __importDefault(require("./TelegramAuth"));
const Generic_1 = require("../utils/Generic");
const MediaUtils_1 = require("../utils/MediaUtils");
class TelegramBot extends BotEvents_1.default {
    constructor(options) {
        super();
        this.id = '';
        this.status = BotStatus_1.BotStatus.Offline;
        this.phoneNumber = '';
        this.name = '';
        this.profileUrl = '';
        this.answeredCallbackQueries = new Set();
        this.options = { ...(options || {}) };
        this.auth = new TelegramAuth_1.default('', './sessions', false);
        this.bot = new node_telegram_bot_api_1.default('', this.options);
        this.events = new TelegramEvents_1.default(this);
        this.events.configAll();
    }
    async connect(auth) {
        return new Promise(async (resolve, reject) => {
            try {
                this.status = BotStatus_1.BotStatus.Offline;
                this.emit('connecting', {});
                if (typeof auth == 'string') {
                    auth = new TelegramAuth_1.default(auth, './sessions');
                }
                this.auth = auth;
                const botToken = await this.auth.get('BOT_TOKEN');
                this.bot.token = botToken;
                this.bot.options = {
                    ...this.bot.options,
                    ...this.options,
                };
                this.bot.startPolling();
                const botInfo = await this.bot.getMe();
                this.id = `${botInfo.id}`;
                this.status = BotStatus_1.BotStatus.Online;
                this.name = TelegramUtils_1.TelegramUtils.getName(botInfo);
                this.phoneNumber = TelegramUtils_1.TelegramUtils.getPhoneNumber(this.id);
                this.profileUrl = await this.getBotProfileUrl();
                resolve();
                this.emit('open', { isNewLogin: false });
            }
            catch (error) {
                reject(error);
            }
        });
    }
    async reconnect(alert) {
        this.status = BotStatus_1.BotStatus.Offline;
        try {
            await this.bot.close();
        }
        catch { }
        this.emit('reconnecting', {});
        await this.connect(this.auth);
    }
    async stop(reason) {
        this.status = BotStatus_1.BotStatus.Offline;
        try {
            await this.bot.close();
        }
        catch { }
        this.emit('stop', { isLogout: false });
    }
    async logout() {
        this.status = BotStatus_1.BotStatus.Offline;
        try {
            await this.bot.logOut();
        }
        catch { }
        this.emit('stop', { isLogout: true });
    }
    async send(message) {
        return await new TelegramSendingController_1.default(this).send(message);
    }
    async editMessage(message) {
        await new TelegramSendingController_1.default(this).sendEditedMessage(message);
    }
    async addReaction(message) {
        await new TelegramSendingController_1.default(this).sendReaction(message);
    }
    async removeReaction(message) {
        await new TelegramSendingController_1.default(this).sendReaction(message);
    }
    async readMessage(message) {
        const chat = await this.getChat(message.chat);
        if (chat && chat.unreadCount) {
            await this.updateChat({ id: chat.id, unreadCount: Math.max(0, chat.unreadCount - 1) });
        }
    }
    async removeMessage(message) {
        await this.deleteMessage(message);
    }
    async pinMessage(message, _duration) {
        await this.bot.pinChatMessage(Number(message.chat.id), Number(message.id));
    }
    async unpinMessage(message) {
        await this.bot.unpinChatMessage(Number(message.chat.id), {
            message_id: Number(message.id),
        });
    }
    async forwardMessage(chat, message) {
        const forwarded = await this.bot.forwardMessage(Number(chat.id), Number(message.chat.id), Number(message.id));
        return await new TelegramToRompotConverter_1.default(forwarded).convert();
    }
    async deleteMessage(message) {
        await this.bot.deleteMessage(Number(message.chat.id), Number(message.id));
    }
    /**
     * Baixa a mídia para a memória.
     * @param options Opcional: `maxBytes` (sem valor = sem limite), `signal` e `timeoutMs`.
     */
    async downloadStreamMessage(media, options) {
        if (!media?.stream ||
            typeof media.stream != 'object' ||
            !media.stream.file_id) {
            return Buffer.from('');
        }
        TelegramBot.assertDeclaredMediaSize(media, options);
        const fileUrl = await this.bot.getFileLink(media.stream.file_id);
        return await TelegramUtils_1.TelegramUtils.downloadFileFromURL(fileUrl, options);
    }
    /**
     * Baixa a mídia direto para `filePath`, em stream (sem carregar tudo em memória).
     * Aplica `maxBytes` pelo tamanho declarado, pelo Content-Length e pelos bytes contados.
     * Em caso de falha o arquivo parcial é apagado.
     */
    async downloadMediaToFile(media, filePath, options) {
        if (!media?.stream ||
            typeof media.stream != 'object' ||
            !media.stream.file_id) {
            throw new Error('A mensagem não tem um arquivo do Telegram para baixar.');
        }
        TelegramBot.assertDeclaredMediaSize(media, options);
        const fileUrl = await this.bot.getFileLink(media.stream.file_id);
        await TelegramUtils_1.TelegramUtils.downloadFileFromURLToFile(fileUrl, filePath, options);
    }
    /** Falha cedo quando o Telegram declara (`file_size`) um tamanho acima de `maxBytes`. */
    static assertDeclaredMediaSize(media, options) {
        const maxBytes = (0, MediaUtils_1.getMediaMaxBytes)(options);
        const size = (0, MediaUtils_1.toMediaNumber)(media?.stream?.file_size);
        if (maxBytes && size > maxBytes) {
            throw (0, MediaUtils_1.createMediaTooLargeError)(maxBytes, size);
        }
    }
    async getBotName() {
        return TelegramUtils_1.TelegramUtils.getName(await this.bot.getMe());
    }
    async setBotName(name) {
        await this.setUserName(new User_1.default(this.id), name);
    }
    async getBotDescription() {
        return await this.getUserDescription(new User_1.default(this.id));
    }
    async setBotDescription(description) {
        await this.setUserDescription(new User_1.default(this.id), description);
    }
    async getBotProfile(lowQuality) {
        return await this.getUserProfile(new User_1.default(this.id));
    }
    async getBotProfileUrl(lowQuality) {
        return await this.getUserProfileUrl(new User_1.default(this.id));
    }
    async setBotProfile(image) {
        await this.setUserProfile(new User_1.default(this.id), image);
    }
    async getChat(chat) {
        const chatData = await this.auth.get(`chats-${chat.id}`);
        if (!chatData)
            return null;
        if (!chat.name || !chat.profileUrl) {
            const user = await this.getUser(new User_1.default(chat.id));
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
    async updateChat(chat) {
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
        newChat.type = chat.id.length > 10 ? ChatType_1.default.Group : ChatType_1.default.PV;
        newChat.phoneNumber =
            newChat.phoneNumber || TelegramUtils_1.TelegramUtils.getPhoneNumber(chat.id);
        if (!newChat.profileUrl) {
            try {
                newChat.profileUrl = await this.getChatProfileUrl(newChat);
            }
            catch { }
        }
        await this.auth.set(`chats-${chat.id}`, newChat.toJSON());
        this.ev.emit('chat', { action: chatData != null ? 'update' : 'add', chat });
    }
    async removeChat(chat) {
        await this.auth.remove(`chats-${chat.id}`);
        this.ev.emit('chat', { action: 'remove', chat });
    }
    async createChat(chat) {
        //TODO: Create chat
    }
    async leaveChat(chat) {
        await this.bot.leaveChat(Number(chat.id));
    }
    async addUserInChat(chat, user) {
        await this.bot.unbanChatMember(Number(chat.id), Number(user.id));
    }
    async removeUserInChat(chat, user) {
        await this.bot.banChatMember(Number(chat.id), Number(user.id));
    }
    async promoteUserInChat(chat, user) {
        await this.bot.promoteChatMember(Number(chat.id), Number(user.id));
    }
    async demoteUserInChat(chat, user) {
        await this.bot.promoteChatMember(Number(chat.id), Number(user.id), {
            can_change_info: false,
            can_post_messages: false,
            can_edit_messages: false,
            can_delete_messages: false,
            can_invite_users: false,
            can_restrict_members: false,
            can_pin_messages: false,
            can_promote_members: false,
        });
    }
    async changeChatStatus(chat, status) {
        const actionMap = {
            [ChatStatus_1.default.Typing]: 'typing',
            [ChatStatus_1.default.Recording]: 'record_voice',
            [ChatStatus_1.default.Paused]: 'typing',
            [ChatStatus_1.default.Online]: 'typing',
            [ChatStatus_1.default.Offline]: 'typing',
        };
        const action = actionMap[status] || 'typing';
        try {
            await this.bot.sendChatAction(Number(chat.id), action);
        }
        catch { }
    }
    async getChatUsers(chat) {
        return (await this.getChat(chat))?.users || [];
    }
    async getChatAdmins(chat) {
        const members = await this.bot.getChatAdministrators(Number(chat.id));
        return members.map((member) => TelegramUtils_1.TelegramUtils.getId(member.user));
    }
    async getChatLeader(chat) {
        const members = await this.bot.getChatAdministrators(Number(chat.id));
        return `${members.find((member) => member.status == 'creator') || ''}`;
    }
    async getChatName(chat) {
        const chatData = await this.bot.getChat(Number(chat.id));
        return `${chatData.title || ''}`;
    }
    async setChatName(chat, name) {
        await this.bot.setChatTitle(Number(chat.id), `${name}`);
    }
    async getChatDescription(chat) {
        const chatData = await this.bot.getChat(Number(chat.id));
        return `${chatData.description || chatData.bio || ''}`;
    }
    async setChatDescription(chat, description) {
        await this.bot.setChatDescription(Number(chat.id), `${description || ''}`);
    }
    async getChatProfile(chat, lowQuality) {
        const fileUrl = await this.getChatProfileUrl(chat, lowQuality);
        if (!fileUrl) {
            return Buffer.from('');
        }
        return await TelegramUtils_1.TelegramUtils.downloadFileFromURL(fileUrl);
    }
    async getChatProfileUrl(chat, lowQuality) {
        const chatData = await this.bot.getChat(Number(chat.id));
        const fileId = lowQuality
            ? chatData.photo?.small_file_id
            : chatData.photo?.big_file_id;
        if (!fileId)
            return '';
        return await this.bot.getFileLink(fileId);
    }
    async setChatProfile(chat, profile) {
        await this.bot.setChatPhoto(Number(chat.id), profile);
    }
    async joinChat(code) {
        //TODO: Join chat
    }
    async getChatInvite(chat) {
        return await this.bot.exportChatInviteLink(Number(chat.id));
    }
    async revokeChatInvite(chat) {
        const result = await this.bot.revokeChatInviteLink(Number(chat.id), await this.getChatInvite(chat));
        return result.invite_link;
    }
    async rejectCall(call) {
        //TODO: Reject call
    }
    async getUser(user) {
        const userData = await this.auth.get(`users-${user.id}`);
        if (!userData)
            return null;
        return User_1.default.fromJSON(userData);
    }
    async getUsers() {
        return (await this.auth.listAll('users-')).map((id) => id.replace('users-', ''));
    }
    async setUsers(users) {
        await Promise.all(users.map(async (user) => await this.updateUser(user)));
    }
    async updateUser(user) {
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
        newUser.phoneNumber =
            newUser.phoneNumber || TelegramUtils_1.TelegramUtils.getPhoneNumber(user.id);
        if (!newUser.profileUrl) {
            try {
                newUser.profileUrl = await this.getUserProfileUrl(newUser);
            }
            catch { }
        }
        await this.auth.set(`users-${user.id}`, newUser.toJSON());
    }
    async removeUser(user) {
        await this.auth.remove(`users-${user.id}`);
    }
    async unblockUser(user) {
        try {
            await this.bot.unbanChatMember(Number(user.id), Number(user.id));
        }
        catch { }
    }
    async blockUser(user) {
        try {
            await this.bot.banChatMember(Number(user.id), Number(user.id));
        }
        catch { }
    }
    async getUserName(user) {
        const chat = await this.bot.getChat(Number(user.id));
        return `${chat.title || ''}`;
    }
    async setUserName(user, name) {
        await this.bot.setChatTitle(Number(user.id), `${name || ''}`);
    }
    async getUserDescription(user) {
        const chatData = await this.bot.getChat(Number(user.id));
        return `${chatData.description || chatData.bio || ''}`;
    }
    async setUserDescription(user, description) {
        await this.bot.setChatDescription(Number(user.id), `${description || ''}`);
    }
    async getUserProfile(user, lowQuality) {
        try {
            const fileUrl = await this.getUserProfileUrl(user, lowQuality);
            if (!fileUrl) {
                return Buffer.from('');
            }
            return await TelegramUtils_1.TelegramUtils.downloadFileFromURL(fileUrl);
        }
        catch {
            return Buffer.from('');
        }
    }
    async getUserProfileUrl(user, lowQuality) {
        try {
            const profile = await this.bot.getUserProfilePhotos(Number(user.id));
            if (!profile?.photos || profile.photos.length === 0) {
                return '';
            }
            const photoVariants = profile.photos[0];
            if (!photoVariants || photoVariants.length === 0) {
                return '';
            }
            const photo = lowQuality ? photoVariants[0] : photoVariants[photoVariants.length - 1];
            if (!photo?.file_id) {
                return '';
            }
            return (await this.bot.getFileLink(photo.file_id)) || '';
        }
        catch {
            return '';
        }
    }
    async setUserProfile(user, profile) {
        await this.bot.setChatPhoto(Number(user.id), profile);
    }
    isCallbackQueryAnswered(queryId) {
        return this.answeredCallbackQueries.has(queryId);
    }
    async answerCallbackQuery(queryId, text, showAlert = false, url) {
        this.answeredCallbackQueries.add(queryId);
        if (this.answeredCallbackQueries.size > 2000) {
            const oldest = this.answeredCallbackQueries.values().next().value;
            if (oldest)
                this.answeredCallbackQueries.delete(oldest);
        }
        return await this.bot.answerCallbackQuery(queryId, {
            ...(text !== undefined && text !== '' ? { text } : {}),
            ...(showAlert ? { show_alert: true } : {}),
            ...(url ? { url } : {}),
        });
    }
    async answerInlineQuery(queryId, results, options) {
        return await this.bot.answerInlineQuery(queryId, results, options);
    }
    async sendInvoice(chatId, title, description, payload, providerToken, currency, prices, options) {
        const sent = await this.bot.sendInvoice(Number(chatId), title, description, payload, providerToken, currency, prices, options);
        return await new TelegramToRompotConverter_1.default(sent).convert();
    }
    async answerPreCheckoutQuery(queryId, ok, errorMessage) {
        return await this.bot.answerPreCheckoutQuery(queryId, ok, errorMessage ? { error_message: errorMessage } : undefined);
    }
    async sendMediaGroup(chatId, media, options) {
        const sent = await this.bot.sendMediaGroup(Number(chatId), media, options);
        return await Promise.all((sent || []).map((item) => new TelegramToRompotConverter_1.default(item).convert()));
    }
    async banUserInChat(chat, user, untilDate) {
        await this.bot.banChatMember(Number(chat.id), Number(user.id), untilDate ? { until_date: untilDate } : undefined);
    }
    async restrictUserInChat(chat, user, permissions, untilDate) {
        await this.bot.restrictChatMember(Number(chat.id), Number(user.id), {
            permissions,
            ...(untilDate ? { until_date: untilDate } : {}),
        });
    }
    async approveChatJoinRequests(chat, users) {
        const approved = [];
        for (const user of users) {
            await this.bot.approveChatJoinRequest(Number(chat.id), Number(user.id));
            approved.push(String(user.id));
        }
        return approved;
    }
    async rejectChatJoinRequests(chat, users) {
        const rejected = [];
        for (const user of users) {
            await this.bot.declineChatJoinRequest(Number(chat.id), Number(user.id));
            rejected.push(String(user.id));
        }
        return rejected;
    }
    async createForumTopic(chatId, name, iconColor) {
        return await this.bot.createForumTopic(Number(chatId), name, iconColor ? { icon_color: iconColor } : undefined);
    }
    async closeForumTopic(chatId, threadId) {
        return await this.bot.closeForumTopic(Number(chatId), Number(threadId));
    }
    async reopenForumTopic(chatId, threadId) {
        return await this.bot.reopenForumTopic(Number(chatId), Number(threadId));
    }
}
exports.default = TelegramBot;
//# sourceMappingURL=TelegramBot.js.map