import Message, { MessageType } from "./Message";
import Chat from "../modules/chat/Chat";
/** Tipo de botão */
export declare type ButtonType = 'reply' | 'url' | 'call';
/** Botão da mensagem */
export declare type Button = {
    /** Tipo do botão */
    type: ButtonType;
    /** Texto exibido no botão */
    text: string;
    /** Conteúdo do botão (ID, URL ou número de telefone) */
    content: string;
    /** Índice do botão (usado em templateButtons) */
    index?: number;
};
/**
 * Representa uma mensagem com botões.
 * ATENÇÃO: Botões tradicionais não funcionam mais no Baileys 7.x
 * Use baileys_helper para botões funcionais
 */
export default class ButtonMessage extends Message {
    /** O tipo da mensagem é sempre MessageType.Button ou MessageType.TemplateButton */
    type: MessageType;
    /** Lista de botões */
    buttons: Button[];
    /** Texto do rodapé */
    footer: string;
    /** Usa formato de quick_reply do baileys_helper (recomendado) */
    useQuickReply: boolean;
    /**
     * Cria uma nova instância de ButtonMessage
     * @param chat - Chat associado à mensagem
     * @param text - Texto da mensagem
     * @param footer - Texto do rodapé
     * @param others - Outras propriedades
     */
    constructor(chat?: Chat | string, text?: string, footer?: string, others?: Partial<ButtonMessage>);
    /**
     * Adiciona um botão de resposta rápida
     * @param text - Texto do botão
     * @param id - ID do botão
     * @param index - Índice do botão (opcional)
     */
    addReply(text: string, id: string, index?: number): void;
    /**
     * Adiciona um botão de URL
     * @param text - Texto do botão
     * @param url - URL do botão
     * @param index - Índice do botão (opcional)
     */
    addUrl(text: string, url: string, index?: number): void;
    /**
     * Adiciona um botão de chamada
     * @param text - Texto do botão
     * @param phoneNumber - Número de telefone
     * @param index - Índice do botão (opcional)
     */
    addCall(text: string, phoneNumber: string, index?: number): void;
    /**
     * Converte para formato JSON
     */
    toJSON(): any;
    /**
     * Desserializa um objeto JSON em uma instância de ButtonMessage
     */
    static fromJSON(data: any): ButtonMessage;
    /**
     * Verifica se um objeto é uma instância válida de ButtonMessage
     */
    static isValid(message: any): message is ButtonMessage;
}
