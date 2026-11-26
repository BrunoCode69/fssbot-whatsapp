import TelegramBotAPI from 'node-telegram-bot-api';
import { createReadStream } from 'fs';
import { basename } from 'path';
import { Readable } from 'stream';

import LocationMessage from '../messages/LocationMessage';
import ReactionMessage from '../messages/ReactionMessage';
import ContactMessage from '../messages/ContactMessage';
import StickerMessage from '../messages/StickerMessage';
import MediaMessage from '../messages/MediaMessage';
import ImageMessage from '../messages/ImageMessage';
import AudioMessage from '../messages/AudioMessage';
import VideoMessage from '../messages/VideoMessage';
import TextMessage from '../messages/TextMessage';
import FileMessage from '../messages/FileMessage';
import PollMessage from '../messages/PollMessage';
import ButtonMessage from '../messages/ButtonMessage';
import ListMessage from '../messages/ListMessage';
import Message, { MessageType } from '../messages/Message';

import { getDefaultMediaFileName, isLocalFilePath } from '../utils/MediaUtils';
import TelegramToRompotConverter from './TelegramToRompotConverter';
import { TelegramUtils } from './TelegramUtils';
import type TelegramBot from './TelegramBot';
import { createButtonSendOptions } from './inline-keyboard';

export default class TelegramSendingController {
  public telegram: TelegramBot;

  constructor(telegram: TelegramBot) {
    this.telegram = telegram;
  }

  public async send(message: Message): Promise<Message> {
    if (ButtonMessage.isValid(message)) {
      console.info('[Telegram buttons] dispatching ButtonMessage', {
        type: message.type,
        chatId: message.chat?.id,
        buttonCount: message.buttons?.length || 0,
        labels: message.buttons?.map((button) => button.text) || [],
      });
      return await this.sendButtonMessage(message);
    }

    if (ListMessage.isValid(message)) {
      return await this.sendList(message);
    }

    if (TextMessage.isValid(message)) {
      return await this.sendText(message);
    }

    if (ReactionMessage.isValid(message)) {
      return await this.sendReaction(message);
    }

    if (ContactMessage.isValid(message)) {
      return await this.sendContact(message);
    }

    if (LocationMessage.isValid(message)) {
      return await this.sendLocation(message);
    }

    if (PollMessage.isValid(message)) {
      return await this.sendPoll(message);
    }

    if (AudioMessage.isValid(message)) {
      return await this.sendAudio(message);
    }

    if (ImageMessage.isValid(message)) {
      return await this.sendImage(message);
    }

    if (VideoMessage.isValid(message)) {
      return await this.sendVideo(message);
    }

    if (StickerMessage.isValid(message)) {
      return await this.sendSticker(message);
    }

    if (FileMessage.isValid(message)) {
      return await this.sendFile(message);
    }

    if (MediaMessage.isValid(message)) {
      return await this.sendMedia(message);
    }

    return await this.sendMessage(message);
  }

  public async sendMessage(message: Message): Promise<Message> {
    const options = TelegramSendingController.getOptions(message);

    const telegramMessage = await this.telegram.bot.sendMessage(
      Number(message.chat.id),
      `${message.text}`,
      options,
    );

    return await new TelegramToRompotConverter(telegramMessage).convert();
  }

  public async sendText(message: TextMessage): Promise<Message> {
    const options = TelegramSendingController.getOptions(message);

    const telegramMessage = await this.telegram.bot.sendMessage(
      Number(message.chat.id),
      `${message.text}`,
      options,
    );

    return await new TelegramToRompotConverter(telegramMessage).convert();
  }

  public async sendButtonMessage(message: ButtonMessage): Promise<Message> {
    if (message.buttons.length === 0) {
      throw new Error('Adicione ao menos um botão antes de enviar a mensagem.');
    }

    const options = createButtonSendOptions(message);
    if (message.footer) {
      message.text = `${message.text || ''}\n\n${message.footer}`;
    }

    console.info('[Telegram buttons] sending inline keyboard', {
      chatId: message.chat.id,
      textLength: String(message.text || '').length,
      keyboard: options.reply_markup,
    });

    const telegramMessage = await this.telegram.bot.sendMessage(
      Number(message.chat.id),
      `${message.text || ''}`,
      options,
    );
    return await new TelegramToRompotConverter(telegramMessage).convert();
  }

  public async sendList(message: ListMessage): Promise<Message> {
    const inline_keyboard: TelegramBotAPI.InlineKeyboardButton[][] = [];

    for (const category of message.list || []) {
      for (const item of category.items || []) {
        inline_keyboard.push([
          {
            text: `${item.title}${item.description ? ` - ${item.description}` : ''}`,
            callback_data: String(item.id || item.title),
          },
        ]);
      }
    }

    let text = message.text || '';
    if (message.title) {
      text = `*${message.title}*\n\n${text}`;
    }
    if (message.footer) {
      text = `${text}\n\n_${message.footer}_`;
    }

    const options: TelegramBotAPI.SendMessageOptions = {
      ...TelegramSendingController.getOptions(message),
      reply_markup: {
        inline_keyboard,
      },
    };

    const telegramMessage = await this.telegram.bot.sendMessage(
      Number(message.chat.id),
      text,
      options,
    );

    return await new TelegramToRompotConverter(telegramMessage).convert();
  }

  public async sendReaction(message: ReactionMessage): Promise<Message> {
    const options = TelegramSendingController.getOptions(message);

    const telegramMessage = await this.telegram.bot.sendDice(
      Number(message.chat.id),
      options,
    );

    return await new TelegramToRompotConverter(telegramMessage).convert();
  }

  public async sendContact(message: ContactMessage): Promise<Message> {
    const options = TelegramSendingController.getOptions(message);

    const telegramMessage = await this.telegram.bot.sendContact(
      Number(message.chat.id),
      TelegramUtils.getPhoneNumber(message.contacts.shift()?.id || ''),
      `${message.text}`,
      options,
    );

    return await new TelegramToRompotConverter(telegramMessage).convert();
  }

  public async sendLocation(message: LocationMessage): Promise<Message> {
    const options = TelegramSendingController.getOptions(message);

    if (message.name && message.address) {
      const telegramMessage = await this.telegram.bot.sendVenue(
        Number(message.chat.id),
        Number(message.latitude || 0),
        Number(message.longitude || 0),
        message.name,
        message.address,
        options,
      );
      return await new TelegramToRompotConverter(telegramMessage).convert();
    }

    const telegramMessage = await this.telegram.bot.sendLocation(
      Number(message.chat.id),
      Number(message.latitude || 0),
      Number(message.longitude || 0),
      options,
    );

    return await new TelegramToRompotConverter(telegramMessage).convert();
  }

  public async sendPoll(message: PollMessage): Promise<Message> {
    const options: any = TelegramSendingController.getOptions(message) || {};
    if (message.extra?.selectableCount && Number(message.extra.selectableCount) > 1) {
      options.allows_multiple_answers = true;
    }
    options.is_anonymous = false;

    const telegramMessage = await this.telegram.bot.sendPoll(
      Number(message.chat.id),
      `${message.text}`,
      message.options.map((option) => `${option.name || ''}`),
      options,
    );

    return await new TelegramToRompotConverter(telegramMessage).convert();
  }

  /**
   * Conteúdo do arquivo para envio: caminho de arquivo local vira stream de leitura
   * (sem carregar tudo em memória); os demais casos viram Buffer.
   */
  public static async getFileInput(message: MediaMessage): Promise<Buffer | Readable> {
    if (isLocalFilePath(message.file)) return createReadStream(message.file);

    return await message.getStream();
  }

  public async sendAudio(message: AudioMessage): Promise<Message> {
    const options = TelegramSendingController.getOptions(message);
    const fileOptions = TelegramSendingController.getFileOptions(message);
    const file = await TelegramSendingController.getFileInput(message);

    // `isPTT` = mensagem de voz.
    if (message.isPTT) {
      var telegramMessage = await this.telegram.bot.sendVoice(
        Number(message.chat.id),
        file,
        options,
        fileOptions,
      );
    } else {
      var telegramMessage = await this.telegram.bot.sendAudio(
        Number(message.chat.id),
        file,
        options,
        fileOptions,
      );
    }

    return await new TelegramToRompotConverter(telegramMessage).convert();
  }

  public async sendImage(message: ImageMessage): Promise<Message> {
    const options = TelegramSendingController.getOptions(message);
    const fileOptions = TelegramSendingController.getFileOptions(message);
    const file = await TelegramSendingController.getFileInput(message);

    if (message.isGIF) {
      var telegramMessage = await this.telegram.bot.sendAnimation(
        Number(message.chat.id),
        file,
        options,
      );
    } else {
      var telegramMessage = await this.telegram.bot.sendPhoto(
        Number(message.chat.id),
        file,
        options,
        fileOptions,
      );
    }

    return await new TelegramToRompotConverter(telegramMessage).convert();
  }

  public async sendVideo(message: VideoMessage): Promise<Message> {
    const options = TelegramSendingController.getOptions(message);
    const fileOptions = TelegramSendingController.getFileOptions(message);
    const file = await TelegramSendingController.getFileInput(message);

    if (message.isPTV) {
      // Vídeo redondo (video note): sem legenda.
      var telegramMessage = await this.telegram.bot.sendVideoNote(
        Number(message.chat.id),
        file as any,
        TelegramSendingController.getVideoNoteOptions(options),
        fileOptions,
      );
    } else if (message.isGIF) {
      var telegramMessage = await this.telegram.bot.sendAnimation(
        Number(message.chat.id),
        file,
        options,
      );
    } else {
      var telegramMessage = await this.telegram.bot.sendVideo(
        Number(message.chat.id),
        file,
        options,
        fileOptions,
      );
    }

    return await new TelegramToRompotConverter(telegramMessage).convert();
  }

  public async sendSticker(message: StickerMessage): Promise<Message> {
    const options = TelegramSendingController.getOptions(message);
    const fileOptions = TelegramSendingController.getFileOptions(message);

    const telegramMessage = await this.telegram.bot.sendSticker(
      Number(message.chat.id),
      await TelegramSendingController.getFileInput(message),
      options,
      fileOptions,
    );

    return await new TelegramToRompotConverter(telegramMessage).convert();
  }

  public async sendFile(message: FileMessage): Promise<Message> {
    const options = TelegramSendingController.getOptions(message);
    const fileOptions = TelegramSendingController.getFileOptions(message);

    const telegramMessage = await this.telegram.bot.sendDocument(
      Number(message.chat.id),
      await TelegramSendingController.getFileInput(message),
      options,
      fileOptions,
    );

    return await new TelegramToRompotConverter(telegramMessage).convert();
  }

  public async sendMedia(message: MediaMessage): Promise<Message> {
    const options = TelegramSendingController.getOptions(message);
    const fileOptions = TelegramSendingController.getFileOptions(message);

    const telegramMessage = await this.telegram.bot.sendDocument(
      Number(message.chat.id),
      await TelegramSendingController.getFileInput(message),
      options,
      fileOptions,
    );

    return await new TelegramToRompotConverter(telegramMessage).convert();
  }

  public async sendEditedMessage(message: Message): Promise<void> {
    const options = TelegramSendingController.getOptions(message);

    if (MediaMessage.isValid(message)) {
      await this.telegram.bot.editMessageCaption(message.text, options);
    } else {
      await this.telegram.bot.editMessageText(message.text, options);
    }
  }

  public static getOptions(
    message: Message,
    options: TelegramBotAPI.SendBasicOptions &
      TelegramBotAPI.SendAudioOptions &
      TelegramBotAPI.SendVoiceOptions &
      TelegramBotAPI.SendAnimationOptions &
      TelegramBotAPI.SendVideoOptions &
      TelegramBotAPI.SendDocumentOptions &
      TelegramBotAPI.SendContactOptions &
      TelegramBotAPI.SendLocationOptions &
      TelegramBotAPI.SendPollOptions &
      TelegramBotAPI.SendDiceOptions &
      TelegramBotAPI.EditMessageTextOptions = {},
  ) {
    options.chat_id = Number(message.chat.id || 0);
    options.message_id = Number(message.id || 0);

    options.caption_entities = message.mentions.reduce((entities, mention) => {
      const result = new RegExp(`@(${mention || ''})`).exec(
        `${message.text || ''}`,
      );

      const searchedMention = result?.shift();

      if (searchedMention) {
        entities.push({
          type: 'mention',
          offset: result?.index || 0,
          length: searchedMention.length,
        });
      }

      return entities;
    }, [] as TelegramBotAPI.MessageEntity[]);

    if (message.mention) {
      options.reply_to_message_id = Number(message.mention.id || 0);
    }

    if (message.extra?.threadId !== undefined && message.extra?.threadId !== null && message.extra?.threadId !== '') {
      (options as any).message_thread_id = Number(message.extra.threadId);
    }

    if (MediaMessage.isValid(message)) {
      options.caption = `${message.text || ''}`;
      options.title = `${message.name || ''}`;

      if (AudioMessage.isValid(message)) {
        options.duration = Number(message.duration || 0);
      }

      if (VideoMessage.isValid(message)) {
        if (message.duration > 0) options.duration = Math.round(message.duration);

        if (message.width > 0 && message.height > 0) {
          options.width = message.width;
          options.height = message.height;
        }
      }
    } else if (ReactionMessage.isValid(message)) {
      options.emoji = `${message.text || ''}`;
    }

    if (message.extra) {
      Object.assign(options, message.extra);
    }

    return options;
  }

  /** Opções do vídeo redondo: as mesmas do envio, sem legenda nem título. */
  public static getVideoNoteOptions(
    options: Record<string, any>,
  ): TelegramBotAPI.SendVideoNoteOptions {
    const videoNoteOptions = { ...options };

    delete videoNoteOptions.caption;
    delete videoNoteOptions.caption_entities;
    delete videoNoteOptions.title;
    delete videoNoteOptions.width;
    delete videoNoteOptions.height;

    return videoNoteOptions;
  }

  public static getFileOptions(
    message: MediaMessage,
    options: TelegramBotAPI.FileOptions = {},
  ) {
    const isDocument =
      message.type == MessageType.File || message.type == MessageType.Media;

    // Documento sem nome: nome do arquivo local ou "document.<ext do mimetype>".
    // Nos demais tipos, sem nome a biblioteca usa o do arquivo local ou detecta pelo conteúdo.
    options.filename = `${
      message.name ||
      (isDocument
        ? isLocalFilePath(message.file)
          ? basename(message.file)
          : getDefaultMediaFileName(message.mimetype)
        : '')
    }`;
    options.contentType = `${message.mimetype || ''}`;

    return options;
  }
}
