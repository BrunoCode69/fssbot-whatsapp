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
 * Mensagem customizada.
 * @description Utilize para personalizar diretamente o conteúdo a ser enviado.
 */
class CustomMessage extends Message_1.default {
    /**.
     * @param chat - O chat associado à mensagem.
     * @param content - O conteúdo da mensagem.
     * @param others - Outras propriedades da mensagem.
     */
    constructor(chat, content, others = {}) {
        super(chat, '');
        /** O tipo da mensagem é sempre MessageType.Custom. */
        this.type = Message_1.MessageType.Custom;
        this.content = content || {};
        (0, Generic_1.injectJSON)(others, this);
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
     * Desserializa um objeto JSON em uma instância de CustomMessage.
     * @param data - O objeto JSON a ser desserializado.
     * @returns Uma instância de CustomMessage.
     */
    static fromJSON(data) {
        return Message_1.default.fix(!data || typeof data != 'object'
            ? new CustomMessage()
            : (0, Generic_1.injectJSON)(data, new CustomMessage()));
    }
    /**
     * Verifica se um objeto é uma instância válida de CustomMessage.
     * @param message - O objeto a ser verificado como uma instância de CustomMessage.
     * @returns Verdadeiro se o objeto for uma instância válida de CustomMessage, caso contrário, falso.
     */
    static isValid(message) {
        return Message_1.default.isValid(message) && (message === null || message === void 0 ? void 0 : message.type) == Message_1.MessageType.Custom;
    }
}
exports.default = CustomMessage;
//# sourceMappingURL=CustomMessage.js.map