"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const MediaMessage_1 = __importDefault(require("./MediaMessage"));
const Generic_1 = require("../utils/Generic");
const Message_1 = require("./Message");
/**
 * Representa uma mensagem de vídeo.
 */
class VideoMessage extends MediaMessage_1.default {
    /**
     * Cria uma nova instância de VideoMessage.
     * @param chat - O chat associado à mensagem de vídeo (opcional).
     * @param text - O texto da mensagem (opcional).
     * @param file - O vídeo, que pode ser um arquivo de mídia, um Buffer ou uma string (opcional).
     * @param others - Outras propriedades da mensagem de vídeo (opcional).
     */
    constructor(chat, text, file, others = {}) {
        super(chat, text, file);
        /** O tipo da mensagem é sempre MessageType.Video. */
        this.type = Message_1.MessageType.Video;
        /** O tipo MIME do vídeo (padrão é "video/mp4"). */
        this.mimetype = "video/mp4";
        (0, Generic_1.injectJSON)(others, this);
    }
    /**
     * Obtém o vídeo como um stream ou recurso.
     * @returns Um stream ou recurso representando o vídeo.
     */
    getVideo() {
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
     * Cria uma instância de VideoMessage a partir de uma representação em formato JSON.
     * @param data - Os dados JSON a serem usados para criar a instância.
     * @returns Uma instância de VideoMessage criada a partir dos dados JSON.
     */
    static fromJSON(data) {
        return MediaMessage_1.default.fromMediaJSON(data, new VideoMessage());
    }
    /**
     * Verifica se um objeto é uma instância válida de VideoMessage.
     * @param message - O objeto a ser verificado.
     * @returns Verdadeiro se o objeto for uma instância válida de VideoMessage, caso contrário, falso.
     */
    static isValid(message) {
        return MediaMessage_1.default.isValid(message) && (message === null || message === void 0 ? void 0 : message.type) == Message_1.MessageType.Video;
    }
}
exports.default = VideoMessage;
//# sourceMappingURL=VideoMessage.js.map