/// <reference types="node" />
import MediaMessage, { Media } from "./MediaMessage";
import { MessageType } from "./Message";
import Chat from "../modules/chat/Chat";
/**
 * Representa uma mensagem de vídeo.
 */
export default class VideoMessage extends MediaMessage {
    /** O tipo da mensagem é sempre MessageType.Video. */
    readonly type = MessageType.Video;
    /** O tipo MIME do vídeo (padrão é "video/mp4"). */
    mimetype: string;
    /**
     * Cria uma nova instância de VideoMessage.
     * @param chat - O chat associado à mensagem de vídeo (opcional).
     * @param text - O texto da mensagem (opcional).
     * @param file - O vídeo, que pode ser um arquivo de mídia, um Buffer ou uma string (opcional).
     * @param others - Outras propriedades da mensagem de vídeo (opcional).
     */
    constructor(chat?: Chat | string, text?: string, file?: Media | Buffer | string, others?: Partial<VideoMessage>);
    /**
     * Obtém o vídeo como um stream ou recurso.
     * @returns Um stream ou recurso representando o vídeo.
     */
    getVideo(): Promise<Buffer>;
    /**
     * Converte o objeto atual para uma representação em formato JSON.
     * @returns Um objeto JSON que representa o estado atual do objeto.
     */
    toJSON(): any;
    /**
     * Cria uma instância de VideoMessage a partir de uma representação em formato JSON.
     * @param data - Os dados JSON a serem usados para criar a instância.
     * @returns Uma instância de VideoMessage criada a partir dos dados JSON.
     */
    static fromJSON(data: any): VideoMessage;
    /**
     * Verifica se um objeto é uma instância válida de VideoMessage.
     * @param message - O objeto a ser verificado.
     * @returns Verdadeiro se o objeto for uma instância válida de VideoMessage, caso contrário, falso.
     */
    static isValid(message: any): message is VideoMessage;
}
