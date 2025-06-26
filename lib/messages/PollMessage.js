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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PollAction = void 0;
const Message_1 = __importStar(require("./Message"));
const Generic_1 = require("../utils/Generic");
/**
 * Enumerador que define as ações relacionadas a uma enquete.
 */
var PollAction;
(function (PollAction) {
    /** Ação de criação de uma nova enquete. */
    PollAction["Create"] = "create";
    /** Ação de adição de opções a uma enquete existente. */
    PollAction["Add"] = "add";
    /** Ação de remoção de opções de uma enquete existente. */
    PollAction["Remove"] = "remove";
})(PollAction = exports.PollAction || (exports.PollAction = {}));
/**
 * Representa uma mensagem de enquete.
 */
class PollMessage extends Message_1.default {
    /**
     * Cria uma nova instância de PollMessage.
     * @param chat - O chat associado à mensagem de enquete (opcional).
     * @param text - O texto da mensagem (opcional).
     * @param options - Lista de opções da enquete (padrão é uma lista vazia).
     * @param others - Outras propriedades da mensagem de enquete (opcional).
     */
    constructor(chat, text, options = [], others = {}) {
        super(chat, text);
        /** O tipo da mensagem é MessageType.Poll ou MessageType.PollUpdate. */
        this.type = Message_1.MessageType.Poll;
        /** Mapa de votos por usuário. */
        this.votes = {};
        /** Chave secreta associada à enquete. */
        this.secretKey = Buffer.from("");
        /** Lista de opções da enquete. */
        this.options = [];
        /** Ação relacionada à enquete (Create, Add ou Remove). */
        this.action = PollAction.Create;
        this.options = options;
        (0, Generic_1.injectJSON)(others, this);
    }
    /**
     * Adiciona uma nova opção à enquete.
     * @param name - Nome da nova opção.
     * @param id - Identificador da nova opção (padrão é um timestamp em forma de string).
     */
    addOption(name, id = `${Date.now()}`) {
        this.options.push({ name, id });
    }
    /**
     * Remove uma opção da enquete.
     * @param option - Opção a ser removida.
     */
    removeOption(option) {
        this.options = this.options.filter((opt) => !(opt.id == option.id && opt.name == option.name));
    }
    /**
     * Obtém os votos de um usuário na enquete.
     * @param user - ID do usuário.
     * @returns Uma matriz de votos do usuário.
     */
    getUserVotes(user) {
        return this.votes[user] || [];
    }
    /**
     * Define os votos de um usuário na enquete.
     * @param user - ID do usuário.
     * @param hashVotes - Uma matriz de votos do usuário.
     */
    setUserVotes(user, hashVotes) {
        this.votes[user] = hashVotes;
    }
    /**
     * Serializa a mensagem de enquete em um objeto JSON.
     * @returns O objeto JSON representando a mensagem de enquete.
     */
    toJSON() {
        const data = {};
        for (const key of Object.keys(this)) {
            if (key == "toJSON")
                continue;
            data[key] = this[key];
        }
        return JSON.parse(JSON.stringify(data));
    }
    /**
     * Desserializa um objeto JSON em uma instância de PollMessage.
     * @param message - O objeto JSON a ser desserializado.
     * @returns Uma instância de PollMessage.
     */
    static fromJSON(message) {
        if (!message || typeof message != "object") {
            return new PollMessage();
        }
        const pollMessage = Message_1.default.fix((0, Generic_1.injectJSON)(message, new PollMessage()));
        pollMessage.secretKey = Buffer.from((message === null || message === void 0 ? void 0 : message.secretKey) || "");
        pollMessage.votes = (message === null || message === void 0 ? void 0 : message.votes) || [];
        return pollMessage;
    }
    /**
     * Verifica se um objeto é uma instância válida de PollMessage.
     * @param message - O objeto a ser verificado como uma instância de PollMessage.
     * @returns `true` se o objeto for uma instância válida de PollMessage, caso contrário, `false`.
     */
    static isValid(message) {
        return Message_1.default.isValid(message) && ((message === null || message === void 0 ? void 0 : message.type) == Message_1.MessageType.Poll || (message === null || message === void 0 ? void 0 : message.type) == Message_1.MessageType.PollUpdate);
    }
}
exports.default = PollMessage;
//# sourceMappingURL=PollMessage.js.map