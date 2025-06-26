"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ClientNotDefinedError_1 = __importDefault(require("../../errors/ClientNotDefinedError"));
const ClientUtils_1 = require("../../utils/ClientUtils");
class User {
    /**
     * Cria uma instância de User.
     * @param id - O ID do usuário.
     * @param name - O nome do usuário (opcional, padrão é uma string vazia).
     */
    constructor(id, name) {
        /** ID do bot associado a este usuário */
        this.botId = '';
        /** ID do cliente associado a este usuário */
        this.clientId = '';
        /** ID do usuário */
        this.id = '';
        this.id = id;
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
    /** Bloqueia o usuário. */
    async blockUser() {
        await this.client.blockUser(this);
    }
    /** Desbloqueia o usuário. */
    async unblockUser() {
        await this.client.unblockUser(this);
    }
    /** Retorna o nome do usuário. */
    async getName() {
        return this.client.getUserName(this);
    }
    /**
     * Define o nome do usuário.
     * @param name - O novo nome para definir.
     */
    async setName(name) {
        await this.client.setUserName(this, name);
    }
    /** Retorna a descrição do usuário. */
    async getDescription() {
        return this.client.getUserDescription(this);
    }
    /**
     * Define a descrição do usuário.
     * @param description - A nova descrição para definir.
     */
    async setDescription(description) {
        await this.client.setUserDescription(this, description);
    }
    /** Retorna o perfil do usuário. */
    async getProfile() {
        return this.client.getUserProfile(this);
    }
    /**
     * Define o perfil do usuário.
     * @param image - O novo perfil para definir como um Buffer.
     */
    async setProfile(image) {
        await this.client.setUserProfile(this, image);
    }
    /**
     * Verifica se o usuário é um administrador de um chat.
     * @param chat - O chat ou ID do chat a ser verificado.
     */
    async isAdmin(chat) {
        const admins = await this.client.getChatAdmins(chat);
        return admins.includes(this.id);
    }
    /**
     * Verifica se o usuário é o líder de um chat.
     * @param chat - O chat ou ID do chat a ser verificado.
     */
    async isLeader(chat) {
        const leader = await this.client.getChatLeader(chat);
        return (leader === null || leader === void 0 ? void 0 : leader.id) == this.id;
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
     * Cria uma instância de User a partir de uma representação em formato JSON.
     * @param data - Os dados JSON a serem usados para criar a instância.
     */
    static fromJSON(data) {
        if (!data || typeof data != 'object') {
            return new User('');
        }
        const user = new User('');
        if (data.botId)
            user.botId = data.botId;
        if (data.clientId)
            user.clientId = data.clientId;
        if (data.id)
            user.id = data.id;
        if (data.name)
            user.name = data.name;
        if (data.savedName)
            user.phoneNumber = data.phoneNumber;
        if (data.phoneNumber)
            user.phoneNumber = data.phoneNumber;
        if (data.description)
            user.description = data.description;
        if (data.profileUrl)
            user.profileUrl = data.profileUrl;
        if (data.nickname)
            user.nickname = data.nickname;
        return user;
    }
    /**
     * Retorna uma instância de User com base em um ID e/ou dados passados.
     * @param user - O ID do usuário ou uma instância existente de User.
     * @param data - Dados que serão aplicados no usuário.
     */
    static apply(user, data) {
        if (!user || typeof user != 'object') {
            user = new User(`${user}`);
        }
        else {
            user = User.fromJSON(user);
        }
        for (const key of Object.keys(data || {})) {
            user[key] = data === null || data === void 0 ? void 0 : data[key];
        }
        return user;
    }
    /**
     * Retorna o ID de um usuário.
     * @param user - O usuário ou ID do usuário de onde obter o ID.
     * @returns O ID do usuário como uma string, ou uma string vazia se o usuário for inválido.
     */
    static getId(user) {
        if (typeof user === 'object') {
            return user === null || user === void 0 ? void 0 : user.id;
        }
        if (typeof user === 'string') {
            return user;
        }
        return undefined;
    }
    /**
     * Verifica se um objeto é uma instância válida de User.
     * @param user - O objeto a ser verificado.
     */
    static isValid(user) {
        return (typeof user === 'object' &&
            Object.keys(new User('')).every((key) => key in user));
    }
}
exports.default = User;
//# sourceMappingURL=User.js.map