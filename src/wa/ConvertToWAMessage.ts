import Message, { MessageStatus, MessageType } from '../messages/Message';
import ListMessage from '../messages/ListMessage';
import LocationMessage from '../messages/LocationMessage';
import ReactionMessage from '../messages/ReactionMessage';
import ContactMessage from '../messages/ContactMessage';
import StickerMessage from '../messages/StickerMessage';
import ButtonMessage, { ButtonType } from '../messages/ButtonMessage';
import MediaMessage from '../messages/MediaMessage';
import ImageMessage from '../messages/ImageMessage';
import AudioMessage from '../messages/AudioMessage';
import VideoMessage from '../messages/VideoMessage';
import PollMessage from '../messages/PollMessage';

import { getWaSticker } from '../utils/Libs';
import { getDefaultMediaFileName, isLocalFilePath } from '../utils/MediaUtils';
import { getID, getPhoneNumber, isGroupJid, normalizeJid } from './ID';
import { createReactionKey } from './reaction-key';
import { createInteractiveListPayload } from './interactive-list-payload';
import type WhatsAppBot from './WhatsAppBot';

export default class ConvertToWAMessage {
  public message: Message;
  public bot: WhatsAppBot;
  public isMention: boolean;

  public chatId: string = '';
  public waMessage: any = {};
  public options: any = {};
  public isRelay: boolean = false;

  constructor(bot: WhatsAppBot, message: Message, isMention: boolean = false) {
    this.message = message;
    this.bot = bot;
    this.isMention = !!isMention;
  }

  /**
   * Resolve um ID para o ID canônico usado no envio (PN quando conhecido, senão LID).
   */
  private async resolveJid(jid: string | undefined): Promise<string | undefined> {
    if (!jid || typeof jid !== 'string') return undefined;

    try {
      if (this.bot && typeof this.bot.resolveId === 'function') {
        return (await this.bot.resolveId(jid)) || undefined;
      }
      return normalizeJid(jid) || undefined;
    } catch (error) {
      this.bot?.logger?.error?.('Error normalizing JID', { jid, error } as any);
      return normalizeJid(jid) || undefined;
    }
  }

  /**
   * * Refatora a mensagem para o formato ZapoJS
   */
  public async refactory(message = this.message): Promise<this> {
    this.waMessage = await this.refactoryMessage(message);

    const chatId = await this.resolveJid(message.chat?.id);
    if (!chatId) {
      throw new Error(`Invalid chat ID: ${message.chat?.id}`);
    }

    this.chatId = chatId;

    if (message.mention && !this.isMention) {
      this.options.quote = await this.createQuoted(message.mention);
    }

    if (MediaMessage.isValid(message)) {
      await this.refactoryMediaMessage(message);
    } else if (LocationMessage.isValid(message)) {
      this.refactoryLocationMessage(message);
    } else if (ReactionMessage.isValid(message)) {
      await this.refactoryReactionMessage(message);
    } else if (ContactMessage.isValid(message)) {
      this.refactoryContactMessage(message);
    } else if (ButtonMessage.isValid(message)) {
      this.refactoryButtonMessage(message);
    } else if (ListMessage.isValid(message)) {
      await this.refactoryListMessage(message);
    } else if (PollMessage.isValid(message)) {
      this.refactoryPollMessage(message);
    }

    return this;
  }

  /**
   * Monta a mensagem citada (quote) para o envio.
   */
  public async createQuoted(mention: Message): Promise<any> {
    const rawKey = mention.extra?.key;
    if (rawKey?.id && rawKey.remoteJid) {
      return {
        remoteJid: rawKey.remoteJid,
        id: rawKey.id,
        fromMe: !!rawKey.fromMe,
        participant: rawKey.participant || undefined,
      };
    }

    const remoteJid = (await this.resolveJid(mention.chat?.id)) || this.chatId;
    const participant = (await this.resolveJid(mention.user?.id)) || undefined;
    const fromMe = !!mention.fromMe || (this.bot?.id ? participant === this.bot.id : false);

    return {
      remoteJid,
      id: mention.id || '',
      fromMe,
      participant: isGroupJid(remoteJid) && !fromMe ? participant : undefined,
    };
  }

  /**
   * Refatora texto, menções e campos base da mensagem
   */
  public async refactoryMessage(message: Message): Promise<any> {
    const text = message.text || '';
    const normalizedChatId = await this.resolveJid(message.chat?.id);
    const normalizedUserId = await this.resolveJid(message.user?.id);

    const mentions: string[] = [];

    if (message.mentions) {
      for (const jid of message.mentions) {
        const normalizedJid = await this.resolveJid(jid);
        if (normalizedJid && !mentions.includes(normalizedJid)) {
          mentions.push(normalizedJid);
        }
      }

      for (const mention of `${text}`.split(/@(.*?)/)) {
        const mentionNumber = `${mention.split(/\s+/)[0] || ''}`.replace(/\D+/g, '');

        if (!mentionNumber || mentionNumber.length < 9 || mentionNumber.length > 15) {
          continue;
        }

        const jid = await this.resolveJid(getID(mentionNumber));
        if (jid && !mentions.includes(jid)) {
          mentions.push(jid);
        }
      }
    }

    if (mentions.length) {
      this.options.mentions = mentions;
      this.options.contextInfo = {
        ...(this.options.contextInfo || {}),
        mentionedJid: mentions,
      };
    }

    if (message.isEdited) {
      const key = this.bot && typeof this.bot.getMessageKey === 'function'
        ? await this.bot.getMessageKey(message)
        : null;

      return {
        type: 'text',
        text,
        editKey: {
          remoteJid: key?.remoteJid || normalizedChatId || '',
          id: message.id || '',
          fromMe: key ? !!key.fromMe : message.fromMe || normalizedUserId === this.bot?.id,
          participant: key?.participant || undefined,
        },
      };
    }

    return {
      type: 'text',
      text,
    };
  }

  /**
   * Refatora mensagens de mídia (imagem, vídeo, áudio, documento, figurinha)
   */
  /**
   * Conteúdo da mídia para o Zapo: caminho de arquivo local é repassado como string (o Zapo
   * lê em stream, sem carregar tudo em memória); os demais casos viram Buffer.
   */
  public async getMediaInput(message: MediaMessage): Promise<Buffer | string> {
    if (this.isMention) return Buffer.from('');
    if (isLocalFilePath(message.file)) return message.file;

    return await message.getStream();
  }

  /** Metadados opcionais (só quando conhecidos) para o envio. */
  public static getMediaFields(message: MediaMessage, duration?: number): any {
    const fields: any = {};

    if (message.width > 0 && message.height > 0) {
      fields.width = message.width;
      fields.height = message.height;
    }

    if (duration > 0) fields.seconds = Math.round(duration);

    return fields;
  }

  public async refactoryMediaMessage(message: MediaMessage): Promise<void> {
    if (StickerMessage.isValid(message)) {
      await this.refactoryStickerMessage(message);
      return;
    }

    const media = await this.getMediaInput(message);

    if (AudioMessage.isValid(message)) {
      // `ptt` = mensagem de voz.
      this.waMessage = {
        type: 'audio',
        media,
        ptt: !!message.isPTT,
        mimetype: message.mimetype || 'audio/ogg; codecs=opus',
        ...ConvertToWAMessage.getMediaFields(message, message.duration),
      };
    } else if (
      ImageMessage.isValid(message) &&
      message.isGIF &&
      `${message.mimetype || ''}`.startsWith('video/')
    ) {
      // GIF vindo como vídeo (ex.: animação do Telegram): vídeo com reprodução de GIF.
      this.waMessage = {
        type: 'video',
        media,
        caption: this.message.text || undefined,
        gifPlayback: true,
        viewOnce: !!message.viewOnce,
        mimetype: message.mimetype,
        ...ConvertToWAMessage.getMediaFields(message),
      };
    } else if (ImageMessage.isValid(message)) {
      this.waMessage = {
        type: 'image',
        media,
        caption: this.message.text || undefined,
        viewOnce: !!message.viewOnce,
        mimetype: message.mimetype || 'image/jpeg',
        ...ConvertToWAMessage.getMediaFields(message),
      };
    } else if (VideoMessage.isValid(message) && message.isPTV) {
      // Vídeo redondo: tipo próprio do Zapo (`ptvMessage`), sem legenda.
      this.waMessage = {
        type: 'ptv',
        media,
        mimetype: message.mimetype || 'video/mp4',
        ...ConvertToWAMessage.getMediaFields(message, message.duration),
      };
    } else if (VideoMessage.isValid(message)) {
      this.waMessage = {
        type: 'video',
        media,
        caption: this.message.text || undefined,
        gifPlayback: !!message.isGIF,
        viewOnce: !!message.viewOnce,
        mimetype: message.mimetype || 'video/mp4',
        ...ConvertToWAMessage.getMediaFields(message, message.duration),
      };
    } else {
      const mimetype = message.mimetype || 'application/octet-stream';

      this.waMessage = {
        type: 'document',
        media,
        fileName: message.name || getDefaultMediaFileName(mimetype),
        mimetype,
        caption: this.message.text || undefined,
      };
    }
  }

  public async refactoryStickerMessage(message: StickerMessage): Promise<void> {
    const waSticker = this.isMention ? undefined : await getWaSticker();

    // Sem wa-sticker o arquivo local vai como caminho (stream), sem ler em memória.
    if (!waSticker) {
      this.waMessage = {
        type: 'sticker',
        media: await this.getMediaInput(message),
      };
      return;
    }

    const stickerFile = await message.getSticker();

    try {
      const sticker = new waSticker.default(stickerFile, {
        pack: message.pack,
        author: message.author,
        categories: message.categories,
        id: message.stickerId,
        type: waSticker.StickerTypes.FULL,
        quality: 100,
      });
      const built = await sticker.toMessage();
      if (built?.stickerMessage) {
        this.waMessage = {
          stickerMessage: built.stickerMessage,
        };
        return;
      }
    } catch (err) {
      this.bot?.emit('error', err);
    }

    this.waMessage = {
      type: 'sticker',
      media: stickerFile,
    };
  }

  public refactoryLocationMessage(message: LocationMessage): void {
    this.waMessage = {
      locationMessage: {
        degreesLatitude: message.latitude,
        degreesLongitude: message.longitude,
        name: message.name || undefined,
        address: message.address || undefined,
        url: message.url || undefined,
      },
      location: {
        latitude: message.latitude,
        longitude: message.longitude,
        name: message.name || undefined,
        address: message.address || undefined,
        url: message.url || undefined,
      },
    };
  }

  public refactoryContactMessage(message: ContactMessage): void {
    const contacts: Array<{ displayName: string; vcard: string }> = [];

    for (const user of message.contacts || []) {
      const rawId = user.id || '';
      const normalizedUserId = this.bot?.canonicalId
        ? this.bot.canonicalId(rawId)
        : normalizeJid(rawId);

      const phoneNumber = getPhoneNumber(normalizedUserId || rawId);
      const displayName = user.name || message.text || rawId;
      const vcard =
        'BEGIN:VCARD\n' +
        'VERSION:3.0\n' +
        `FN:${displayName}\n` +
        (user.description ? `ORG:${user.description};\n` : '') +
        (phoneNumber ? `TEL;type=CELL;type=VOICE;waid=${phoneNumber}: ${phoneNumber}\n` : '') +
        'END:VCARD';

      contacts.push({ displayName, vcard });
    }

    if (contacts.length === 1) {
      this.waMessage = {
        contactMessage: contacts[0],
        contacts: {
          displayName: message.text,
          contacts,
        },
      };
    } else {
      this.waMessage = {
        contactsArrayMessage: {
          displayName: message.text,
          contacts,
        },
        contacts: {
          displayName: message.text,
          contacts,
        },
      };
    }

    delete this.waMessage.text;
  }

  public async refactoryReactionMessage(message: ReactionMessage): Promise<void> {
    const rawKey = message.extra?.key;
    const normalizedChatId = await this.resolveJid(message.chat?.id);
    const normalizedUserId = await this.resolveJid(message.user?.id);
    const normalizedBotId = this.bot?.id;

    const reactionKey =
      rawKey?.id && rawKey.id === message.id && rawKey.remoteJid
        ? {
            remoteJid: rawKey.remoteJid,
            id: rawKey.id,
            fromMe: !!rawKey.fromMe,
            participant: rawKey.fromMe ? undefined : rawKey.participant || undefined,
          }
        : createReactionKey(
            normalizedChatId || message.chat?.id || '',
            message.id,
            message.fromMe,
            normalizedUserId,
            normalizedBotId,
            !!normalizedChatId && isGroupJid(normalizedChatId),
          );

    this.waMessage = {
      type: 'reaction',
      emoji: message.text || '',
      target: reactionKey,
      react: {
        key: reactionKey,
        text: message.text || '',
      },
    };
  }

  public refactoryPollMessage(message: PollMessage): void {
    this.waMessage = {
      type: 'poll',
      name: message.text || '',
      options: (message.options || []).map((opt) => opt.name),
      selectableCount: Number(message.extra?.selectableCount || 1),
      poll: {
        name: message.text || '',
        values: (message.options || []).map((opt) => opt.name),
        selectableCount: Number(message.extra?.selectableCount || 1),
      },
    };
  }

  public refactoryButtonMessage(message: ButtonMessage): void {
    if (!message.buttons || message.buttons.length === 0) {
      throw new Error('ButtonMessage deve ter pelo menos um botão');
    }

    if (message.buttons.length > 3) {
      throw new Error('ButtonMessage suporta no máximo 3 botões');
    }

    const buttons = message.buttons.map((button, index) => {
      const type = button.type || 'reply';
      if (type === 'url' || type === ButtonType.Url) {
        return {
          name: 'cta_url',
          buttonParamsJson: JSON.stringify({
            display_text: button.text,
            url: button.content,
            merchant_url: button.content,
          }),
        };
      }
      if (type === 'call' || type === ButtonType.Call) {
        return {
          name: 'cta_call',
          buttonParamsJson: JSON.stringify({
            display_text: button.text,
            phone_number: button.content,
          }),
        };
      }
      if (type === 'copy' || type === ButtonType.Copy) {
        return {
          name: 'cta_copy',
          buttonParamsJson: JSON.stringify({
            display_text: button.text,
            copy_code: button.content,
          }),
        };
      }
      return {
        name: 'quick_reply',
        buttonParamsJson: JSON.stringify({
          display_text: button.text,
          id: button.content || `btn_${index}`,
        }),
      };
    });

    this.waMessage = {
      __useBaileysHelper: true,
      text: message.text || '',
      footer: message.footer || undefined,
      interactiveButtons: buttons,
    };
  }

  public async refactoryListMessage(message: ListMessage): Promise<void> {
    if (!message.list || message.list.length === 0) {
      throw new Error('Lista deve ter pelo menos uma seção');
    }

    const hasItems = message.list.some((list) => list.items && list.items.length > 0);
    if (!hasItems) {
      throw new Error('Lista deve ter pelo menos um item');
    }

    this.waMessage = createInteractiveListPayload(message);
  }

  public static convertToWaMessageStatus(status: MessageStatus): any {
    return status;
  }
}
