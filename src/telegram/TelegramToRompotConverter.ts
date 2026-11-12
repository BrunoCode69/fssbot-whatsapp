import TelegramBotAPI from 'node-telegram-bot-api';

import Message, { MessageStatus, MessageType } from '../messages/Message';
import LocationMessage from '../messages/LocationMessage';
import ReactionMessage from '../messages/ReactionMessage';
import ContactMessage from '../messages/ContactMessage';
import StickerMessage from '../messages/StickerMessage';
import MediaMessage from '../messages/MediaMessage';
import ImageMessage from '../messages/ImageMessage';
import AudioMessage from '../messages/AudioMessage';
import VideoMessage from '../messages/VideoMessage';
import EmptyMessage from '../messages/EmptyMessage';
import TextMessage from '../messages/TextMessage';
import FileMessage from '../messages/FileMessage';
import PollMessage from '../messages/PollMessage';

import User from '../modules/user/User';

import { TelegramUtils } from './TelegramUtils';
import { toMediaNumber } from '../utils/MediaUtils';

export default class TelegramToRompotConverter {
  public telegramMessage: TelegramBotAPI.Message;
  public rompotMessage: Message;

  constructor(telegramMessage: TelegramBotAPI.Message) {
    this.telegramMessage = telegramMessage;
    this.rompotMessage = new EmptyMessage();
  }

  public async convert(received?: boolean): Promise<Message> {
    if (!this.telegramMessage || typeof this.telegramMessage != 'object') {
      return this.rompotMessage;
    }

    this.rompotMessage.chat.id = TelegramUtils.getId(this.telegramMessage.chat);
    this.rompotMessage.chat.name = TelegramUtils.getName(
      this.telegramMessage.chat,
    );
    this.rompotMessage.chat.type = TelegramUtils.getChatType(
      this.telegramMessage.chat,
    );
    this.rompotMessage.chat.nickname = TelegramUtils.getNickname(
      this.telegramMessage.chat,
    );
    this.rompotMessage.chat.phoneNumber = TelegramUtils.getPhoneNumber(
      this.telegramMessage.chat.id,
    );

    this.rompotMessage.user.id = TelegramUtils.getId(
      this.telegramMessage.from!,
    );
    this.rompotMessage.user.name = TelegramUtils.getName(
      this.telegramMessage.from!,
    );
    this.rompotMessage.user.nickname = TelegramUtils.getNickname(
      this.telegramMessage.from!,
    );
    this.rompotMessage.user.phoneNumber = TelegramUtils.getPhoneNumber(
      this.telegramMessage.from!.id,
    );
    this.rompotMessage.extra.telegramAnonymousAdmin =
      TelegramUtils.isAnonymousGroupAdminMessage(this.telegramMessage);

    this.rompotMessage.id = `${this.telegramMessage.message_id}`;
    this.rompotMessage.text = `${this.telegramMessage.text || this.telegramMessage.caption || ''}`;
    this.rompotMessage.mentions = TelegramUtils.getMessageMentions(
      this.telegramMessage,
    );

    this.rompotMessage.isEdited = !!this.telegramMessage.edit_date;

    if (received) {
      this.rompotMessage.status = MessageStatus.Sended;
      this.rompotMessage.timestamp =
        Number(this.telegramMessage.date || 0) * 1000;
      this.rompotMessage.chat.timestamp = this.rompotMessage.timestamp;
    }

    if (this.telegramMessage.reply_to_message) {
      const convertor = new TelegramToRompotConverter(
        this.telegramMessage.reply_to_message,
      );

      this.rompotMessage.mention = await convertor.convert(received);
    }

    this.convertText();
    this.convertMedia();
    this.convertAnimantion();
    this.convertPhoto();
    this.convertVideo();
    this.convertVideoNote();
    this.convertAudio();
    this.convertVoice();
    this.convertDocument();
    this.convertSticker();
    this.convertContact();
    this.convertDice();
    this.convertLocation();
    this.convertVenue();
    this.convertPoll();

    return this.rompotMessage;
  }

  public convertText() {
    if (!('text' in this.telegramMessage)) return;

    this.rompotMessage = TextMessage.fromJSON({
      ...this.rompotMessage,
      type: MessageType.Text,
      text: TelegramUtils.getText(this.telegramMessage),
    });
  }

  public convertMedia() {
    if (!('caption' in this.telegramMessage)) return;

    this.rompotMessage = MediaMessage.fromJSON({
      ...this.rompotMessage,
      type: MessageType.Media,
      text: TelegramUtils.getText(this.telegramMessage),
    });
  }

  public convertAnimantion() {
    if (!this.telegramMessage.animation) return;

    const animation = this.telegramMessage.animation;

    this.rompotMessage = ImageMessage.fromJSON({
      ...this.rompotMessage,
      isGIF: true,
      type: MessageType.Image,
      ...TelegramToRompotConverter.getMediaInfo(animation, 'video/mp4'),
      file: { stream: animation },
    });
  }

  public convertPhoto() {
    if (!this.telegramMessage.photo) return;

    const photo =
      this.telegramMessage.photo[this.telegramMessage.photo.length - 1 || 0] ||
      ({} as TelegramBotAPI.PhotoSize);

    this.rompotMessage = ImageMessage.fromJSON({
      ...this.rompotMessage,
      type: MessageType.Image,
      // O Telegram recomprime fotos sempre em JPEG.
      ...TelegramToRompotConverter.getMediaInfo(photo, 'image/jpeg'),
      file: { stream: photo },
    });
  }

  public convertVideo() {
    if (!this.telegramMessage.video) return;

    const video = this.telegramMessage.video;

    this.rompotMessage = VideoMessage.fromJSON({
      ...this.rompotMessage,
      type: MessageType.Video,
      ...TelegramToRompotConverter.getMediaInfo(video, 'video/mp4'),
      duration: toMediaNumber(video.duration),
      file: { stream: video },
    });
  }

  public convertVideoNote() {
    if (!this.telegramMessage.video_note) return;

    const videoNote = this.telegramMessage.video_note;
    // Vídeo redondo: quadrado com lado `length`.
    const side = toMediaNumber(videoNote.length);

    this.rompotMessage = VideoMessage.fromJSON({
      ...this.rompotMessage,
      type: MessageType.Video,
      isPTV: true,
      ...TelegramToRompotConverter.getMediaInfo(videoNote, 'video/mp4'),
      width: side,
      height: side,
      duration: toMediaNumber(videoNote.duration),
      file: { stream: videoNote },
    });
  }

  public convertAudio() {
    if (!this.telegramMessage.audio) return;

    const audio = this.telegramMessage.audio;
    const info = TelegramToRompotConverter.getMediaInfo(audio, 'audio/mpeg');

    this.rompotMessage = AudioMessage.fromJSON({
      ...this.rompotMessage,
      type: MessageType.Audio,
      ...info,
      name: info.name || `${audio.title || ''}`,
      duration: toMediaNumber(audio.duration),
      file: { stream: audio },
    });
  }

  public convertVoice() {
    if (!this.telegramMessage.voice) return;

    const voice = this.telegramMessage.voice;

    this.rompotMessage = AudioMessage.fromJSON({
      ...this.rompotMessage,
      isPTT: true,
      type: MessageType.Audio,
      ...TelegramToRompotConverter.getMediaInfo(voice, 'audio/ogg'),
      duration: toMediaNumber(voice.duration),
      file: { stream: voice },
    });
  }

  public convertDocument() {
    if (!this.telegramMessage.document) return;
    // GIFs chegam com `animation` e também `document`; prevalece a animação.
    if (this.telegramMessage.animation) return;

    const document = this.telegramMessage.document;

    this.rompotMessage = FileMessage.fromJSON({
      ...this.rompotMessage,
      type: MessageType.File,
      ...TelegramToRompotConverter.getMediaInfo(
        document,
        'application/octet-stream',
      ),
      file: { stream: document },
    });
  }

  public convertSticker() {
    if (!this.telegramMessage.sticker) return;

    const sticker = this.telegramMessage.sticker;
    const mimetype = sticker.is_video
      ? 'video/webm'
      : sticker.is_animated
        ? 'application/x-tgsticker'
        : 'image/webp';

    this.rompotMessage = StickerMessage.fromJSON({
      ...this.rompotMessage,
      type: MessageType.Sticker,
      ...TelegramToRompotConverter.getMediaInfo(sticker, mimetype),
      isGIF: !!(
        this.telegramMessage.sticker.is_animated ||
        this.telegramMessage.sticker.is_video
      ),
      categories: this.telegramMessage.sticker.emoji
        ? [this.telegramMessage.sticker.emoji]
        : [],
      author: `${this.telegramMessage.sticker.set_name || ''}`,
      stickerId: `${this.telegramMessage.sticker.custom_emoji_id || ''}`,
      file: { stream: this.telegramMessage.sticker },
    });
  }

  /**
   * Metadados comuns de um arquivo do Telegram (`mime_type`, `file_name`, `file_size`,
   * `width`, `height`) já nos nomes de campo do Rompot.
   */
  public static getMediaInfo(file: any, defaultMimetype: string) {
    return {
      mimetype: `${file?.mime_type || defaultMimetype}`,
      name: `${file?.file_name || ''}`,
      size: toMediaNumber(file?.file_size),
      width: toMediaNumber(file?.width),
      height: toMediaNumber(file?.height),
    };
  }

  public convertContact() {
    if (!this.telegramMessage.contact) return;

    this.rompotMessage = ContactMessage.fromJSON({
      ...this.rompotMessage,
      type: MessageType.Contact,
      users: [
        new User(
          TelegramUtils.getId(this.telegramMessage.contact),
          TelegramUtils.getName(this.telegramMessage.contact),
        ),
      ],
    });
  }

  public convertDice() {
    if (!this.telegramMessage.dice) return;

    this.rompotMessage = ReactionMessage.fromJSON({
      ...this.rompotMessage,
      type: MessageType.Reaction,
      text: this.telegramMessage.dice.emoji,
    });
  }

  public convertLocation() {
    if (!this.telegramMessage.location) return;

    this.rompotMessage = LocationMessage.fromJSON({
      ...this.rompotMessage,
      type: MessageType.Location,
      latitude: this.telegramMessage.location.latitude,
      longitude: this.telegramMessage.location.longitude,
    });
  }

  public convertVenue() {
    if (!this.telegramMessage.venue) return;

    this.rompotMessage = LocationMessage.fromJSON({
      ...this.rompotMessage,
      type: MessageType.Location,
      latitude: this.telegramMessage.venue.location.latitude,
      longitude: this.telegramMessage.venue.location.longitude,
    });
  }

  public convertPoll() {
    if (!this.telegramMessage.poll) return;

    this.rompotMessage = PollMessage.fromJSON({
      ...this.rompotMessage,
      type: MessageType.Poll,
      text: this.telegramMessage.poll.question,
      options: this.telegramMessage.poll.options.map((option) => {
        return { id: option.text, name: option.text };
      }),
    });
  }
}
