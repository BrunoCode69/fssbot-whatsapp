"use strict";
// =========================================
// IMPORTANTE: Botões antigos NÃO funcionam mais!
// =========================================
// O formato antigo (templateButtons, buttons) foi DESCONTINUADO
// pelo WhatsApp. Use baileys_helper para botões funcionais.
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
 * Representa uma mensagem com botões.
 * ATENÇÃO: Botões tradicionais não funcionam mais no Baileys 7.x
 * Use baileys_helper para botões funcionais
 */
class ButtonMessage extends Message_1.default {
    /**
     * Cria uma nova instância de ButtonMessage
     * @param chat - Chat associado à mensagem
     * @param text - Texto da mensagem
     * @param footer - Texto do rodapé
     * @param others - Outras propriedades
     */
    constructor(chat, text, footer = "", others = {}) {
        super(chat, text);
        /** O tipo da mensagem é sempre MessageType.Button ou MessageType.TemplateButton */
        this.type = Message_1.MessageType.Button;
        /** Lista de botões */
        this.buttons = [];
        /** Usa formato de quick_reply do baileys_helper (recomendado) */
        this.useQuickReply = true;
        this.footer = footer;
        (0, Generic_1.injectJSON)(others, this);
    }
    /**
     * Adiciona um botão de resposta rápida
     * @param text - Texto do botão
     * @param id - ID do botão
     * @param index - Índice do botão (opcional)
     */
    addReply(text, id, index) {
        this.buttons.push({
            type: 'reply',
            text,
            content: id,
            index: index !== null && index !== void 0 ? index : this.buttons.length,
        });
    }
    /**
     * Adiciona um botão de URL
     * @param text - Texto do botão
     * @param url - URL do botão
     * @param index - Índice do botão (opcional)
     */
    addUrl(text, url, index) {
        this.buttons.push({
            type: 'url',
            text,
            content: url,
            index: index !== null && index !== void 0 ? index : this.buttons.length,
        });
    }
    /**
     * Adiciona um botão de chamada
     * @param text - Texto do botão
     * @param phoneNumber - Número de telefone
     * @param index - Índice do botão (opcional)
     */
    addCall(text, phoneNumber, index) {
        this.buttons.push({
            type: 'call',
            text,
            content: phoneNumber,
            index: index !== null && index !== void 0 ? index : this.buttons.length,
        });
    }
    /**
     * Converte para formato JSON
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
     * Desserializa um objeto JSON em uma instância de ButtonMessage
     */
    static fromJSON(data) {
        return Message_1.default.fix(!data || typeof data != "object"
            ? new ButtonMessage()
            : (0, Generic_1.injectJSON)(data, new ButtonMessage()));
    }
    /**
     * Verifica se um objeto é uma instância válida de ButtonMessage
     */
    static isValid(message) {
        return (Message_1.default.isValid(message) &&
            ((message === null || message === void 0 ? void 0 : message.type) == Message_1.MessageType.Button ||
                (message === null || message === void 0 ? void 0 : message.type) == Message_1.MessageType.TemplateButton));
    }
}
exports.default = ButtonMessage;
//# sourceMappingURL=ButtonMessage.js.map