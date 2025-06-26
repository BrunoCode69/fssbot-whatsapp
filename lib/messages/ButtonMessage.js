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
 * Tipo de botão disponível.
 */
var ButtonType;
(function (ButtonType) {
    /** Botão de resposta. */
    ButtonType["Reply"] = "reply";
    /** Botão para fazer uma ligação. */
    ButtonType["Call"] = "call";
    /** Botão para abrir uma URL. */
    ButtonType["Url"] = "url";
})(ButtonType = exports.ButtonType || (exports.ButtonType = {}));
/**
 * Representa uma mensagem com botões interativos.
 */
class ButtonMessage extends Message_1.default {
    /**
     * Cria uma nova instância de ButtonMessage.
     * @param chat - O chat associado à mensagem de botões (opcional).
     * @param text - O texto da mensagem (opcional).
     * @param footer - Texto exibido no rodapé da mensagem (padrão é uma string vazia).
     * @param others - Outras propriedades da mensagem de botões (opcional).
     */
    constructor(chat, text, footer = "", others = {}) {
        super(chat, text);
        /** O tipo da mensagem é MessageType.Button ou MessageType.TemplateButton. */
        this.type = Message_1.MessageType.TemplateButton;
        /** Lista de botões associados à mensagem. */
        this.buttons = [];
        this.footer = footer;
        (0, Generic_1.injectJSON)(others, this);
    }
    /**
     * Adiciona um botão de URL à mensagem.
     * @param text - Texto exibido no botão.
     * @param url - URL associada ao botão.
     * @param index - Posição do botão na lista (padrão é a próxima posição disponível).
     */
    addUrl(text, url, index = this.buttons.length + 1) {
        this.buttons.push({ index, type: ButtonType.Url, text, content: url });
    }
    /**
     * Adiciona um botão de chamada telefônica à mensagem.
     * @param text - Texto exibido no botão.
     * @param phone - Número de telefone associado ao botão.
     * @param index - Posição do botão na lista (padrão é a próxima posição disponível).
     */
    addCall(text, phone, index = this.buttons.length + 1) {
        this.buttons.push({ index, type: ButtonType.Call, text, content: phone });
    }
    /**
     * Adiciona um botão de resposta interativa à mensagem.
     * @param text - Texto exibido no botão.
     * @param id - ID de resposta associado ao botão.
     * @param index - Posição do botão na lista (padrão é a próxima posição disponível).
     */
    addReply(text, id = String(this.buttons.length + 1), index = this.buttons.length + 1) {
        this.buttons.push({ index, type: ButtonType.Reply, text, content: id });
    }
    /**
     * Remove um botão da lista com base na posição.
     * @param index - Posição do botão a ser removido.
     */
    remove(index) {
        this.buttons.splice(index, 1);
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
     * Desserializa um objeto JSON em uma instância de ButtonMessage.
     * @param data - O objeto JSON a ser desserializado.
     * @returns Uma instância de ButtonMessage.
     */
    static fromJSON(data) {
        return Message_1.default.fix(!data || typeof data != "object" ? new ButtonMessage() : (0, Generic_1.injectJSON)(data, new ButtonMessage()));
    }
    /**
     * Verifica se um objeto é uma instância válida de ButtonMessage.
     * @param message - O objeto a ser verificado como uma instância de ButtonMessage.
     * @returns Verdadeiro se o objeto for uma instância válida de ButtonMessage, caso contrário, falso.
     */
    static isValid(message) {
        return Message_1.default.isValid(message) && (message === null || message === void 0 ? void 0 : message.type) == Message_1.MessageType.Button;
    }
}
exports.default = ButtonMessage;
//# sourceMappingURL=ButtonMessage.js.map