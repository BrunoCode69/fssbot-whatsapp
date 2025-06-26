import { Chat } from '../modules/chat';
import { User } from '../modules/user';
export declare enum CallStatus {
    Offer = "offer",
    Ringing = "ringing",
    Reject = "reject",
    Accept = "accept",
    Timeout = "timeout"
}
export default class Call {
    /** ID do bot associado */
    botId: string;
    /** ID do cliente associado */
    clientId: string;
    /** Chat em que a chamada foi feita */
    chat: Chat;
    /** Usuário que fez a chamada */
    user: User;
    /** Identificador da chamada */
    id: string;
    /** Timestamp da chamada */
    date: Date;
    /** Status da chamada */
    status: string;
    /** E uma chamada de video */
    isVideo: boolean;
    /** Foi chamada enquanto estava offline */
    offline: boolean;
    /** Latencia da chamada */
    latencyMs: number;
    constructor(id?: string, chat?: Chat | string, user?: User | string, status?: CallStatus, options?: Partial<Call>);
    /**
     * Injeta dados para o objeto atual.
     * @param options - Os dados que serão injetados.
     */
    inject(data: Partial<Call>): void;
    reject(): Promise<void>;
    /**
     * Converte o objeto atual para uma representação em formato JSON.
     * @returns Um objeto JSON que representa o estado atual do objeto.
     */
    toJSON(): any;
    /**
     * Cria uma instância de `Call` a partir de uma representação em formato JSON.
     * @param data - Os dados JSON a serem usados para criar a instância.
     * @returns Uma instância de `Call` criada a partir dos dados JSON.
     */
    static fromJSON(data: any): Call;
    /**
     * Corrige o objeto atual para uma representação em formato JSON.
     * @param call - O objeto a ser corrigido.
     * @returns O objeto passado corrigido.
     */
    static fix<T extends Call>(call: T): T;
    /**
     * Obtém uma instância de `Call` com base em um ID e/ou dados passados.
     * @param call - O ID da mensagem ou uma instância existente de Call.
     * @param data - Dados que serão aplicados na mensagem,.
     * @returns Uma instância de Call com os dados passados.
     */
    static apply(call: Call | string, data?: Partial<Call>): Call;
    /**
     * Verifica se um objeto é uma instância válida de `Call`.
     * @param call - O objeto a ser verificado.
     * @returns Verdadeiro se o objeto for uma instância válida de `Call`, caso contrário, falso.
     */
    static isValid(call: any): call is Call;
}
