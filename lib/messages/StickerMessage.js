"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const MediaMessage_1 = __importDefault(require("./MediaMessage"));
const Generic_1 = require("../utils/Generic");
const Message_1 = require("./Message");
/**
 * Representa uma mensagem de figurinha (sticker).
 */
class StickerMessage extends MediaMessage_1.default {
    /**
     * Cria uma nova instância de StickerMessage.
     * @param chat - O chat associado à mensagem de figurinha (opcional).
     * @param file - A figurinha, que pode ser um arquivo de mídia, um Buffer ou uma string (opcional).
     * @param others - Outras propriedades da mensagem de figurinha (opcional).
     */
    constructor(chat, file, others = {}) {
        super(chat, "", file);
        /** O tipo da mensagem é sempre MessageType.Sticker. */
        this.type = Message_1.MessageType.Sticker;
        /** O tipo MIME da figurinha (padrão é "image/webp"). */
        this.mimetype = "image/webp";
        /** Categorias associadas à figurinha. */
        this.categories = [];
        /** Identificador único da figurinha. */
        this.stickerId = "";
        /** Autor ou criador da figurinha. */
        this.author = "";
        /** Pacote ao qual a figurinha pertence. */
        this.pack = "";
        (0, Generic_1.injectJSON)(others, this);
    }
    /**
     * Obtém a figurinha como um stream ou recurso.
     * @returns Um stream ou recurso representando a figurinha.
     */
    getSticker() {
        return this.getStream();
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
     * Desserializa um objeto JSON em uma instância de StickerMessage.
     * @param data - O objeto JSON a ser desserializado.
     * @returns Uma instância de StickerMessage.
     */
    static fromJSON(data) {
        return MediaMessage_1.default.fromMediaJSON(data, new StickerMessage());
    }
    /**
     * Verifica se um objeto é uma instância válida de StickerMessage.
     * @param message - O objeto a ser verificado como uma instância de StickerMessage.
     * @returns `true` se o objeto for uma instância válida de StickerMessage, caso contrário, `false`.
     */
    static isValid(message) {
        return MediaMessage_1.default.isValid(message) && (message === null || message === void 0 ? void 0 : message.type) == Message_1.MessageType.Sticker;
    }
}
exports.default = StickerMessage;
//# sourceMappingURL=StickerMessage.js.map