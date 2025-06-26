"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagePlataform = exports.MessageStatus = exports.MessageType = void 0;
const Chat_1 = __importDefault(require("../modules/chat/Chat"));
const User_1 = __importDefault(require("../modules/user/User"));
const ClientUtils_1 = require("../utils/ClientUtils");
const Generic_1 = require("../utils/Generic");
/**
 * Tipo da mensagem
 */
var MessageType;
(function (MessageType) {
    MessageType["Empty"] = "empty";
    MessageType["Error"] = "error";
    MessageType["Text"] = "text";
    MessageType["Media"] = "media";
    MessageType["File"] = "file";
    MessageType["Video"] = "video";
    MessageType["Image"] = "image";
    MessageType["Audio"] = "audio";
    MessageType["Sticker"] = "sticker";
    MessageType["Reaction"] = "reaction";
    MessageType["Contact"] = "contact";
    MessageType["Location"] = "location";
    MessageType["Poll"] = "poll";
    MessageType["PollUpdate"] = "pollUpdate";
    MessageType["List"] = "list";
    MessageType["Button"] = "button";
    MessageType["TemplateButton"] = "templateButton";
    MessageType["Custom"] = "customButton";
})(MessageType = exports.MessageType || (exports.MessageType = {}));
/**
 * Status da mensagem
 */
var MessageStatus;
(function (MessageStatus) {
    MessageStatus["Error"] = "ERROR";
    MessageStatus["Sending"] = "SENDING";
    MessageStatus["Sended"] = "SENDED";
    MessageStatus["Received"] = "RECEIVED";
    MessageStatus["Readed"] = "READED";
    MessageStatus["Played"] = "PLAYED";
})(MessageStatus = exports.MessageStatus || (exports.MessageStatus = {}));
/** Plataforma de onde foi enviado uma mensagem */
var MessagePlataform;
(function (MessagePlataform) {
    MessagePlataform["Android"] = "android";
    MessagePlataform["Ios"] = "ios";
    MessagePlataform["Web"] = "web";
    MessagePlataform["Desktop"] = "desktop";
    MessagePlataform["Unknown"] = "unknown";
})(MessagePlataform = exports.MessagePlataform || (exports.MessagePlataform = {}));
class Message {
    constructor(chat = '', text = '', others = {}) {
        /** ID do bot associado a esta mensagem */
        this.botId = '';
        /** ID do cliente associado a esta mensagem */
        this.clientId = '';
        /** Tipo da mensagem */
        this.type = MessageType.Text;
        /** Sala de bate-papo que foi enviada a mensagem */
        this.chat = new Chat_1.default('');
        /** Usuário que mandou a mensagem */
        this.user = new User_1.default('');
        /** Texto da mensagem */
        this.text = '';
        /** Mensagem mencionada na mensagem */
        this.mention = undefined;
        /** ID da mensagem */
        this.id = '';
        /** Mensagem enviada pelo bot */
        this.fromMe = false;
        /** Opção selecionada */
        this.selected = '';
        /** Usuários mencionados na mensagem */
        this.mentions = [];
        /** Tempo em que a mensagem foi enviada */
        this.timestamp = 0;
        /** Status da mensagem */
        this.status = MessageStatus.Sending;
        /** É uma mensasgem de atualização */
        this.isUpdate = false;
        /** A mensagem é editada */
        this.isEdited = false;
        /** A mensagem foi deletada */
        this.isDeleted = false;
        /** A mensagem é de visualização única */
        this.isViewOnce = false;
        /** A mensagem foi enviada por uma API não oficial */
        this.isUnofficial = false;
        /** Plataforma de onde foi enviado a mensagem */
        this.plataform = MessagePlataform.Unknown;
        /** A mensagem recebida é antiga */
        this.isOld = false;
        /** Dados adicionais */
        this.extra = {};
        this.text = text || '';
        this.chat = Chat_1.default.apply(chat || '');
        this.inject(others);
    }
    /**
     * Injeta dados de ujma mensagem na mesnagem atual.
     * @param data - Os dados que serão injetados.
     */
    inject(data) {
        var _a, _b;
        for (const key of Object.keys(data)) {
            this[key] = data[key];
        }
        if (data.clientId) {
            this.clientId = data.clientId;
            this.user.clientId = data.clientId;
            this.chat.clientId = data.clientId;
            (_a = this.mention) === null || _a === void 0 ? void 0 : _a.inject({ clientId: data.clientId });
        }
        if (data.botId) {
            this.botId = data.botId;
            this.user.botId = data.botId;
            this.chat.botId = data.botId;
            (_b = this.mention) === null || _b === void 0 ? void 0 : _b.inject({ botId: data.botId });
        }
    }
    /**
     * * Adiciona uma reação a mensagem.
     * @param emoji - Emoji que será adicionado na reação.
     */
    async addReaction(emoji) {
        return ClientUtils_1.ClientUtils.getClient(this.clientId).addReaction(this, emoji);
    }
    /**
     * * Remove uma reação da mensagem.
     */
    async removeReaction() {
        return ClientUtils_1.ClientUtils.getClient(this.clientId).removeReaction(this);
    }
    /**
     * * Adiciona animações na reação da mensagem.
     * @param reactions Reações em sequência.
     * @param interval Intervalo entre cada reação.
     * @param maxTimeout Maximo de tempo reagindo.
     */
    addAnimatedReaction(reactions, interval, maxTimeout) {
        return ClientUtils_1.ClientUtils.getClient(this.clientId).addAnimatedReaction(this, reactions, interval, maxTimeout);
    }
    /** Envia uma mensagem mencionando a mensagem atual.
     * @param message Mensagem que será enviada.
     * @param isMention Se verdadeiro a mensagem atual é mencionada na mensagem enviada.
     */
    async reply(message, isMention = true) {
        const msg = Message.apply(message, {
            clientId: this.clientId,
            botId: this.botId,
        });
        msg.chat.id = msg.chat.id || this.chat.id;
        msg.user.id = this.botId;
        msg.mention = isMention ? this : msg.mention;
        return ClientUtils_1.ClientUtils.getClient(this.clientId).send(msg);
    }
    /**
     * * Marca mensagem como visualizada.
     */
    async read() {
        return ClientUtils_1.ClientUtils.getClient(this.clientId).readMessage(this);
    }
    /**
     * Converte o objeto atual para uma representação em formato JSON.
     * @returns Um objeto JSON que representa o estado atual do objeto.
     */
    toJSON() {
        const data = {};
        for (const key of Object.keys(this)) {
            if (key == 'toJSON')
                continue;
            data[key] = this[key];
        }
        return JSON.parse(JSON.stringify(data));
    }
    /**
     * Cria uma instância de Message a partir de uma representação em formato JSON.
     * @param data - Os dados JSON a serem usados para criar a instância.
     * @returns Uma instância de Message criada a partir dos dados JSON.
     */
    static fromJSON(data) {
        return Message.fix(!data || typeof data != 'object'
            ? new Message()
            : (0, Generic_1.injectJSON)(data, new Message(), false, true));
    }
    static fix(message) {
        message.chat = Chat_1.default.fromJSON(message.chat);
        message.user = User_1.default.fromJSON(message.user);
        if (message.mention && !(message.mention instanceof Message)) {
            message.mention = Message.fromJSON(message.mention);
        }
        return message;
    }
    /**
     * Obtém uma instância de Message com base em um ID e/ou dados passados.
     * @param message - O ID da mensagem ou uma instância existente de Message.
     * @param data - Dados que serão aplicados na mensagem,.
     * @returns Uma instância de Message com os dados passados.
     */
    static apply(message, data) {
        if (!message || typeof message != 'object') {
            message = new Message('', `${message}`);
        }
        message.inject(data || {});
        return message;
    }
    /**
     * Verifica se um objeto é uma instância válida de Message.
     * @param message - O objeto a ser verificado.
     * @returns Verdadeiro se o objeto for uma instância válida de Message, caso contrário, falso.
     */
    static isValid(message) {
        return (typeof message === 'object' &&
            Object.keys(new Message()).every((key) => key in message));
    }
}
exports.default = Message;
//# sourceMappingURL=Message.js.map