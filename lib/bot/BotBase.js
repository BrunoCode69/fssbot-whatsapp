"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const BotStatus_1 = require("./BotStatus");
const BotEvents_1 = __importDefault(require("./BotEvents"));
class BotBase extends BotEvents_1.default {
    constructor() {
        super(...arguments);
        this.id = '';
        this.status = BotStatus_1.BotStatus.Offline;
        this.phoneNumber = '';
        this.name = '';
        this.profileUrl = '';
    }
    //! #################################################################
    //! ########## MÉTODOS DE CONEXÃO
    //! #################################################################
    async connect(auth) { }
    async reconnect(alert) { }
    async stop(reason) { }
    async logout() { }
    //! #################################################################
    //! ########## MÉTODOS DE MENSAGEM
    //! #################################################################
    async send(message) {
        return message;
    }
    async sendMessage(chat, message, mention) {
        return new Promise(() => { });
    }
    async editMessage(message) { }
    async addReaction(message) { }
    async removeReaction(message) { }
    async readMessage(message) { }
    async removeMessage(message) { }
    async deleteMessage(message) { }
    async downloadStreamMessage(media) {
        return Buffer.from('');
    }
    //! #################################################################
    //! ########## MÉTODOS DO BOT
    //! #################################################################
    async getBotName() {
        return '';
    }
    async setBotName(name) { }
    async getBotDescription() {
        return '';
    }
    async setBotDescription(description) { }
    async getBotProfile(lowQuality) {
        return Buffer.from('');
    }
    async getBotProfileUrl(lowQuality) {
        return '';
    }
    async setBotProfile(image) { }
    //! #################################################################
    //! ########## MÉTODOS DO CHAT
    //! #################################################################
    async getChats() {
        return [];
    }
    async setChats(chats) { }
    async getChat(chat) {
        return null;
    }
    async updateChat(chat) { }
    async removeChat(chat) { }
    async createChat(chat) { }
    async leaveChat(chat) { }
    async addUserInChat(chat, user) { }
    async removeUserInChat(chat, user) { }
    async promoteUserInChat(chat, user) { }
    async demoteUserInChat(chat, user) { }
    async changeChatStatus(chat, status) { }
    async getChatUsers(chat) {
        return [];
    }
    async getChatAdmins(chat) {
        return [];
    }
    async getChatLeader(chat) {
        return '';
    }
    async getChatName(chat) {
        return '';
    }
    async setChatName(chat, name) { }
    async getChatDescription(chat) {
        return '';
    }
    async setChatDescription(chat, description) { }
    async getChatProfile(chat, lowQuality) {
        return Buffer.from('');
    }
    async getChatProfileUrl(chat, lowQuality) {
        return '';
    }
    async setChatProfile(chat, profile) { }
    async joinChat(code) { }
    async getChatInvite(chat) {
        return '';
    }
    async revokeChatInvite(chat) {
        return '';
    }
    async rejectCall(call) {
        return;
    }
    //! #################################################################
    //! ########## MÉTODOS DO USUÁRIO
    //! #################################################################
    async getUsers() {
        return [];
    }
    async setUsers(users) { }
    async getUser(user) {
        return null;
    }
    async updateUser(user) { }
    async removeUser(user) { }
    async unblockUser(user) { }
    async blockUser(user) { }
    async getUserName(user) {
        return '';
    }
    async setUserName(user, name) { }
    async getUserDescription(user) {
        return '';
    }
    async setUserDescription(user, description) { }
    async getUserProfile(user) {
        return Buffer.from('');
    }
    async getUserProfileUrl(user, lowQuality) {
        return '';
    }
    async setUserProfile(user, profile) { }
}
exports.default = BotBase;
//# sourceMappingURL=BotBase.js.map