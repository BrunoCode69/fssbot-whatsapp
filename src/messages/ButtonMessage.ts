// =========================================
// IMPORTANTE: Botões antigos NÃO funcionam mais!
// =========================================
// O formato antigo (templateButtons, buttons) foi DESCONTINUADO
// pelo WhatsApp. Use baileys_helper para botões funcionais.

import Message, { MessageType } from "./Message";
import { injectJSON } from "../utils/Generic";
import Chat from "../modules/chat/Chat";

/** Tipo de botão */
export type ButtonType = 'reply' | 'url' | 'call';

/** Botão da mensagem */
export type Button = {
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
  public type = MessageType.Button;
  /** Lista de botões */
  public buttons: Button[] = [];
  /** Texto do rodapé */
  public footer: string;
  /** Usa formato de quick_reply do baileys_helper (recomendado) */
  public useQuickReply: boolean = true;

  /**
   * Cria uma nova instância de ButtonMessage
   * @param chat - Chat associado à mensagem
   * @param text - Texto da mensagem
   * @param footer - Texto do rodapé
   * @param others - Outras propriedades
   */
  constructor(
    chat?: Chat | string,
    text?: string,
    footer: string = "",
    others: Partial<ButtonMessage> = {}
  ) {
    super(chat, text);

    this.footer = footer;

    injectJSON(others, this);
  }

  /**
   * Adiciona um botão de resposta rápida
   * @param text - Texto do botão
   * @param id - ID do botão
   * @param index - Índice do botão (opcional)
   */
  public addReply(text: string, id: string, index?: number) {
    this.buttons.push({
      type: 'reply',
      text,
      content: id,
      index: index ?? this.buttons.length,
    });
  }

  /**
   * Adiciona um botão de URL
   * @param text - Texto do botão
   * @param url - URL do botão
   * @param index - Índice do botão (opcional)
   */
  public addUrl(text: string, url: string, index?: number) {
    this.buttons.push({
      type: 'url',
      text,
      content: url,
      index: index ?? this.buttons.length,
    });
  }

  /**
   * Adiciona um botão de chamada
   * @param text - Texto do botão
   * @param phoneNumber - Número de telefone
   * @param index - Índice do botão (opcional)
   */
  public addCall(text: string, phoneNumber: string, index?: number) {
    this.buttons.push({
      type: 'call',
      text,
      content: phoneNumber,
      index: index ?? this.buttons.length,
    });
  }

  /**
   * Converte para formato JSON
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
   * Desserializa um objeto JSON em uma instância de ButtonMessage
   */
  public static fromJSON(data: any): ButtonMessage {
    return Message.fix(
      !data || typeof data != "object"
        ? new ButtonMessage()
        : injectJSON(data, new ButtonMessage())
    );
  }

  /**
   * Verifica se um objeto é uma instância válida de ButtonMessage
   */
  public static isValid(message: any): message is ButtonMessage {
    return (
      Message.isValid(message) &&
      (message?.type == MessageType.Button ||
        message?.type == MessageType.TemplateButton)
    );
  }
}