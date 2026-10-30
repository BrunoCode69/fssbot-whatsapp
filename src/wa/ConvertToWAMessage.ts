import {
  generateWAMessage,
  MiscMessageGenerationOptions,
  proto,
} from 'baileys';

import Message, { MessageStatus, MessageType } from '../messages/Message';
import ListMessage from '../messages/ListMessage';
import LocationMessage from '../messages/LocationMessage';
import ReactionMessage from '../messages/ReactionMessage';
import ContactMessage from '../messages/ContactMessage';
import StickerMessage from '../messages/StickerMessage';
import ButtonMessage from '../messages/ButtonMessage';
import MediaMessage from '../messages/MediaMessage';
import ImageMessage from '../messages/ImageMessage';
import AudioMessage from '../messages/AudioMessage';
import VideoMessage from '../messages/VideoMessage';
import PollMessage from '../messages/PollMessage';

import { getWaSticker } from '../utils/Libs';

import { getID, getPhoneNumber, isGroupJid } from './ID';
import { createReactionKey } from './reaction-key';
import { createInteractiveListPayload } from './interactive-list-payload';
import type WhatsAppBot from './WhatsAppBot';

export default class ConvertToWAMessage {
  public message: Message;
  public bot: WhatsAppBot;
  public isMention: boolean;

  public chatId: string = '';
  public waMessage: any = {};
  public options: MiscMessageGenerationOptions = {};
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
      return (await this.bot.resolveId(jid)) || undefined;
    } catch (error) {
      this.bot.logger?.error?.('Error normalizing JID:', jid, error);
      return undefined;
    }
  }

  /**
   * * Refatora a mensagem
   * @param message
   */
  public async refactory(message = this.message): Promise<this> {
    this.waMessage = await this.refactoryMessage(message);

    // Envia sempre para o ID canônico; o Baileys escolhe a sessão LID/PN internamente
    const chatId = await this.resolveJid(message.chat.id);

    if (!chatId) {
      throw new Error(`Invalid chat ID: ${message.chat.id}`);
    }

    this.chatId = chatId;

    if (message.mention && !this.isMention) {
      this.options.quoted = await this.createQuoted(message.mention);
    }

    if (MediaMessage.isValid(message))
      await this.refactoryMediaMessage(message);
    if (LocationMessage.isValid(message))
      this.refactoryLocationMessage(message);
    if (ReactionMessage.isValid(message))
      await this.refactoryReactionMessage(message);
    if (ContactMessage.isValid(message)) this.refactoryContactMessage(message);
    if (ButtonMessage.isValid(message)) this.refactoryButtonMessage(message);
    if (ListMessage.isValid(message)) await this.refactoryListMessage(message);
    if (PollMessage.isValid(message)) this.refactoryPollMessage(message);

    return this;
  }

  /**
   * Monta a mensagem citada. Usa a mensagem original do cache quando existe
   * (conteúdo e chave exatos); senão gera uma cópia a partir dos dados do Rompot.
   */
  public async createQuoted(mention: Message) {
    const cached = this.bot.getCachedWAMessage(mention.extra?.key?.id || mention.id);
    if (cached?.key?.id) return cached;

    const { waMessage } = await new ConvertToWAMessage(this.bot, mention, true).refactory(mention);

    const key = await this.bot.getMessageKey(mention);
    const userJid = (await this.resolveJid(mention.user?.id)) || this.bot.id;

    const quoted = await generateWAMessage(key?.remoteJid || this.chatId, waMessage, {
      userJid,
      upload(): any {
        return {};
      },
    });

    quoted.key.fromMe = key ? !!key.fromMe : userJid == this.bot.id;
    quoted.key.id = mention.id || quoted.key.id;
    quoted.key.remoteJid = key?.remoteJid || this.chatId;

    if (isGroupJid(this.chatId) && !quoted.key.fromMe) {
      quoted.key.participant = key?.participant || userJid;
    }

    return quoted;
  }

  /**
   * * Refatora outras informações da mensagem
   * @param message
   * @returns
   */
  public async refactoryMessage(message: Message) {
    const msg: any = {};

    msg.text = message.text;

    const normalizedChatId = await this.resolveJid(message.chat.id);
    const normalizedUserId = await this.resolveJid(message.user.id);

    if (normalizedUserId && normalizedChatId && isGroupJid(normalizedChatId)) {
      msg.participant = normalizedUserId;
    }

    if (message.mentions) {
      msg.mentions = [];

      for (const jid of message.mentions) {
        const normalizedJid = await this.resolveJid(jid);
        if (normalizedJid && !msg.mentions.includes(normalizedJid)) {
          msg.mentions.push(normalizedJid);
        }
      }

      for (const mention of `${msg.text || ''}`.split(/@(.*?)/)) {
        const mentionNumber = `${mention.split(/\s+/)[0] || ''}`.replace(/\D+/g, '');

        if (
          !mentionNumber ||
          mentionNumber.length < 9 ||
          mentionNumber.length > 15
        )
          continue;

        const jid = await this.resolveJid(getID(mentionNumber));

        if (!jid || msg.mentions.includes(jid)) continue;

        msg.mentions.push(jid);
      }
    }

    if (message.fromMe) msg.fromMe = message.fromMe;
    if (message.id) msg.id = message.id;

    if (message.isEdited) {
      const key = await this.bot.getMessageKey(message);

      msg.edit = {
        remoteJid: key?.remoteJid || normalizedChatId || '',
        id: message.id || '',
        fromMe: key ? !!key.fromMe : message.fromMe || normalizedUserId == this.bot.id,
        participant: key?.participant || undefined,
        toJSON: () => this,
      };
    }

    if (message.extra?.isRelay) {
      this.isRelay = true;
    }

    return msg;
  }

  /**
   * * Refatora uma mensagem de midia
   * @param message
   */
  public async refactoryMediaMessage(message: MediaMessage) {
    let stream: Buffer;

    if (!this.isMention) {
      stream = await message.getStream();
    } else {
      // Create fake stream
      stream = Buffer.from('');
    }

    // Convert audio message
    if (AudioMessage.isValid(message)) {
      this.waMessage.audio = stream;
      this.waMessage.ptt = !!message.isPTT;

      // Convert image message
    } else if (ImageMessage.isValid(message)) {
      this.waMessage.image = stream;

      // Convert video message
    } else if (VideoMessage.isValid(message)) {
      this.waMessage.video = stream;

      // Convert sticker message
    } else if (StickerMessage.isValid(message)) {
      await this.refatoryStickerMessage(message);

      // Convert default media message (includes file)
    } else {
      this.waMessage.document = stream;
    }

    this.waMessage.gifPlayback = !!message?.isGIF;
    this.waMessage.caption = this.waMessage.text;
    this.waMessage.mimetype = message.mimetype;
    this.waMessage.fileName = message.name;

    delete this.waMessage.text;
  }

  public async refatoryStickerMessage(message: StickerMessage) {
    const stickerFile = await message.getSticker();

    this.waMessage = { ...this.waMessage, sticker: stickerFile };

    try {
      const waSticker = await getWaSticker();

      if (waSticker) {
        const sticker = new waSticker.default(stickerFile, {
          pack: message.pack,
          author: message.author,
          categories: message.categories,
          id: message.stickerId,
          type: waSticker.StickerTypes.FULL,
          quality: 100,
        });

        this.waMessage = { ...this.waMessage, ...(await sticker.toMessage()) };
      }
    } catch (err) {
      this.bot.emit('error', err);
    }
  }

  public refactoryLocationMessage(message: LocationMessage) {
    this.waMessage.location = {
      degreesLatitude: message.latitude,
      degreesLongitude: message.longitude,
    };

    delete this.waMessage.text;
  }

  public refactoryContactMessage(message: ContactMessage) {
    this.waMessage.contacts = {
      displayName: message.text,
      contacts: [],
    };

    for (const user of message.contacts) {
      const normalizedUserId = this.bot.canonicalId(user.id);
      if (!normalizedUserId) continue;

      const phoneNumber = getPhoneNumber(normalizedUserId);
      if (!phoneNumber) continue;
      const displayName = user.name || message.text || user.id;
      const vcard =
        'BEGIN:VCARD\n' +
        'VERSION:3.0\n' +
        `FN:${displayName}\n` +
        (user.description ? `ORG:${user.description};\n` : '') +
        `TEL;type=CELL;type=VOICE;waid=${phoneNumber}: ${phoneNumber}\n` +
        'END:VCARD';

      this.waMessage.contacts.contacts.push({
        displayName,
        vcard,
      });
    }

    delete this.waMessage.text;
  }

  /**
   * * Refatora uma mensagem de reação
   * @param message
   */
  public async refactoryReactionMessage(message: ReactionMessage) {
    const rawKey = message.extra?.key;
    const normalizedChatId = await this.resolveJid(message.chat.id);
    const normalizedUserId = await this.resolveJid(message.user.id);
    const normalizedBotId = this.bot.id;

    // Com a chave original, a reação aponta exatamente para a mensagem recebida
    const reactionKey = rawKey?.id && rawKey.id == message.id && rawKey.remoteJid
      ? {
          remoteJid: rawKey.remoteJid,
          id: rawKey.id,
          fromMe: !!rawKey.fromMe,
          participant: rawKey.fromMe ? undefined : rawKey.participant || undefined,
        }
      : createReactionKey(
          normalizedChatId || message.chat.id,
          message.id,
          message.fromMe,
          normalizedUserId,
          normalizedBotId,
          !!normalizedChatId && isGroupJid(normalizedChatId),
        );

    this.waMessage = {
      react: {
        key: {
          ...reactionKey,
          toJSON: () => this,
        },
        text: message.text,
      },
    };
  }

  /**
   * * Refatora uma mensagem de enquete
   * @param message
   */
  public refactoryPollMessage(message: PollMessage) {
    this.waMessage = {
      poll: {
        name: message.text,
        values: message.options.map((opt) => opt.name),
        selectableCount: Number(message.extra?.selectableCount || 1),
      },
    };
  }

  /**
   * * Refatora uma mensagem de botão com formato simples
   * Converte para formato compatível com baileys
   * @param message
   */
  public refactoryButtonMessage(message: ButtonMessage) {
    // Valida se há botões
    if (!message.buttons || message.buttons.length === 0) {
      throw new Error('ButtonMessage deve ter pelo menos um botão');
    }

    // Máximo de 3 botões
    if (message.buttons.length > 3) {
      throw new Error('ButtonMessage suporta no máximo 3 botões');
    }

    // Converte botões para formato baileys_helper
    const buttons = message.buttons.map((button, index) => ({
      name: 'quick_reply',
      buttonParamsJson: JSON.stringify({
        display_text: button.text,
        id: button.content || `btn_${index}`,
      }),
    }));

    // Marca para usar baileys_helper e gera formato interativo
    this.waMessage = {
      __useBaileysHelper: true,
      text: message.text || '',
      footer: message.footer || undefined,
      interactiveButtons: buttons,
    };

    this.isRelay = false;
  }

  /**
   * * Refatora uma mensagem de lista
    * Converte para o formato interativo single-select do helper WhatsApp
   * @param message
   */
  public async refactoryListMessage(message: ListMessage) {
    // Valida se há pelo menos uma seção com itens
    if (!message.list || message.list.length === 0) {
      throw new Error('Lista deve ter pelo menos uma seção');
    }

    const hasItems = message.list.some((list) => list.items && list.items.length > 0);
    if (!hasItems) {
      throw new Error('Lista deve ter pelo menos um item');
    }

    this.waMessage = createInteractiveListPayload(message);
    this.isRelay = false;
  }

  public static convertToWaMessageStatus(
    status: MessageStatus,
  ): proto.WebMessageInfo.Status {
    if (status == MessageStatus.Error) return proto.WebMessageInfo.Status.ERROR;
    if (status == MessageStatus.Sending)
      return proto.WebMessageInfo.Status.PENDING;
    if (status == MessageStatus.Sended)
      return proto.WebMessageInfo.Status.SERVER_ACK;
    if (status == MessageStatus.Received)
      return proto.WebMessageInfo.Status.DELIVERY_ACK;
    if (status == MessageStatus.Readed) return proto.WebMessageInfo.Status.READ;
    if (status == MessageStatus.Played)
      return proto.WebMessageInfo.Status.PLAYED;

    return proto.WebMessageInfo.Status.PENDING;
  }
}