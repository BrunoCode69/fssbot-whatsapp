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
/** Tipo da lista */
var ListType;
(function (ListType) {
    ListType[ListType["UNKNOWN"] = 0] = "UNKNOWN";
    ListType[ListType["SINGLE_SELECT"] = 1] = "SINGLE_SELECT";
    ListType[ListType["PRODUCT_LIST"] = 2] = "PRODUCT_LIST";
})(ListType = exports.ListType || (exports.ListType = {}));
/**
 * Representa uma mensagem de lista.
 */
class ListMessage extends Message_1.default {
    /**
     * Cria uma nova instância de ListMessage.
     * @param chat - O chat associado à mensagem de lista (opcional).
     * @param text - O texto da mensagem (opcional).
     * @param button - Texto do botão (padrão é uma string vazia).
     * @param footer - Texto do rodapé (padrão é uma string vazia).
     * @param title - Título da lista (padrão é uma string vazia).
     * @param others - Outras propriedades da mensagem de lista (opcional).
     */
    constructor(chat, text, button = "", footer = "", title = "", others = {}) {
        super(chat, text);
        /** O tipo da mensagem é sempre MessageType.List. */
        this.type = Message_1.MessageType.List;
        /** Lista de categorias e itens. */
        this.list = [];
        /** Tipo da lista. Apenas disponível para o `WhatsAppBot`. */
        this.listType = ListType.PRODUCT_LIST;
        /** Usa o modo interactive message. Disponivel apenas para o `WhatsAppBot`. */
        this.interactiveMode = false;
        this.button = button;
        this.footer = footer;
        this.title = title;
        (0, Generic_1.injectJSON)(others, this);
    }
    /**
     * Adiciona uma seção à lista.
     * @param title - Título da categoria.
     * @param items - Itens da categoria (padrão é uma lista vazia).
     * @returns O índice da categoria criada.
     */
    addCategory(title, items = []) {
        const index = this.list.length;
        this.list.push({ title, items });
        return index;
    }
    /**
     * Adiciona um item a uma categoria existente na lista.
     * @param index - Índice da categoria em que o item será adicionado.
     * @param title - Título do item.
     * @param description - Descrição do item (padrão é uma string vazia).
     * @param id - ID do item (padrão é um timestamp em forma de string).
     */
    addItem(index, title, description = "", id = String(Date.now())) {
        return this.list[index].items.push({ title, description, id });
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
     * Desserializa um objeto JSON em uma instância de ListMessage.
     * @param data - O objeto JSON a ser desserializado.
     * @returns Uma instância de ListMessage.
     */
    static fromJSON(data) {
        return Message_1.default.fix(!data || typeof data != "object" ? new ListMessage() : (0, Generic_1.injectJSON)(data, new ListMessage()));
    }
    /**
     * Verifica se um objeto é uma instância válida de ListMessage.
     * @param message - O objeto a ser verificado como uma instância de ListMessage.
     * @returns Verdadeiro se o objeto for uma instância válida de ListMessage, caso contrário, falso.
     */
    static isValid(message) {
        return Message_1.default.isValid(message) && (message === null || message === void 0 ? void 0 : message.type) == Message_1.MessageType.List;
    }
}
exports.default = ListMessage;
//# sourceMappingURL=ListMessage.js.map