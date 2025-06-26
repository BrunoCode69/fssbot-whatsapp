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
const ClientUtils_1 = require("../utils/ClientUtils");
const Generic_1 = require("../utils/Generic");
class MediaMessage extends Message_1.default {
    /**
     * Cria uma instância de MediaMessage.
     * @param file - O arquivo de mídia a ser anexado.
     * @param chat - O chat ou ID do chat ao qual a mensagem pertence (opcional).
     * @param text - O texto da mensagem (opcional).
     * @param others - Outros dados a serem injetados na instância (opcional).
     */
    constructor(chat, text, file = Buffer.from(''), others = {}) {
        super(chat, text);
        /** O tipo de mensagem é Media. */
        this.type = Message_1.MessageType.Media;
        /** O tipo MIME da mídia (por padrão, application/octet-stream). */
        this.mimetype = 'application/octet-stream';
        /** Indica se a mídia é um GIF. */
        this.isGIF = false;
        /** O nome da mídia. */
        this.name = '';
        this.file = file;
        (0, Generic_1.injectJSON)(others, this);
    }
    /**
     * Obtém um stream de dados da mensagem de mídia.
     * @returns Um Buffer contendo os dados da mídia.
     */
    async getStream() {
        return await ClientUtils_1.ClientUtils.getClient(this.clientId).downloadStreamMessage(this);
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
     * Desserializa um objeto JSON em uma instância de MediaMessage.
     * @param data - O objeto JSON a ser desserializado.
     * @returns Uma instância de MediaMessage.
     */
    static fromJSON(data) {
        return MediaMessage.fromMediaJSON(data, new MediaMessage());
    }
    /**
     * Desserializa um objeto JSON de mídia em uma instância de MediaMessage.
     * @param data - O objeto JSON de mídia a ser desserializado.
     * @returns Uma instância da mensagem de mídia passada.
     */
    static fromMediaJSON(data, mediaMessage) {
        mediaMessage = MediaMessage.fix(!data || typeof data != 'object'
            ? mediaMessage
            : (0, Generic_1.injectJSON)(data, mediaMessage));
        if (data && typeof data == 'object' && (data === null || data === void 0 ? void 0 : data.file)) {
            mediaMessage.file = data.file;
        }
        return mediaMessage;
    }
    /**
     * Verifica se um objeto é uma instância válida de MediaMessage.
     * @param message - O objeto a ser verificado.
     * @returns Verdadeiro se o objeto for uma instância válida de MediaMessage, caso contrário, falso.
     */
    static isValid(message) {
        return (typeof message === 'object' &&
            Object.keys(new MediaMessage()).every((key) => key in message));
    }
}
exports.default = MediaMessage;
//# sourceMappingURL=MediaMessage.js.map