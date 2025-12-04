import Message, { MessageType } from "./Message";
import { injectJSON } from "../utils/Generic";
import Chat from "../modules/chat/Chat";

/** Lista - Formato atualizado para Baileys 7.x */
export type List = {
  /** Titulo da lista */
  title: string;
  /** Label da lista (highlight_label no novo formato) */
  label?: string;
  /** Itens da lista */
  items: ListItem[];
};

/** Item da lista - Formato atualizado para Baileys 7.x */
export type ListItem = {
  /** Cabeçalho do item (header) */
  header?: string;
  /** Titulo do item (title) */
  title: string;
  /** Descrição do item (description) */
  description: string;
  /** Identificador do item (id) */
  id: string;
};

/** Tipo da lista - Mantido para compatibilidade */
export enum ListType {
  UNKNOWN = 0,
  SINGLE_SELECT = 1,
  PRODUCT_LIST = 2,
}

/**
 * Representa uma mensagem de lista compatível com Baileys 7.x.
 * Agora usa Interactive Messages em vez de listMessage deprecated.
 */
export default class ListMessage extends Message {
  /** O tipo da mensagem é sempre MessageType.List. */
  public readonly type = MessageType.List;
  /** Lista de categorias e itens. */
  public list: List[] = [];
  /** Texto do botão associado à lista. */
  public button: string;
  /** Texto do rodapé da lista. */
  public footer: string;
  /** Título da lista. */
  public title: string;
  /** Subtítulo da lista. */
  public subtitle: string;
  /** Tipo da lista. Apenas disponível para o `WhatsAppBot`. */
  public listType: number = ListType.SINGLE_SELECT; // Mudado para SINGLE_SELECT (padrão no Baileys 7.x)
  /** Usa o modo interactive message. SEMPRE TRUE no Baileys 7.x (modo legado removido). */
  public readonly interactiveMode: boolean = true; // READONLY - não pode ser alterado

  /**
   * Cria uma nova instância de ListMessage.
   * @param chat - O chat associado à mensagem de lista (opcional).
   * @param text - O texto da mensagem (opcional).
   * @param button - Texto do botão (padrão é "Ver Opções").
   * @param footer - Texto do rodapé (padrão é uma string vazia).
   * @param title - Título da lista (padrão é uma string vazia).
   * @param others - Outras propriedades da mensagem de lista (opcional).
   */
  constructor(
    chat?: Chat | string,
    text?: string,
    button: string = "Ver Opções",
    footer: string = "",
    title: string = "",
    others: Partial<ListMessage> = {}
  ) {
    super(chat, text);

    this.button = button;
    this.footer = footer;
    this.title = title;

    injectJSON(others, this);
  }

  /**
   * Adiciona uma seção à lista.
   * @param title - Título da categoria.
   * @param label - Label da categoria (opcional).
   * @param items - Itens da categoria (padrão é uma lista vazia).
   * @returns O índice da categoria criada.
   */
  public addCategory(title: string, items: ListItem[] = [], label?: string): number {
    const index = this.list.length;

    this.list.push({ title, items, label });

    return index;
  }

  /**
   * Adiciona um item a uma categoria existente na lista.
   * @param index - Índice da categoria em que o item será adicionado.
   * @param title - Título do item.
   * @param description - Descrição do item (padrão é uma string vazia).
   * @param id - ID do item (padrão é um timestamp em forma de string).
   * @param header - Cabeçalho do item (opcional).
   */
  public addItem(
    index: number,
    title: string,
    description: string = "",
    id: string = String(Date.now()),
    header?: string
  ) {
    if (!this.list[index]) {
      throw new Error(`Category at index ${index} does not exist`);
    }

    return this.list[index].items.push({ title, description, id, header });
  }

  /**
   * Converte para o formato de Interactive Message do Baileys 7.x
   * Este método é usado internamente pelo ConvertToWAMessage
   */
  public toInteractiveMessage(): any {
    const sections = this.list.map((category) => ({
      title: category.title,
      highlight_label: category.label || undefined,
      rows: category.items.map((item) => ({
        header: item.header || undefined,
        title: item.title,
        description: item.description || undefined,
        id: item.id,
      })),
    }));

    const buttonParams = {
      title: this.button || "Ver opções",
      sections: sections
    };

    return {
      interactiveMessage: {
        header: this.title
          ? {
            title: this.title,
            subtitle: this.subtitle || undefined,
          }
          : undefined,
        body: {
          text: this.text || "",
        },
        footer: this.footer
          ? {
            text: this.footer
          }
          : undefined,
        nativeFlowMessage: {
          buttons: [
            {
              name: "single_select",
              buttonParamsJson: JSON.stringify(buttonParams)
            }
          ]
        }
      }
    };
  }


  /**
   * Converte para o formato legado (para compatibilidade reversa)
   * Este formato NÃO funciona mais no Baileys 7.x
   * @deprecated Use toInteractiveMessage() em vez disso
   */
  public toLegacyFormat(): any {
    return {
      text: this.text,
      footer: this.footer,
      title: this.title,
      buttonText: this.button,
      sections: this.list.map((category) => ({
        title: category.title,
        rows: category.items.map((item) => ({
          title: item.title,
          rowId: item.id,
          description: item.description,
        })),
      })),
    };
  }

  /**
   * Converte o objeto atual para uma representação em formato JSON.
   * @returns Um objeto JSON que representa o estado atual do objeto.
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
   * @param data - O objeto JSON a ser desserializado.
   * @returns Uma instância de ListMessage.
   */
  public static fromJSON(data: any): ListMessage {
    return Message.fix(
      !data || typeof data != "object"
        ? new ListMessage()
        : injectJSON(data, new ListMessage())
    );
  }

  /**
   * Verifica se um objeto é uma instância válida de ListMessage.
   * @param message - O objeto a ser verificado como uma instância de ListMessage.
   * @returns Verdadeiro se o objeto for uma instância válida de ListMessage, caso contrário, falso.
   */
  public static isValid(message: any): message is ListMessage {
    return Message.isValid(message) && message?.type == MessageType.List;
  }
}