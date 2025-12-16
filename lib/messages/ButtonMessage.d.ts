import Message, { MessageType } from "./Message";
import Chat from "../modules/chat/Chat";
/**
 * Tipos de botão disponíveis
 */
export declare enum ButtonType {
    /** Botão que retorna uma resposta rápida */
    Reply = "reply",
    /** Botão que abre uma URL */
    Url = "url",
    /** Botão para fazer uma chamada */
    Call = "call"
}
/**
 * Interface para um botão
 */
export interface Button {
    /** Tipo do botão */
    type: ButtonType | string;
    /** Texto exibido no botão */
    text: string;
    /** Conteúdo do botão (ID, URL, telefone) */
    content: string;
}
/**
 * Representa uma mensagem com botões
 */
export default class ButtonMessage extends Message {
    /** O tipo da mensagem é MessageType.Button */
    readonly type: MessageType.Button;
    /** Lista de botões da mensagem */
    buttons: Button[];
    /** Rodapé da mensagem */
    footer: string;
    /**
     * Cria uma nova instância de ButtonMessage.
     * @param chat - O chat associado à mensagem (opcional).
     * @param text - O texto da mensagem (opcional).
     * @param buttons - Lista de botões (padrão é uma lista vazia).
     * @param others - Outras propriedades da mensagem (opcional).
     */
    constructor(chat?: Chat | string, text?: string, buttons?: Button[], others?: Partial<ButtonMessage>);
    /**
     * Adiciona um botão de resposta rápida
     * @param text - Texto do botão
     * @param id - ID da resposta rápida
     */
    addReply(text: string, id: string): this;
    /**
     * Adiciona um botão de URL
     * @param text - Texto do botão
     * @param url - URL para abrir
     */
    addUrl(text: string, url: string): this;
    /**
     * Adiciona um botão de chamada
     * @param text - Texto do botão
     * @param phone - Número de telefone
     */
    addCall(text: string, phone: string | number): this;
    /**
     * Remove um botão
     * @param button - Botão a remover
     */
    removeButton(button: Button): this;
    /**
     * Define o rodapé da mensagem
     * @param footer - Texto do rodapé
     */
    setFooter(footer: string): this;
    /**
     * Serializa a mensagem em um objeto JSON.
     * @returns O objeto JSON representando a mensagem.
     */
    toJSON(): any;
    /**
     * Desserializa um objeto JSON em uma instância de ButtonMessage.
     * @param message - O objeto JSON a ser desserializado.
     * @returns Uma instância de ButtonMessage.
     */
    static fromJSON(message: any): ButtonMessage;
    /**
     * Verifica se um objeto é uma instância válida de ButtonMessage.
     * @param message - O objeto a ser verificado.
     * @returns `true` se for uma instância válida de ButtonMessage.
     */
    static isValid(message: any): message is ButtonMessage;
}
