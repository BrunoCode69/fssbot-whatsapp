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
exports.ButtonType = void 0;
const Message_1 = __importStar(require("./Message"));
const Generic_1 = require("../utils/Generic");
/**
 * Tipos de botão disponíveis
 */
var ButtonType;
(function (ButtonType) {
    /** Botão que retorna uma resposta rápida */
    ButtonType["Reply"] = "reply";
    /** Botão que abre uma URL */
    ButtonType["Url"] = "url";
    /** Botão para fazer uma chamada */
    ButtonType["Call"] = "call";
})(ButtonType = exports.ButtonType || (exports.ButtonType = {}));
/**
 * Representa uma mensagem com botões
 */
class ButtonMessage extends Message_1.default {
    /**
     * Cria uma nova instância de ButtonMessage.
     * @param chat - O chat associado à mensagem (opcional).
     * @param text - O texto da mensagem (opcional).
     * @param buttons - Lista de botões (padrão é uma lista vazia).
     * @param others - Outras propriedades da mensagem (opcional).
     */
    constructor(chat, text, buttons = [], others = {}) {
        super(chat, text);
        /** O tipo da mensagem é MessageType.Button */
        this.type = Message_1.MessageType.Button;
        /** Lista de botões da mensagem */
        this.buttons = [];
        /** Rodapé da mensagem */
        this.footer = "";
        this.buttons = buttons;
        (0, Generic_1.injectJSON)(others, this);
    }
    /**
     * Adiciona um botão de resposta rápida
     * @param text - Texto do botão
     * @param id - ID da resposta rápida
     */
    addReply(text, id) {
        this.buttons.push({
            type: ButtonType.Reply,
            text,
            content: id,
        });
        return this;
    }
    /**
     * Adiciona um botão de URL
     * @param text - Texto do botão
     * @param url - URL para abrir
     */
    addUrl(text, url) {
        this.buttons.push({
            type: ButtonType.Url,
            text,
            content: url,
        });
        return this;
    }
    /**
     * Adiciona um botão de chamada
     * @param text - Texto do botão
     * @param phone - Número de telefone
     */
    addCall(text, phone) {
        this.buttons.push({
            type: ButtonType.Call,
            text,
            content: String(phone),
        });
        return this;
    }
    /**
     * Remove um botão
     * @param button - Botão a remover
     */
    removeButton(button) {
        this.buttons = this.buttons.filter((btn) => !(btn.type === button.type && btn.text === button.text && btn.content === button.content));
        return this;
    }
    /**
     * Define o rodapé da mensagem
     * @param footer - Texto do rodapé
     */
    setFooter(footer) {
        this.footer = footer;
        return this;
    }
    /**
     * Serializa a mensagem em um objeto JSON.
     * @returns O objeto JSON representando a mensagem.
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
     * Desserializa um objeto JSON em uma instância de ButtonMessage.
     * @param message - O objeto JSON a ser desserializado.
     * @returns Uma instância de ButtonMessage.
     */
    static fromJSON(message) {
        if (!message || typeof message != "object") {
            return new ButtonMessage();
        }
        const buttonMessage = Message_1.default.fix((0, Generic_1.injectJSON)(message, new ButtonMessage()));
        buttonMessage.buttons = (message === null || message === void 0 ? void 0 : message.buttons) || [];
        buttonMessage.footer = (message === null || message === void 0 ? void 0 : message.footer) || "";
        return buttonMessage;
    }
    /**
     * Verifica se um objeto é uma instância válida de ButtonMessage.
     * @param message - O objeto a ser verificado.
     * @returns `true` se for uma instância válida de ButtonMessage.
     */
    static isValid(message) {
        return Message_1.default.isValid(message) && (message === null || message === void 0 ? void 0 : message.type) == Message_1.MessageType.Button;
    }
}
exports.default = ButtonMessage;
//# sourceMappingURL=ButtonMessage.js.map