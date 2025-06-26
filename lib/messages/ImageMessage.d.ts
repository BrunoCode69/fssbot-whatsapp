/// <reference types="node" />
import MediaMessage, { Media } from "./MediaMessage";
import { MessageType } from "./Message";
import Chat from "../modules/chat/Chat";
/**
 * Representa uma mensagem de imagem.
 */
export default class ImageMessage extends MediaMessage {
    /** O tipo da mensagem é sempre MessageType.Image. */
    readonly type = MessageType.Image;
    /** O tipo MIME da imagem (padrão é "image/png"). */
    mimetype: string;
    /**
     * Cria uma nova instância de ImageMessage.
     * @param file - A imagem, que pode ser um objeto Media, um buffer ou uma string.
     * @param chat - O chat associado à mensagem de imagem (opcional).
     * @param others - Outras propriedades da mensagem de imagem (opcional).
     */
    constructor(chat?: Chat | string, text?: string, file?: Media | Buffer | string, others?: Partial<ImageMessage>);
    /**
     * Obtém a imagem da mensagem como um fluxo de dados.
     * @returns Os dados da imagem da mensagem.
     */
    getImage(): Promise<Buffer>;
    /**
     * Converte o objeto atual para uma representação em formato JSON.
     * @returns Um objeto JSON que representa o estado atual do objeto.
     */
    toJSON(): any;
    /**
     * Desserializa um objeto JSON em uma instância de ImageMessage.
     * @param data - O objeto JSON a ser desserializado.
     * @returns Uma instância de ImageMessage.
     */
    static fromJSON(data: any): ImageMessage;
    /**
     * Verifica se um objeto é uma instância válida de ImageMessage.
     * @param message - O objeto a ser verificado como uma instância de ImageMessage.
     * @returns Verdadeiro se o objeto for uma instância válida de ImageMessage, caso contrário, falso.
     */
    static isValid(message: any): message is ImageMessage;
}
