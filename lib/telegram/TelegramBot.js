"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_telegram_bot_api_1 = __importDefault(require("node-telegram-bot-api"));
const ChatType_1 = __importDefault(require("../modules/chat/ChatType"));
const Chat_1 = __importDefault(require("../modules/chat/Chat"));
const User_1 = __importDefault(require("../modules/user/User"));
const BotStatus_1 = require("../bot/BotStatus");
const BotEvents_1 = __importDefault(require("../bot/BotEvents"));
const TelegramSendingController_1 = __importDefault(require("./TelegramSendingController"));
const TelegramUtils_1 = require("./TelegramUtils");
const TelegramEvents_1 = __importDefault(require("./TelegramEvents"));
const TelegramAuth_1 = __importDefault(require("./TelegramAuth"));
const Generic_1 = require("../utils/Generic");
class TelegramBot extends BotEvents_1.default {
    constructor(options) {
        super();
        this.id = '';
        this.status = BotStatus_1.BotStatus.Offline;
        this.phoneNumber = '';
        this.name = '';
        this.profileUrl = '';
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
        catch (_a) { }
        this.emit('reconnecting', {});
        await this.connect(this.auth);
    }
    async stop(reason) {
        this.status = BotStatus_1.BotStatus.Offline;
        try {
            await this.bot.close();
        }
        catch (_a) { }
        this.emit('stop', { isLogout: false });
    }
    async logout() {
        this.status = BotStatus_1.BotStatus.Offline;
        try {
            await this.bot.logOut();
        }
        catch (_a) { }
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
        //TODO: Read message
    }
    async removeMessage(message) {
        //TODO: Remove message
    }
    async deleteMessage(message) {
        await this.bot.deleteMessage(Number(message.chat.id), Number(message.id));
    }
    async downloadStreamMessage(media) {
        if (!(media === null || media === void 0 ? void 0 : media.stream) ||
            typeof media.stream != 'object' ||
            !media.stream.file_id) {
            return Buffer.from('');
        }
        const fileUrl = await this.bot.getFileLink(media.stream.file_id);
        return await TelegramUtils_1.TelegramUtils.downloadFileFromURL(fileUrl);
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
            catch (_a) { }
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
        //TODO: Demote user in chat
    }
    async changeChatStatus(chat, status) {
        //TODO: Change chat status
    }
    async getChatUsers(chat) {
        var _a;
        return ((_a = (await this.getChat(chat))) === null || _a === void 0 ? void 0 : _a.users) || [];
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
        var _a, _b;
        const chatData = await this.bot.getChat(Number(chat.id));
        const fileId = lowQuality
            ? (_a = chatData.photo) === null || _a === void 0 ? void 0 : _a.small_file_id
            : (_b = chatData.photo) === null || _b === void 0 ? void 0 : _b.big_file_id;
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
            catch (_a) { }
        }
        await this.auth.set(`users-${user.id}`, newUser.toJSON());
    }
    async removeUser(user) {
        await this.auth.remove(`users-${user.id}`);
    }
    async unblockUser(user) {
        //TODO: Unblock user
    }
    async blockUser(user) {
        //TODO: Block user
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
        const fileUrl = await this.getUserProfileUrl(user, lowQuality);
        if (!fileUrl) {
            return Buffer.from('');
        }
        return await TelegramUtils_1.TelegramUtils.downloadFileFromURL(fileUrl);
    }
    async getUserProfileUrl(user, lowQuality) {
        var _a, _b;
        const profile = await this.bot.getUserProfilePhotos(Number(user.id));
        const photo = (_b = (_a = profile.photos) === null || _a === void 0 ? void 0 : _a.shift()) === null || _b === void 0 ? void 0 : _b.shift();
        if (!photo) {
            return '';
        }
        return await this.bot.getFileLink(photo.file_id);
    }
    async setUserProfile(user, profile) {
        await this.bot.setChatPhoto(Number(user.id), profile);
    }
}
exports.default = TelegramBot;
//# sourceMappingURL=TelegramBot.js.map