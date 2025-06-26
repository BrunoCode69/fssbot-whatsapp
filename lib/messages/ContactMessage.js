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
const Message_1 = __importStar(require("./Message"));
const Generic_1 = require("../utils/Generic");
const User_1 = __importDefault(require("../modules/user/User"));
/**
 * Representa uma mensagem de contato.
 */
class ContactMessage extends Message_1.default {
    /**
     * Cria uma nova instância de ContactMessage.
     * @param contacts - Uma matriz de contatos, que podem ser objetos User ou IDs de usuário (opcional).
     * @param chat - O chat associado à mensagem de contato (opcional).
     * @param text - O texto da mensagem (opcional).
     * @param others - Outras propriedades da mensagem de contato (opcional).
     */
    constructor(chat, text, contacts = [], others = {}) {
        super(chat, text);
        /** O tipo da mensagem é sempre MessageType.Contact. */
        this.type = Message_1.MessageType.Contact;
        /** Lista de contatos associados à mensagem. */
        this.contacts = [];
        this.contacts = contacts.map((contact) => User_1.default.apply(contact));
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
     * Desserializa um objeto JSON em uma instância de ContactMessage.
     * @param data - O objeto JSON a ser desserializado.
     * @returns Uma instância de ContactMessage.
     */
    static fromJSON(data) {
        return Message_1.default.fix(!data || typeof data != "object" ? new ContactMessage() : (0, Generic_1.injectJSON)(data, new ContactMessage()));
    }
    /**
     * Verifica se um objeto é uma instância válida de ContactMessage.
     * @param message - O objeto a ser verificado como uma instância de ContactMessage.
     * @returns Verdadeiro se o objeto for uma instância válida de ContactMessage, caso contrário, falso.
     */
    static isValid(message) {
        return Message_1.default.isValid(message) && (message === null || message === void 0 ? void 0 : message.type) == Message_1.MessageType.Contact;
    }
}
exports.default = ContactMessage;
//# sourceMappingURL=ContactMessage.js.map