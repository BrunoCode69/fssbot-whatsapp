import Message, { MessageType } from "./Message";
import Chat from "../modules/chat/Chat";
/**
 * Tipos de lista disponíveis
 */
export declare enum ListType {
    /** Lista desconhecida/padrão */
    UNKNOWN = 0,
    /** Lista com seleção única */
    SINGLE_SELECT = 1,
    /** Lista com múltiplas seleções */
    MULTI_SELECT = 2
}
/**
 * Interface para um item da lista
 */
export interface ListItem {
    /** ID do item */
    id: string;
    /** Título do item */
    title: string;
    /** Descrição do item (opcional) */
    description?: string;
    /** Cabeçalho do item (opcional) */
    header?: string;
}
/**
 * Interface para uma seção da lista
 */
export interface List {
    /** Título da seção */
    title: string;
    /** Rótulo para destaque (opcional) */
    label?: string;
    /** Itens da seção */
    items: ListItem[];
}
/**
 * Representa uma mensagem com lista
 */
export default class ListMessage extends Message {
    /** O tipo da mensagem é MessageType.List */
    readonly type: MessageType.List;
    /** Lista de seções */
    list: List[];
    /** Título da mensagem */
    title: string;
    /** Rodapé da mensagem */
    footer: string;
    /** Texto do botão que abre a lista */
    button: string;
    /** Tipo da lista */
    listType: ListType;
    /** Se deve usar modo interativo (apenas Mobile) */
    interactiveMode: boolean;
    /**
     * Cria uma nova instância de ListMessage.
     * @param chat - O chat associado à mensagem (opcional).
     * @param text - O texto da mensagem (opcional).
     * @param list - Lista de seções (padrão é uma lista vazia).
     * @param others - Outras propriedades da mensagem (opcional).
     */
    constructor(chat?: Chat | string, text?: string, list?: List[], others?: Partial<ListMessage>);
    /**
     * Adiciona uma categoria/seção à lista
     * @param title - Título da seção
     * @param label - Rótulo para destaque (opcional)
     */
    addCategory(title: string, label?: string): this;
    /**
     * Adiciona um item a uma seção da lista
     * @param categoryIndex - Índice da seção
     * @param title - Título do item
     * @param description - Descrição do item (opcional)
     * @param id - ID do item (opcional)
     * @param header - Cabeçalho do item (opcional)
     */
    addItem(categoryIndex: number, title: string, description?: string, id?: string, header?: string): this;
    /**
     * Remove um item de uma seção
     * @param categoryIndex - Índice da seção
     * @param item - Item a remover
     */
    removeItem(categoryIndex: number, item: ListItem): this;
    /**
     * Define o título da mensagem
     * @param title - Título
     */
    setTitle(title: string): this;
    /**
     * Define o rodapé da mensagem
     * @param footer - Rodapé
     */
    setFooter(footer: string): this;
    /**
     * Define o texto do botão
     * @param button - Texto do botão
     */
    setButton(button: string): this;
    /**
     * Define o tipo da lista
     * @param type - Tipo da lista
     */
    setListType(type: ListType): this;
    /**
     * Habilita o modo interativo (apenas Mobile)
     * @param enabled - Se deve habilitar
     */
    setInteractiveMode(enabled: boolean): this;
    /**
     * Serializa a mensagem em um objeto JSON.
     * @returns O objeto JSON representando a mensagem.
     */
    toJSON(): any;
    /**
     * Desserializa um objeto JSON em uma instância de ListMessage.
     * @param message - O objeto JSON a ser desserializado.
     * @returns Uma instância de ListMessage.
     */
    static fromJSON(message: any): ListMessage;
    /**
     * Verifica se um objeto é uma instância válida de ListMessage.
     * @param message - O objeto a ser verificado.
     * @returns `true` se for uma instância válida de ListMessage.
     */
    static isValid(message: any): message is ListMessage;
}
