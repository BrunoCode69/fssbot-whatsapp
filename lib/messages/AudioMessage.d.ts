/// <reference types="node" />
import MediaMessage, { Media } from "./MediaMessage";
import { MessageType } from "./Message";
import Chat from "../modules/chat/Chat";
export default class AudioMessage extends MediaMessage {
    /** O tipo da mensagem é sempre MessageType.Audio. */
    readonly type = MessageType.Audio;
    /** O tipo MIME da mensagem de áudio (padrão é "audio/mp4"). */
    mimetype: string;
    /** É uma mensagem de audio gravada */
    isPTT: boolean;
    /** Duração do audio */
    duration: number;
    /**
     * Cria uma nova instância de AudioMessage.
     * @param file - O arquivo de áudio, que pode ser um objeto Media, um buffer ou uma string.
     * @param chat - O chat associado à mensagem de áudio (opcional).
     * @param others - Outras propriedades da mensagem de áudio (opcional).
     */
    constructor(chat?: Chat | string, file?: Media | Buffer | string, others?: Partial<AudioMessage>);
    /**
     * Obtém o áudio da mensagem como um fluxo de dados.
     * @returns Uma Promise que resolve para o fluxo de áudio da mensagem.
     */
    getAudio(): Promise<Buffer>;
    /**
     * Converte o objeto atual para uma representação em formato JSON.
     * @returns Um objeto JSON que representa o estado atual do objeto.
     */
    toJSON(): any;
    /**
     * Desserializa um objeto JSON em uma instância de AudioMessage.
     * @param data - O objeto JSON a ser desserializado.
     * @returns Uma instância de AudioMessage.
     */
    static fromJSON(data: any): AudioMessage;
    /**
     * Verifica se um objeto é uma instância válida de AudioMessage.
     * @param message - O objeto a ser verificado como uma instância de AudioMessage.
     * @returns Verdadeiro se o objeto for uma instância válida de AudioMessage, caso contrário, falso.
     */
    static isValid(message: any): message is AudioMessage;
}
