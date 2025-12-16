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
exports.ListType = void 0;
const Message_1 = __importStar(require("./Message"));
const Generic_1 = require("../utils/Generic");
/**
 * Tipos de lista disponíveis
 */
var ListType;
(function (ListType) {
    /** Lista desconhecida/padrão */
    ListType[ListType["UNKNOWN"] = 0] = "UNKNOWN";
    /** Lista com seleção única */
    ListType[ListType["SINGLE_SELECT"] = 1] = "SINGLE_SELECT";
    /** Lista com múltiplas seleções */
    ListType[ListType["MULTI_SELECT"] = 2] = "MULTI_SELECT";
})(ListType = exports.ListType || (exports.ListType = {}));
/**
 * Representa uma mensagem com lista
 */
class ListMessage extends Message_1.default {
    /**
     * Cria uma nova instância de ListMessage.
     * @param chat - O chat associado à mensagem (opcional).
     * @param text - O texto da mensagem (opcional).
     * @param list - Lista de seções (padrão é uma lista vazia).
     * @param others - Outras propriedades da mensagem (opcional).
     */
    constructor(chat, text, list = [], others = {}) {
        super(chat, text);
        /** O tipo da mensagem é MessageType.List */
        this.type = Message_1.MessageType.List;
        /** Lista de seções */
        this.list = [];
        /** Título da mensagem */
        this.title = "";
        /** Rodapé da mensagem */
        this.footer = "";
        /** Texto do botão que abre a lista */
        this.button = "Ver Opções";
        /** Tipo da lista */
        this.listType = ListType.SINGLE_SELECT;
        /** Se deve usar modo interativo (apenas Mobile) */
        this.interactiveMode = false;
        this.list = list;
        (0, Generic_1.injectJSON)(others, this);
    }
    /**
     * Adiciona uma categoria/seção à lista
     * @param title - Título da seção
     * @param label - Rótulo para destaque (opcional)
     */
    addCategory(title, label) {
        this.list.push({
            title,
            label,
            items: [],
        });
        return this;
    }
    /**
     * Adiciona um item a uma seção da lista
     * @param categoryIndex - Índice da seção
     * @param title - Título do item
     * @param description - Descrição do item (opcional)
     * @param id - ID do item (opcional)
     * @param header - Cabeçalho do item (opcional)
     */
    addItem(categoryIndex, title, description, id, header) {
        if (categoryIndex < 0 || categoryIndex >= this.list.length) {
            throw new Error(`Category index ${categoryIndex} is out of bounds`);
        }
        this.list[categoryIndex].items.push({
            id: id || `${Date.now()}-${Math.random()}`,
            title,
            description,
            header,
        });
        return this;
    }
    /**
     * Remove um item de uma seção
     * @param categoryIndex - Índice da seção
     * @param item - Item a remover
     */
    removeItem(categoryIndex, item) {
        if (categoryIndex < 0 || categoryIndex >= this.list.length) {
            throw new Error(`Category index ${categoryIndex} is out of bounds`);
        }
        this.list[categoryIndex].items = this.list[categoryIndex].items.filter((i) => i.id !== item.id);
        return this;
    }
    /**
     * Define o título da mensagem
     * @param title - Título
     */
    setTitle(title) {
        this.title = title;
        return this;
    }
    /**
     * Define o rodapé da mensagem
     * @param footer - Rodapé
     */
    setFooter(footer) {
        this.footer = footer;
        return this;
    }
    /**
     * Define o texto do botão
     * @param button - Texto do botão
     */
    setButton(button) {
        this.button = button;
        return this;
    }
    /**
     * Define o tipo da lista
     * @param type - Tipo da lista
     */
    setListType(type) {
        this.listType = type;
        return this;
    }
    /**
     * Habilita o modo interativo (apenas Mobile)
     * @param enabled - Se deve habilitar
     */
    setInteractiveMode(enabled) {
        this.interactiveMode = enabled;
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
     * Desserializa um objeto JSON em uma instância de ListMessage.
     * @param message - O objeto JSON a ser desserializado.
     * @returns Uma instância de ListMessage.
     */
    static fromJSON(message) {
        if (!message || typeof message != "object") {
            return new ListMessage();
        }
        const listMessage = Message_1.default.fix((0, Generic_1.injectJSON)(message, new ListMessage()));
        listMessage.list = (message === null || message === void 0 ? void 0 : message.list) || [];
        listMessage.title = (message === null || message === void 0 ? void 0 : message.title) || "";
        listMessage.footer = (message === null || message === void 0 ? void 0 : message.footer) || "";
        listMessage.button = (message === null || message === void 0 ? void 0 : message.button) || "Ver Opções";
        listMessage.listType = (message === null || message === void 0 ? void 0 : message.listType) || ListType.SINGLE_SELECT;
        listMessage.interactiveMode = (message === null || message === void 0 ? void 0 : message.interactiveMode) || false;
        return listMessage;
    }
    /**
     * Verifica se um objeto é uma instância válida de ListMessage.
     * @param message - O objeto a ser verificado.
     * @returns `true` se for uma instância válida de ListMessage.
     */
    static isValid(message) {
        return Message_1.default.isValid(message) && (message === null || message === void 0 ? void 0 : message.type) == Message_1.MessageType.List;
    }
}
exports.default = ListMessage;
//# sourceMappingURL=ListMessage.js.map