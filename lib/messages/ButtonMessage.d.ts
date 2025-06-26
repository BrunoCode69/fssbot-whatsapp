import Message, { MessageType } from "./Message";
import Chat from "../modules/chat/Chat";
/**
 * Representa um botão em uma mensagem.
 */
export declare type Button = {
    /** Posição do botão na lista. */
    index: number;
    /** Tipo do botão. */
    type: ButtonType;
    /** Texto exibido no botão. */
    text: string;
    /** Conteúdo associado ao botão (pode ser uma URL, telefone ou ID de resposta). */
    content: string;
};
/**
 * Tipo de botão disponível.
 */
export declare enum ButtonType {
    /** Botão de resposta. */
    Reply = "reply",
    /** Botão para fazer uma ligação. */
    Call = "call",
    /** Botão para abrir uma URL. */
    Url = "url"
}
/**
 * Representa uma mensagem com botões interativos.
 */
export default class ButtonMessage extends Message {
    /** O tipo da mensagem é MessageType.Button ou MessageType.TemplateButton. */
    type: MessageType.Button | MessageType.TemplateButton;
    /** Texto exibido no rodapé da mensagem. */
    footer: string;
    /** Lista de botões associados à mensagem. */
    buttons: Button[];
    /**
     * Cria uma nova instância de ButtonMessage.
     * @param chat - O chat associado à mensagem de botões (opcional).
     * @param text - O texto da mensagem (opcional).
     * @param footer - Texto exibido no rodapé da mensagem (padrão é uma string vazia).
     * @param others - Outras propriedades da mensagem de botões (opcional).
     */
    constructor(chat?: Chat | string, text?: string, footer?: string, others?: Partial<ButtonMessage>);
    /**
     * Adiciona um botão de URL à mensagem.
     * @param text - Texto exibido no botão.
     * @param url - URL associada ao botão.
     * @param index - Posição do botão na lista (padrão é a próxima posição disponível).
     */
    addUrl(text: string, url: string, index?: number): void;
    /**
     * Adiciona um botão de chamada telefônica à mensagem.
     * @param text - Texto exibido no botão.
     * @param phone - Número de telefone associado ao botão.
     * @param index - Posição do botão na lista (padrão é a próxima posição disponível).
     */
    addCall(text: string, phone: string, index?: number): void;
    /**
     * Adiciona um botão de resposta interativa à mensagem.
     * @param text - Texto exibido no botão.
     * @param id - ID de resposta associado ao botão.
     * @param index - Posição do botão na lista (padrão é a próxima posição disponível).
     */
    addReply(text: string, id?: string, index?: number): void;
    /**
     * Remove um botão da lista com base na posição.
     * @param index - Posição do botão a ser removido.
     */
    remove(index: number): void;
    /**
     * Converte o objeto atual para uma representação em formato JSON.
     * @returns Um objeto JSON que representa o estado atual do objeto.
     */
    toJSON(): any;
    /**
     * Desserializa um objeto JSON em uma instância de ButtonMessage.
     * @param data - O objeto JSON a ser desserializado.
     * @returns Uma instância de ButtonMessage.
     */
    static fromJSON(data: any): ButtonMessage;
    /**
     * Verifica se um objeto é uma instância válida de ButtonMessage.
     * @param message - O objeto a ser verificado como uma instância de ButtonMessage.
     * @returns Verdadeiro se o objeto for uma instância válida de ButtonMessage, caso contrário, falso.
     */
    static isValid(message: any): message is ButtonMessage;
}
