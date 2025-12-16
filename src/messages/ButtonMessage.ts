import Message, { MessageType } from "./Message";
import { injectJSON } from "../utils/Generic";
import Chat from "../modules/chat/Chat";

/**
 * Tipos de botão disponíveis
 */
export enum ButtonType {
  /** Botão que retorna uma resposta rápida */
  Reply = "reply",
  /** Botão que abre uma URL */
  Url = "url",
  /** Botão para fazer uma chamada */
  Call = "call",
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
  public readonly type: MessageType.Button = MessageType.Button;

  /** Lista de botões da mensagem */
  public buttons: Button[] = [];

  /** Rodapé da mensagem */
  public footer: string = "";

  /**
   * Cria uma nova instância de ButtonMessage.
   * @param chat - O chat associado à mensagem (opcional).
   * @param text - O texto da mensagem (opcional).
   * @param buttons - Lista de botões (padrão é uma lista vazia).
   * @param others - Outras propriedades da mensagem (opcional).
   */
  constructor(
    chat?: Chat | string,
    text?: string,
    buttons: Button[] = [],
    others: Partial<ButtonMessage> = {}
  ) {
    super(chat, text);

    this.buttons = buttons;

    injectJSON(others, this);
  }

  /**
   * Adiciona um botão de resposta rápida
   * @param text - Texto do botão
   * @param id - ID da resposta rápida
   */
  public addReply(text: string, id: string) {
    this.buttons.push({
      type: ButtonType.Reply,
      text,
      content: id,
    });

    return this;
  }

  /**
   * Adiciona um botão de URL
   * @param text - Texto do botão
   * @param url - URL para abrir
   */
  public addUrl(text: string, url: string) {
    this.buttons.push({
      type: ButtonType.Url,
      text,
      content: url,
    });

    return this;
  }

  /**
   * Adiciona um botão de chamada
   * @param text - Texto do botão
   * @param phone - Número de telefone
   */
  public addCall(text: string, phone: string | number) {
    this.buttons.push({
      type: ButtonType.Call,
      text,
      content: String(phone),
    });

    return this;
  }

  /**
   * Remove um botão
   * @param button - Botão a remover
   */
  public removeButton(button: Button) {
    this.buttons = this.buttons.filter(
      (btn) =>
        !(btn.type === button.type && btn.text === button.text && btn.content === button.content)
    );

    return this;
  }

  /**
   * Define o rodapé da mensagem
   * @param footer - Texto do rodapé
   */
  public setFooter(footer: string) {
    this.footer = footer;
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
   * Desserializa um objeto JSON em uma instância de ButtonMessage.
   * @param message - O objeto JSON a ser desserializado.
   * @returns Uma instância de ButtonMessage.
   */
  public static fromJSON(message: any): ButtonMessage {
    if (!message || typeof message != "object") {
      return new ButtonMessage();
    }

    const buttonMessage = Message.fix(injectJSON(message, new ButtonMessage()));

    buttonMessage.buttons = message?.buttons || [];
    buttonMessage.footer = message?.footer || "";

    return buttonMessage;
  }

  /**
   * Verifica se um objeto é uma instância válida de ButtonMessage.
   * @param message - O objeto a ser verificado.
   * @returns `true` se for uma instância válida de ButtonMessage.
   */
  public static isValid(message: any): message is ButtonMessage {
    return Message.isValid(message) && message?.type == MessageType.Button;
  }
}
