/// <reference types="node" />
import MediaMessage, { Media } from "./MediaMessage";
import { MessageType } from "./Message";
import Chat from "../modules/chat/Chat";
/**
 * Representa uma mensagem de figurinha (sticker).
 */
export default class StickerMessage extends MediaMessage {
    /** O tipo da mensagem é sempre MessageType.Sticker. */
    readonly type = MessageType.Sticker;
    /** O tipo MIME da figurinha (padrão é "image/webp"). */
    mimetype: string;
    /** Categorias associadas à figurinha. */
    categories: string[];
    /** Identificador único da figurinha. */
    stickerId: string;
    /** Autor ou criador da figurinha. */
    author: string;
    /** Pacote ao qual a figurinha pertence. */
    pack: string;
    /**
     * Cria uma nova instância de StickerMessage.
     * @param chat - O chat associado à mensagem de figurinha (opcional).
     * @param file - A figurinha, que pode ser um arquivo de mídia, um Buffer ou uma string (opcional).
     * @param others - Outras propriedades da mensagem de figurinha (opcional).
     */
    constructor(chat?: Chat | string, file?: Media | Buffer | string, others?: Partial<StickerMessage>);
    /**
     * Obtém a figurinha como um stream ou recurso.
     * @returns Um stream ou recurso representando a figurinha.
     */
    getSticker(): Promise<Buffer>;
    /**
     * Converte o objeto atual para uma representação em formato JSON.
     * @returns Um objeto JSON que representa o estado atual do objeto.
     */
    toJSON(): any;
    /**
     * Desserializa um objeto JSON em uma instância de StickerMessage.
     * @param data - O objeto JSON a ser desserializado.
     * @returns Uma instância de StickerMessage.
     */
    static fromJSON(data: any): StickerMessage;
    /**
     * Verifica se um objeto é uma instância válida de StickerMessage.
     * @param message - O objeto a ser verificado como uma instância de StickerMessage.
     * @returns `true` se o objeto for uma instância válida de StickerMessage, caso contrário, `false`.
     */
    static isValid(message: any): message is StickerMessage;
}
