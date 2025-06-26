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
const PollMessage_1 = __importStar(require("./PollMessage"));
const Generic_1 = require("../utils/Generic");
const Message_1 = require("./Message");
/**
 * Representa uma mensagem de atualização de enquete, que é uma extensão da mensagem de enquete.
 */
class PollUpdateMessage extends PollMessage_1.default {
    /**
     * Cria uma nova instância de PollUpdateMessage.
     * @param chat - O chat associado à mensagem de atualização de enquete (opcional).
     * @param text - O texto da mensagem (opcional).
     * @param options - Lista de opções da enquete (opcional).
     * @param others - Outras propriedades da mensagem de atualização de enquete (opcional).
     */
    constructor(chat, text, options, others = {}) {
        super(chat, text, options);
        /** O tipo da mensagem é MessageType.PollUpdate. */
        this.type = Message_1.MessageType.PollUpdate;
        /**
         * Ação relacionada à mensagem de atualização de enquete.
         * Pode ser PollAction.Add ou PollAction.Remove, padrão é PollAction.Add.
         */
        this.action = PollMessage_1.PollAction.Add;
        (0, Generic_1.injectJSON)(others, this);
    }
    /**
     * Serializa a mensagem de atualização de enquete em um objeto JSON.
     * @returns O objeto JSON representando a mensagem de atualização de enquete.
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
     * Desserializa um objeto JSON em uma instância de PollUpdateMessage.
     * @param message - O objeto JSON a ser desserializado.
     * @returns Uma instância de PollUpdateMessage.
     */
    static fromJSON(message) {
        if (!message || typeof message != "object") {
            return new PollUpdateMessage();
        }
        const pollMessage = PollMessage_1.default.fix((0, Generic_1.injectJSON)(message, new PollUpdateMessage()));
        pollMessage.secretKey = Buffer.from((message === null || message === void 0 ? void 0 : message.secretKey) || "");
        pollMessage.votes = (message === null || message === void 0 ? void 0 : message.votes) || [];
        return pollMessage;
    }
    /**
     * Verifica se um objeto é uma instância válida de PollUpdateMessage.
     * @param message - O objeto a ser verificado como uma instância de PollUpdateMessage.
     * @returns `true` se o objeto for uma instância válida de PollUpdateMessage, caso contrário, `false`.
     */
    static isValid(message) {
        return PollMessage_1.default.isValid(message) && (message === null || message === void 0 ? void 0 : message.type) == Message_1.MessageType.PollUpdate;
    }
}
exports.default = PollUpdateMessage;
//# sourceMappingURL=PollUpdateMessage.js.map