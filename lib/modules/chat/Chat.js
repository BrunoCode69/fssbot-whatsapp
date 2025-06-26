"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const UserNotDefinedError_1 = __importDefault(require("../../errors/UserNotDefinedError"));
const ClientNotDefinedError_1 = __importDefault(require("../../errors/ClientNotDefinedError"));
const User_1 = __importDefault(require("../../modules/user/User"));
const Message_1 = __importDefault(require("../../messages/Message"));
const ChatType_1 = __importDefault(require("./ChatType"));
const ClientUtils_1 = require("../../utils/ClientUtils");
class Chat {
    /**
     * Cria uma instância de Chat.
     * @param id - O ID do chat.
     * @param type - O tipo do chat (opcional, padrão é ChatType.PV).
     * @param name - O nome do chat (opcional, padrão é uma string vazia).
     */
    constructor(id = '', type = ChatType_1.default.PV, name) {
        this.id = id;
        this.type = type;
        if (name) {
            this.name = name;
        }
    }
    /** Obter o cliente do chat */
    get client() {
        if (!this.clientId) {
            throw new ClientNotDefinedError_1.default();
        }
        return ClientUtils_1.ClientUtils.getClient(this.clientId);
    }
    /** Retorna o nome do chat. */
    async getName() {
        return this.client.getChatName(this);
    }
    /**
     * Define o nome do chat.
     * @param name - O novo nome para definir.
     */
    async setName(name) {
        await this.client.setChatName(this, name);
    }
    /** Retorna a descrição do chat. */
    getDescription() {
        return this.client.getChatDescription(this);
    }
    /**
     * Define a descrição do chat.
     * @param description - A nova descrição para definir.
     */
    async setDescription(description) {
        await this.client.setChatDescription(this, description);
    }
    /** Retorna o perfil do chat. */
    getProfile() {
        return this.client.getChatProfile(this);
    }
    /**
     * Define o perfil do chat.
     * @param image - O novo perfil para definir como um Buffer.
     */
    async setProfile(image) {
        await this.client.setChatProfile(this, image);
    }
    /**
     * Verifica se um usuário é um administrador do chat.
     * @param user - O usuário ou ID do usuário a ser verificado.
     * @returns Verdadeiro se o usuário é um administrador, caso contrário, falso.
     */
    async isAdmin(user) {
        const admins = await this.client.getChatAdmins(this);
        const userId = User_1.default.getId(user);
        if (!userId) {
            throw new UserNotDefinedError_1.default();
        }
        return admins.includes(userId);
    }
    /**
     * Verifica se um usuário é o líder do chat.
     * @param user - O usuário ou ID do usuário a ser verificado.
     * @returns verdadeiro se o usuário é o líder, caso contrário, falso.
     */
    async isLeader(user) {
        const leader = await this.client.getChatLeader(this);
        return (leader === null || leader === void 0 ? void 0 : leader.id) == User_1.default.getId(user);
    }
    /** Retorna o ID dos administradores do chat. */
    getAdmins() {
        return this.client.getChatAdmins(this);
    }
    /** Retorna o ID dos usuários do chat. */
    getUsers() {
        return this.client.getChatUsers(this);
    }
    /**
     * Adiciona um usuário a este chat.
     * @param user - O usuário ou ID do usuário a ser adicionado.
     */
    async addUser(user) {
        await this.client.addUserInChat(this, user);
    }
    /**
     * Remove um usuário do chat.
     * @param user - O usuário ou ID do usuário a ser removido.
     */
    async removeUser(user) {
        await this.client.removeUserInChat(this, user);
    }
    /**
     * Promove um usuário a administrador do chat.
     * @param user - O usuário ou ID do usuário a ser promovido.
     */
    async promote(user) {
        await this.client.promoteUserInChat(this, user);
    }
    /**
     * Rebaixa um administrador a membro do chat.
     * @param user - O usuário ou ID do usuário a ser rebaixado.
     */
    async demote(user) {
        await this.client.demoteUserInChat(this, user);
    }
    /** Sai do chat. */
    async leave() {
        await this.client.leaveChat(this);
    }
    /**
     * Envia uma mensagem para este chat.
     * @param message - A mensagem ou objeto Message a ser enviado.
     * @returns Uma Promise que resolve para a mensagem enviada.
     */
    async send(message) {
        const msg = Message_1.default.apply(message);
        if (!msg.chat.id) {
            msg.chat.id = this.id;
        }
        if (!msg.user.id && this.clientId) {
            msg.user.id = this.clientId;
        }
        const newMessage = await this.client.send(msg);
        return newMessage;
    }
    /**
     * Altera o status do chat.
     * @param status - O novo status a ser definido.
     * @returns Uma Promise que resolve quando o status do chat é alterado com sucesso.
     */
    async changeStatus(status) {
        await this.client.changeChatStatus(this, status);
    }
    /**
     * Converte o objeto atual para uma representação em formato JSON.
     * @returns Um objeto JSON que representa o estado atual do objeto.
     */
    toJSON() {
        const data = {};
        for (const [key, value] of Object.entries(this)) {
            if (key == 'toJSON')
                continue;
            data[key] = value;
        }
        return JSON.parse(JSON.stringify(data));
    }
    /**
     * Cria uma instância de Chat a partir de uma representação em formato JSON.
     * @param data - Os dados JSON a serem usados para criar a instância.
     * @returns Uma instância de Chat criada a partir dos dados JSON.
     */
    static fromJSON(data) {
        if (!data || typeof data != 'object') {
            return new Chat('');
        }
        const chat = new Chat('');
        if (data.botId)
            chat.botId = data.botId;
        if (data.clientId)
            chat.clientId = data.clientId;
        if (data.id)
            chat.id = data.id;
        if (data.type)
            chat.type = data.type;
        if (data.name)
            chat.name = data.name;
        if (data.phoneNumber)
            chat.phoneNumber = data.phoneNumber;
        if (data.description)
            chat.description = data.description;
        if (data.profileUrl)
            chat.profileUrl = data.profileUrl;
        if (data.timestamp)
            chat.timestamp = data.timestamp;
        if (data.admins)
            chat.admins = data.admins;
        if (data.leader)
            chat.leader = data.leader;
        if (data.users)
            chat.users = data.users;
        if (data.nickname)
            chat.nickname = data.nickname;
        return chat;
    }
    /**
     * Retorna o ID de um chat.
     * @param chat - O chat ou ID do chat de onde obter o ID.
     */
    static getId(chat) {
        if (typeof chat == 'object') {
            return chat === null || chat === void 0 ? void 0 : chat.id;
        }
        if (typeof chat == 'string') {
            return chat;
        }
        return undefined;
    }
    /**
     * Retorna uma instância de Chat com base em um ID e/ou dados passados.
     * @param chat - O ID do chat ou uma instância existente de Chat.
     * @param data - Dados que serão aplicados no chat.
     */
    static apply(chat, data) {
        if (!chat || typeof chat != 'object') {
            chat = new Chat(`${chat}`);
        }
        else {
            chat = Chat.fromJSON(chat);
        }
        for (const [key, value] of Object.entries(data || {})) {
            chat[key] = value;
        }
        return chat;
    }
    /**
     * Verifica se um objeto é uma instância válida de Chat.
     * @param chat - O objeto a ser verificado.
     * @returns Verdadeiro se o objeto for uma instância válida de Chat, caso contrário, falso.
     */
    static isValid(chat) {
        if (typeof chat != 'object')
            return false;
        const keys = Object.keys(new Chat(''));
        return keys.every((key) => key in chat);
    }
}
exports.default = Chat;
//# sourceMappingURL=Chat.js.map