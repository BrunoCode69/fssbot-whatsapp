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
const Message_1 = __importStar(require("./Message"));
const Generic_1 = require("../utils/Generic");
/**
 * Representa uma mensagem de reação, que pode ser usada para expressar reações a outras mensagens.
 */
class ReactionMessage extends Message_1.default {
    /**
     * Cria uma nova instância de ReactionMessage.
     * @param chat - O chat associado à mensagem de reação (opcional).
     * @param reaction - A reação a ser enviada (padrão é uma string vazia).
     * @param receive - A mensagem à qual a reação está associada (pode ser o ID da mensagem ou a mensagem real) (opcional).
     * @param others - Outras propriedades da mensagem de reação (opcional).
     */
    constructor(chat, reaction = "", receive = "", others = {}) {
        super(chat, reaction);
        /** O tipo da mensagem é sempre MessageType.Reaction. */
        this.type = Message_1.MessageType.Reaction;
        // Define o ID da mensagem com base no parâmetro 'receive'.
        this.id = typeof receive === "string" ? receive : typeof receive == "object" ? (receive === null || receive === void 0 ? void 0 : receive.id) || "" : "";
        (0, Generic_1.injectJSON)(others, this);
    }
    /**
     * Converte o objeto atual para uma representação em formato JSON.
     * @returns Um objeto JSON que representa o estado atual do objeto.
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
     * Desserializa um objeto JSON em uma instância de ReactionMessage.
     * @param data - O objeto JSON a ser desserializado.
     * @returns Uma instância de ReactionMessage.
     */
    static fromJSON(data) {
        return Message_1.default.fix(!data || typeof data != "object" ? new ReactionMessage() : (0, Generic_1.injectJSON)(data, new ReactionMessage()));
    }
    /**
     * Verifica se um objeto é uma instância válida de ReactionMessage.
     * @param message - O objeto a ser verificado como uma instância de ReactionMessage.
     * @returns `true` se o objeto for uma instância válida de ReactionMessage, caso contrário, `false`.
     */
    static isValid(message) {
        return Message_1.default.isValid(message) && (message === null || message === void 0 ? void 0 : message.type) == Message_1.MessageType.Reaction;
    }
}
exports.default = ReactionMessage;
//# sourceMappingURL=ReactionMessage.js.map