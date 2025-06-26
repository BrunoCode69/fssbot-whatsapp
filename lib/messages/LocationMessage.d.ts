import Message, { MessageType } from "./Message";
import Chat from "../modules/chat/Chat";
/**
 * Representa uma mensagem de localização.
 */
export default class LocationMessage extends Message {
    /** O tipo da mensagem é sempre MessageType.Location. */
    readonly type = MessageType.Location;
    /** A latitude da localização. */
    latitude: number;
    /** A longitude da localização. */
    longitude: number;
    /**
     * Cria uma nova instância de LocationMessage.
     * @param latitude - A latitude da localização (padrão é 0).
     * @param longitude - A longitude da localização (padrão é 0).
     * @param chat - O chat associado à mensagem de localização (opcional).
     * @param others - Outras propriedades da mensagem de localização (opcional).
     */
    constructor(chat?: Chat | string, latitude?: number, longitude?: number, others?: Partial<LocationMessage>);
    /**
     * Define a localização da mensagem.
     * @param latitude - A nova latitude.
     * @param longitude - A nova longitude.
     */
    setLocation(latitude: number, longitude: number): void;
    /**
     * @returns O endereço da localização
     */
    getAddress(): Promise<import("../models/Address").default>;
    /**
     * Converte o objeto atual para uma representação em formato JSON.
     * @returns Um objeto JSON que representa o estado atual do objeto.
     */
    toJSON(): any;
    /**
     * Desserializa um objeto JSON em uma instância de LocationMessage.
     * @param data - O objeto JSON a ser desserializado.
     * @returns Uma instância de LocationMessage.
     */
    static fromJSON(data: any): LocationMessage;
    /**
     * Verifica se um objeto é uma instância válida de LocationMessage.
     * @param message - O objeto a ser verificado como uma instância de LocationMessage.
     * @returns Verdadeiro se o objeto for uma instância válida de LocationMessage, caso contrário, falso.
     */
    static isValid(message: any): message is LocationMessage;
}
