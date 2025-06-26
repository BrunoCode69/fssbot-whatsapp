import Message, { MessageType } from "./Message";
import Chat from "../modules/chat/Chat";
/** Lista */
export declare type List = {
    /** Titulo da lista */
    title: string;
    /** Label da lista */
    label?: string;
    /** Itens da lista */
    items: ListItem[];
};
/** Item da lista */
export declare type ListItem = {
    /** Cabeçalho do item */
    header?: string;
    /** Titulo do item */
    title: string;
    /** Descrição do item */
    description: string;
    /** Identificador do item */
    id: string;
};
/** Tipo da lista */
export declare enum ListType {
    UNKNOWN = 0,
    SINGLE_SELECT = 1,
    PRODUCT_LIST = 2
}
/**
 * Representa uma mensagem de lista.
 */
export default class ListMessage extends Message {
    /** O tipo da mensagem é sempre MessageType.List. */
    readonly type = MessageType.List;
    /** Lista de categorias e itens. */
    list: List[];
    /** Texto do botão associado à lista. */
    button: string;
    /** Texto do rodapé da lista. */
    footer: string;
    /** Título da lista. */
    title: string;
    /** Subtítulo da lista. */
    subtitle: string;
    /** Tipo da lista. Apenas disponível para o `WhatsAppBot`. */
    listType: number;
    /** Usa o modo interactive message. Disponivel apenas para o `WhatsAppBot`. */
    interactiveMode: boolean;
    /**
     * Cria uma nova instância de ListMessage.
     * @param chat - O chat associado à mensagem de lista (opcional).
     * @param text - O texto da mensagem (opcional).
     * @param button - Texto do botão (padrão é uma string vazia).
     * @param footer - Texto do rodapé (padrão é uma string vazia).
     * @param title - Título da lista (padrão é uma string vazia).
     * @param others - Outras propriedades da mensagem de lista (opcional).
     */
    constructor(chat?: Chat | string, text?: string, button?: string, footer?: string, title?: string, others?: Partial<ListMessage>);
    /**
     * Adiciona uma seção à lista.
     * @param title - Título da categoria.
     * @param items - Itens da categoria (padrão é uma lista vazia).
     * @returns O índice da categoria criada.
     */
    addCategory(title: string, items?: ListItem[]): number;
    /**
     * Adiciona um item a uma categoria existente na lista.
     * @param index - Índice da categoria em que o item será adicionado.
     * @param title - Título do item.
     * @param description - Descrição do item (padrão é uma string vazia).
     * @param id - ID do item (padrão é um timestamp em forma de string).
     */
    addItem(index: number, title: string, description?: string, id?: string): number;
    /**
     * Converte o objeto atual para uma representação em formato JSON.
     * @returns Um objeto JSON que representa o estado atual do objeto.
     */
    toJSON(): any;
    /**
     * Desserializa um objeto JSON em uma instância de ListMessage.
     * @param data - O objeto JSON a ser desserializado.
     * @returns Uma instância de ListMessage.
     */
    static fromJSON(data: any): ListMessage;
    /**
     * Verifica se um objeto é uma instância válida de ListMessage.
     * @param message - O objeto a ser verificado como uma instância de ListMessage.
     * @returns Verdadeiro se o objeto for uma instância válida de ListMessage, caso contrário, falso.
     */
    static isValid(message: any): message is ListMessage;
}
