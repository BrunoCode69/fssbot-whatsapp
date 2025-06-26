"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const MediaMessage_1 = __importDefault(require("./MediaMessage"));
const Generic_1 = require("../utils/Generic");
const Message_1 = require("./Message");
class AudioMessage extends MediaMessage_1.default {
    /**
     * Cria uma nova instância de AudioMessage.
     * @param file - O arquivo de áudio, que pode ser um objeto Media, um buffer ou uma string.
     * @param chat - O chat associado à mensagem de áudio (opcional).
     * @param others - Outras propriedades da mensagem de áudio (opcional).
     */
    constructor(chat, file = Buffer.from(""), others = {}) {
        super(chat, "", file);
        /** O tipo da mensagem é sempre MessageType.Audio. */
        this.type = Message_1.MessageType.Audio;
        /** O tipo MIME da mensagem de áudio (padrão é "audio/mp4"). */
        this.mimetype = "audio/mp4";
        /** É uma mensagem de audio gravada */
        this.isPTT = false;
        /** Duração do audio */
        this.duration = 0;
        (0, Generic_1.injectJSON)(others, this);
    }
    /**
     * Obtém o áudio da mensagem como um fluxo de dados.
     * @returns Uma Promise que resolve para o fluxo de áudio da mensagem.
     */
    async getAudio() {
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
     * Desserializa um objeto JSON em uma instância de AudioMessage.
     * @param data - O objeto JSON a ser desserializado.
     * @returns Uma instância de AudioMessage.
     */
    static fromJSON(data) {
        return MediaMessage_1.default.fromMediaJSON(data, new AudioMessage());
    }
    /**
     * Verifica se um objeto é uma instância válida de AudioMessage.
     * @param message - O objeto a ser verificado como uma instância de AudioMessage.
     * @returns Verdadeiro se o objeto for uma instância válida de AudioMessage, caso contrário, falso.
     */
    static isValid(message) {
        return MediaMessage_1.default.isValid(message) && (message === null || message === void 0 ? void 0 : message.type) == Message_1.MessageType.Audio;
    }
}
exports.default = AudioMessage;
//# sourceMappingURL=AudioMessage.js.map