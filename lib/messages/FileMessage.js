"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const MediaMessage_1 = __importDefault(require("./MediaMessage"));
const Generic_1 = require("../utils/Generic");
const Message_1 = require("./Message");
class FileMessage extends MediaMessage_1.default {
    /**
     * Cria uma nova instância de FileMessage.
     * @param file - O arquivo, que pode ser um objeto Media, um buffer ou uma string.
     * @param chat - O chat associado à mensagem de arquivo (opcional).
     * @param others - Outras propriedades da mensagem de arquivo (opcional).
     */
    constructor(chat, text, file = Buffer.from(""), others = {}) {
        super(chat, text, file);
        /** O tipo da mensagem é sempre MessageType.File. */
        this.type = Message_1.MessageType.File;
        (0, Generic_1.injectJSON)(others, this);
    }
    /**
     * Obtém o arquivo da mensagem como um fluxo de dados.
     * @returns Os dados do arquivo da mensagem.
     */
    async getFile() {
        return await this.getStream();
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
     * Desserializa um objeto JSON em uma instância de FileMessage.
     * @param data - O objeto JSON a ser desserializado.
     * @returns Uma instância de FileMessage.
     */
    static fromJSON(data) {
        return MediaMessage_1.default.fromMediaJSON(data, new FileMessage());
    }
    /**
     * Verifica se um objeto é uma instância válida de FileMessage.
     * @param message - O objeto a ser verificado como uma instância de FileMessage.
     * @returns Verdadeiro se o objeto for uma instância válida de FileMessage, caso contrário, falso.
     */
    static isValid(message) {
        return MediaMessage_1.default.isValid(message) && (message === null || message === void 0 ? void 0 : message.type) == Message_1.MessageType.File;
    }
}
exports.default = FileMessage;
//# sourceMappingURL=FileMessage.js.map