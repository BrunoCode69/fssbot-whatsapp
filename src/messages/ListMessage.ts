import Message, { MessageType } from "./Message";
import { injectJSON } from "../utils/Generic";
import Chat from "../modules/chat/Chat";

/**
 * Tipos de lista disponíveis
 */
export enum ListType {
  /** Lista desconhecida/padrão */
  UNKNOWN = 0,
  /** Lista com seleção única */
  SINGLE_SELECT = 1,
  /** Lista com múltiplas seleções */
  MULTI_SELECT = 2,
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
  public readonly type: MessageType.List = MessageType.List;

  /** Lista de seções */
  public list: List[] = [];

  /** Título da mensagem */
  public title: string = "";

  /** Rodapé da mensagem */
  public footer: string = "";

  /** Texto do botão que abre a lista */
  public button: string = "Ver Opções";

  /** Tipo da lista */
  public listType: ListType = ListType.SINGLE_SELECT;

  /** Se deve usar modo interativo (apenas Mobile) */
  public interactiveMode: boolean = false;

  /**
   * Cria uma nova instância de ListMessage.
   * @param chat - O chat associado à mensagem (opcional).
   * @param text - O texto da mensagem (opcional).
   * @param list - Lista de seções (padrão é uma lista vazia).
   * @param others - Outras propriedades da mensagem (opcional).
   */
  constructor(
    chat?: Chat | string,
    text?: string,
    list: List[] = [],
    others: Partial<ListMessage> = {}
  ) {
    super(chat, text);

    this.list = list;

    injectJSON(others, this);
  }

  /**
   * Adiciona uma categoria/seção à lista
   * @param title - Título da seção
   * @param label - Rótulo para destaque (opcional)
   */
  public addCategory(title: string, label?: string) {
    this.list.push({
      title,
      label,
      items: [],
    });

    return this;
  }

  /**
   * Adiciona um item a uma seção da lista
   * @param categoryIndex - Índice da seção
   * @param title - Título do item
   * @param description - Descrição do item (opcional)
   * @param id - ID do item (opcional)
   * @param header - Cabeçalho do item (opcional)
   */
  public addItem(
    categoryIndex: number,
    title: string,
    description?: string,
    id?: string,
    header?: string
  ) {
    if (categoryIndex < 0 || categoryIndex >= this.list.length) {
      throw new Error(`Category index ${categoryIndex} is out of bounds`);
    }

    this.list[categoryIndex].items.push({
      id: id || `${Date.now()}-${Math.random()}`,
      title,
      description,
      header,
    });

    return this;
  }

  /**
   * Remove um item de uma seção
   * @param categoryIndex - Índice da seção
   * @param item - Item a remover
   */
  public removeItem(categoryIndex: number, item: ListItem) {
    if (categoryIndex < 0 || categoryIndex >= this.list.length) {
      throw new Error(`Category index ${categoryIndex} is out of bounds`);
    }

    this.list[categoryIndex].items = this.list[categoryIndex].items.filter(
      (i) => i.id !== item.id
    );

    return this;
  }

  /**
   * Define o título da mensagem
   * @param title - Título
   */
  public setTitle(title: string) {
    this.title = title;
    return this;
  }

  /**
   * Define o rodapé da mensagem
   * @param footer - Rodapé
   */
  public setFooter(footer: string) {
    this.footer = footer;
    return this;
  }

  /**
   * Define o texto do botão
   * @param button - Texto do botão
   */
  public setButton(button: string) {
    this.button = button;
    return this;
  }

  /**
   * Define o tipo da lista
   * @param type - Tipo da lista
   */
  public setListType(type: ListType) {
    this.listType = type;
    return this;
  }

  /**
   * Habilita o modo interativo (apenas Mobile)
   * @param enabled - Se deve habilitar
   */
  public setInteractiveMode(enabled: boolean) {
    this.interactiveMode = enabled;
    return this;
  }

  /**
   * Serializa a mensagem em um objeto JSON.
   * @returns O objeto JSON representando a mensagem.
   */
  public toJSON(): any {
    const data: Record<string, any> = {};

    for (const key of Object.keys(this)) {
      if (key == "toJSON") continue;

      data[key] = this[key];
    }

    return JSON.parse(JSON.stringify(data));
  }

  /**
   * Desserializa um objeto JSON em uma instância de ListMessage.
   * @param message - O objeto JSON a ser desserializado.
   * @returns Uma instância de ListMessage.
   */
  public static fromJSON(message: any): ListMessage {
    if (!message || typeof message != "object") {
      return new ListMessage();
    }

    const listMessage = Message.fix(injectJSON(message, new ListMessage()));

    listMessage.list = message?.list || [];
    listMessage.title = message?.title || "";
    listMessage.footer = message?.footer || "";
    listMessage.button = message?.button || "Ver Opções";
    listMessage.listType = message?.listType || ListType.SINGLE_SELECT;
    listMessage.interactiveMode = message?.interactiveMode || false;

    return listMessage;
  }

  /**
   * Verifica se um objeto é uma instância válida de ListMessage.
   * @param message - O objeto a ser verificado.
   * @returns `true` se for uma instância válida de ListMessage.
   */
  public static isValid(message: any): message is ListMessage {
    return Message.isValid(message) && message?.type == MessageType.List;
  }
}
