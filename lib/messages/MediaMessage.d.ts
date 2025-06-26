/// <reference types="node" />
import Message, { MessageType } from './Message';
import Chat from '../modules/chat/Chat';
/** Mídia de uma mensagem */
export declare type Media = {
    stream: any;
};
export default class MediaMessage extends Message {
    /** O tipo de mensagem é Media. */
    readonly type: MessageType;
    /** O tipo MIME da mídia (por padrão, application/octet-stream). */
    mimetype: string;
    /** O arquivo de mídia, que pode ser um objeto Media, Buffer ou uma string. */
    file: Media | Buffer | string;
    /** Indica se a mídia é um GIF. */
    isGIF: boolean;
    /** O nome da mídia. */
    name: string;
    /**
     * Cria uma instância de MediaMessage.
     * @param file - O arquivo de mídia a ser anexado.
     * @param chat - O chat ou ID do chat ao qual a mensagem pertence (opcional).
     * @param text - O texto da mensagem (opcional).
     * @param others - Outros dados a serem injetados na instância (opcional).
     */
    constructor(chat?: Chat | string, text?: string, file?: Media | Buffer | string, others?: Partial<MediaMessage>);
    /**
     * Obtém um stream de dados da mensagem de mídia.
     * @returns Um Buffer contendo os dados da mídia.
     */
    getStream(): Promise<Buffer>;
    /**
     * Converte o objeto atual para uma representação em formato JSON.
     * @returns Um objeto JSON que representa o estado atual do objeto.
     */
    toJSON(): any;
    /**
     * Desserializa um objeto JSON em uma instância de MediaMessage.
     * @param data - O objeto JSON a ser desserializado.
     * @returns Uma instância de MediaMessage.
     */
    static fromJSON(data: any): MediaMessage;
    /**
     * Desserializa um objeto JSON de mídia em uma instância de MediaMessage.
     * @param data - O objeto JSON de mídia a ser desserializado.
     * @returns Uma instância da mensagem de mídia passada.
     */
    static fromMediaJSON<T extends MediaMessage>(data: any, mediaMessage: T): T;
    /**
     * Verifica se um objeto é uma instância válida de MediaMessage.
     * @param message - O objeto a ser verificado.
     * @returns Verdadeiro se o objeto for uma instância válida de MediaMessage, caso contrário, falso.
     */
    static isValid(message: any): message is MediaMessage;
}
