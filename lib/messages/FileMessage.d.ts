/// <reference types="node" />
import MediaMessage, { Media } from "./MediaMessage";
import { MessageType } from "./Message";
import Chat from "../modules/chat/Chat";
export default class FileMessage extends MediaMessage {
    /** O tipo da mensagem é sempre MessageType.File. */
    readonly type = MessageType.File;
    /**
     * Cria uma nova instância de FileMessage.
     * @param file - O arquivo, que pode ser um objeto Media, um buffer ou uma string.
     * @param chat - O chat associado à mensagem de arquivo (opcional).
     * @param others - Outras propriedades da mensagem de arquivo (opcional).
     */
    constructor(chat?: Chat | string, text?: string, file?: Media | Buffer | string, others?: Partial<FileMessage>);
    /**
     * Obtém o arquivo da mensagem como um fluxo de dados.
     * @returns Os dados do arquivo da mensagem.
     */
    getFile(): Promise<Buffer>;
    /**
     * Converte o objeto atual para uma representação em formato JSON.
     * @returns Um objeto JSON que representa o estado atual do objeto.
     */
    toJSON(): any;
    /**
     * Desserializa um objeto JSON em uma instância de FileMessage.
     * @param data - O objeto JSON a ser desserializado.
     * @returns Uma instância de FileMessage.
     */
    static fromJSON(data: any): FileMessage;
    /**
     * Verifica se um objeto é uma instância válida de FileMessage.
     * @param message - O objeto a ser verificado como uma instância de FileMessage.
     * @returns Verdadeiro se o objeto for uma instância válida de FileMessage, caso contrário, falso.
     */
    static isValid(message: any): message is FileMessage;
}
