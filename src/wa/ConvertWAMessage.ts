import digestSync from 'crypto-digest-sync';
import Long from 'long';

import Message, { MessagePlataform, MessageStatus, MessageType } from '../messages/Message';
import PollMessage, { PollAction, type PollOption } from '../messages/PollMessage';
import ListMessage, { ListType } from '../messages/ListMessage';
import MediaMessage, { Media } from '../messages/MediaMessage';
import PollUpdateMessage from '../messages/PollUpdateMessage';
import LocationMessage from '../messages/LocationMessage';
import ReactionMessage from '../messages/ReactionMessage';
import ContactMessage from '../messages/ContactMessage';
import StickerMessage from '../messages/StickerMessage';
import ButtonMessage from '../messages/ButtonMessage';
import ImageMessage from '../messages/ImageMessage';
import AudioMessage from '../messages/AudioMessage';
import VideoMessage from '../messages/VideoMessage';
import EmptyMessage from '../messages/EmptyMessage';
import ErrorMessage from '../messages/ErrorMessage';
import TextMessage from '../messages/TextMessage';
import FileMessage from '../messages/FileMessage';
import { WAMessageError } from './WAMessage';
import { getWaSticker } from '../utils/Libs';
import { toMediaNumber } from '../utils/MediaUtils';
import ChatType from '../modules/chat/ChatType';
import WhatsAppBot from './WhatsAppBot';
import User from '../modules/user/User';
import Chat from '../modules/chat/Chat';
import { getPhoneNumber, isGroupJid, isUserJid, normalizeJid } from './ID';
import { extractInteractiveListSelection } from './list-selection';
import { createReactionMessageData } from './reaction-message-data';
import {
  getPollCreationContent,
  getPollCreatorJid,
  getPollVoterId,
  getPollVoteChange,
  normalizePollJid,
} from './poll-content';

export default class ConvertWAMessage {
  public type?: any;
  public waMessage: any = { key: {} };

  private message: Message = new Message();
  private bot: WhatsAppBot;

  constructor(bot: WhatsAppBot, waMessage: any, type?: any) {
    this.bot = bot;
    this.set(waMessage, type);
  }

  public set(waMessage: any = this.waMessage, type?: any) {
    this.waMessage = waMessage;
    this.type = type;
  }

  public async get(): Promise<Message> {
    await this.convertMessage(this.waMessage, this.type);
    return this.message;
  }

  public async convertMessage(waMessage: any, type: any = 'notify'): Promise<void> {
    if (!waMessage) {
      this.message = EmptyMessage.fromJSON({ ...this.message, type: MessageType.Empty });
      return;
    }

    // Se for um addon descriptografado pelo ZapoJS (reaction, poll_vote, message_edit)
    if (waMessage.kind && waMessage.decrypted) {
      await this.convertAddonMessage(waMessage);
      return;
    }

    if (waMessage.message) {
      await this.convertContentMessage(waMessage.message);

      if (waMessage.timestampSeconds) {
        this.message.timestamp = Number(waMessage.timestampSeconds) * 1000;
      } else if (Long.isLong(waMessage.messageTimestamp)) {
        this.message.timestamp = (waMessage.messageTimestamp.toNumber() || 0) * 1000 || Date.now();
      } else if (waMessage.messageTimestamp) {
        this.message.timestamp = (Number(waMessage.messageTimestamp) || 0) * 1000 || Date.now();
      } else {
        this.message.timestamp = Date.now();
      }
    }

    const key: any = waMessage.key || {};
    const rawParticipant = key.participant || waMessage.participant || undefined;

    this.message.plataform = MessagePlataform.Web;
    this.message.isUnofficial = false;
    this.message.fromMe = !!key.fromMe;
    this.message.id = this.message.id || key.id || '';

    // Mapeia LID/PN recebido
    if (this.bot && typeof this.bot.extractAndMapLID === 'function') {
      this.bot.extractAndMapLID(waMessage);
    }

    // Chave original para respostas/reações
    this.message.extra.key = {
      remoteJid: key.remoteJid || undefined,
      id: key.id || undefined,
      fromMe: !!key.fromMe,
      participant: rawParticipant,
    };

    const resolve = async (id: string | undefined): Promise<string> => {
      if (!id) return '';
      if (this.bot && typeof this.bot.resolveId === 'function') {
        return (await this.bot.resolveId(id)) || normalizeJid(id);
      }
      return normalizeJid(id);
    };

    const chatId = await resolve(key.remoteJid || '');
    this.message.chat = new Chat(chatId);
    this.message.chat.type = isGroupJid(chatId) ? ChatType.Group : ChatType.PV;

    if (this.message.chat.type === ChatType.PV) {
      this.message.chat.phoneNumber = getPhoneNumber(chatId) || undefined;
      this.message.chat.lid = this.bot?.lidMapper?.getLID(chatId) || undefined;
    }

    this.message.status = ConvertWAMessage.convertMessageStatus(
      ConvertWAMessage.isMessageUpdate(waMessage)
        ? waMessage.update.status!
        : waMessage.status!,
    );

    const userId = key.fromMe
      ? this.bot?.id || ''
      : await resolve(rawParticipant || key.remoteJid || '');

    const user = new User(userId);
    if (isUserJid(userId)) {
      user.phoneNumber = getPhoneNumber(userId) || undefined;
      user.lid =
        (key.fromMe ? this.bot?.lid : this.bot?.lidMapper?.getLID(userId)) || undefined;
    }

    const pushName = waMessage.pushName || waMessage.verifiedBizName;
    if (!key.fromMe && pushName) {
      user.name = pushName;
    }

    this.message.user = user;
  }

  /**
   * Converte addons nativos do ZapoJS (reações, votos de enquete, edições)
   */
  public async convertAddonMessage(addon: any): Promise<void> {
    const key = addon.key || {};
    const resolve = async (id: string | undefined): Promise<string> => {
      if (!id) return '';
      if (this.bot && typeof this.bot.resolveId === 'function') {
        return (await this.bot.resolveId(id)) || normalizeJid(id);
      }
      return normalizeJid(id);
    };

    const chatId = await resolve(key.remoteJid || '');
    const userId = key.fromMe
      ? this.bot?.id || ''
      : await resolve(key.participant || key.remoteJid || '');

    const chat = new Chat(chatId, isGroupJid(chatId) ? ChatType.Group : ChatType.PV);
    const user = new User(userId);
    user.phoneNumber = getPhoneNumber(userId) || undefined;
    user.lid = this.bot?.lidMapper?.getLID(userId) || undefined;

    if (addon.pushName) user.name = addon.pushName;

    const baseMessage: Partial<Message> = {
      id: key.id || addon.targetMessageId || '',
      chat,
      user,
      fromMe: !!key.fromMe,
      timestamp: addon.timestampSeconds ? Number(addon.timestampSeconds) * 1000 : Date.now(),
      extra: {
        key: {
          remoteJid: key.remoteJid,
          id: key.id,
          fromMe: !!key.fromMe,
          participant: key.participant,
        },
      },
    };

    if (addon.kind === 'reaction') {
      const emoji = addon.decrypted?.reaction?.text || '';
      const reaction = ReactionMessage.fromJSON({
        ...baseMessage,
        type: MessageType.Reaction,
        text: emoji,
        id: addon.targetMessageId || addon.decrypted?.reaction?.key?.id || key.id,
      });
      reaction.extra.targetMessageId = addon.targetMessageId;
      this.message = reaction;
      return;
    }

    if (addon.kind === 'poll_vote') {
      const pollMessageId = addon.targetMessageId || key.id || '';
      const pollCreation = this.bot
        ? await this.bot.getPollMessage(pollMessageId)
        : null;

      const pollUpdate = PollUpdateMessage.fromJSON({
        ...baseMessage,
        type: MessageType.PollUpdate,
        text: pollCreation?.text || '',
        id: key.id || pollMessageId,
      });
      pollUpdate.extra.pollCreationMessageId = pollMessageId;

      const selectedOptionNames: string[] =
        addon.decrypted?.selectedOptionNames || [];

      if (pollCreation) {
        const oldVotes: string[] = pollCreation.getUserVotes(userId);
        const voteChange = getPollVoteChange(oldVotes, selectedOptionNames);

        if (voteChange) {
          pollUpdate.action =
            voteChange.action === 'add' ? PollAction.Add : PollAction.Remove;
          pollUpdate.text = voteChange.option;

          const matchedOpt = pollCreation.options.find(
            (o) => o.name === voteChange.option,
          );
          pollUpdate.selected = matchedOpt?.id || voteChange.option;
        }

        pollCreation.setUserVotes(userId, selectedOptionNames);
        if (this.bot) {
          await this.bot.savePollMessage(pollCreation);
        }
      } else {
        if (selectedOptionNames.length) {
          pollUpdate.action = PollAction.Add;
          pollUpdate.text = selectedOptionNames[0];
          pollUpdate.selected = selectedOptionNames[0];
        }
      }

      this.message = pollUpdate;
      return;
    }

    if (addon.kind === 'message_edit') {
      const editedProto = addon.decrypted?.message;
      if (editedProto) {
        await this.convertContentMessage(editedProto);
      }
      this.message.id = addon.targetMessageId || key.id || '';
      this.message.isEdited = true;
      this.message.chat = chat;
      this.message.user = user;
      return;
    }
  }

  /**
   * Desembrulha os contêineres comuns (temporária, visualização única, documento com legenda),
   * inclusive combinados, até 5 níveis. Marca `isViewOnce` quando passa por visualização única.
   */
  public unwrapContainers(messageContent: any): any {
    let current = messageContent;

    for (let depth = 0; depth < 5 && current; depth++) {
      const viewOnce =
        current.viewOnceMessage?.message ||
        current.viewOnceMessageV2?.message ||
        current.viewOnceMessageV2Extension?.message;

      if (viewOnce) {
        this.message.isViewOnce = true;
        current = viewOnce;
        continue;
      }

      const inner =
        current.ephemeralMessage?.message ||
        current.documentWithCaptionMessage?.message;

      if (!inner) break;

      current = inner;
    }

    return current;
  }

  public async convertContentMessage(messageContent: any): Promise<void> {
    if (!messageContent) {
      this.message = EmptyMessage.fromJSON({ ...this.message, type: MessageType.Empty });
      return;
    }

    // Contêineres (temporária, visualização única, documento com legenda)
    messageContent = this.unwrapContainers(messageContent);

    // Edited message unwrap
    if (messageContent?.editedMessage) {
      this.message.id =
        messageContent?.editedMessage?.message?.protocolMessage?.key?.id || '';
      this.message.isEdited = true;

      messageContent = this.unwrapContainers(
        messageContent?.editedMessage?.message?.protocolMessage?.editedMessage,
      );
    }

    if (!messageContent) {
      this.message = EmptyMessage.fromJSON({ ...this.message, type: MessageType.Empty });
      return;
    }

    const contentType = Object.keys(messageContent).find((key) => {
      const val = messageContent[key];
      return val !== null && val !== undefined && key !== 'messageContextInfo';
    });

    if (!contentType) {
      this.message = EmptyMessage.fromJSON({ ...this.message, type: MessageType.Empty });
      return;
    }

    if (contentType === 'conversation') {
      this.convertConversationMessage(messageContent.conversation);
    } else if (contentType === 'extendedTextMessage') {
      this.convertExtendedTextMessage(messageContent.extendedTextMessage);
    } else if (contentType === 'protocolMessage') {
      await this.convertProtocolMessage(messageContent.protocolMessage);
    } else if (
      contentType === 'imageMessage' ||
      contentType === 'videoMessage' ||
      contentType === 'audioMessage' ||
      contentType === 'stickerMessage' ||
      contentType === 'documentMessage' ||
      contentType === 'ptvMessage'
    ) {
      await this.convertMediaMessage(messageContent[contentType], contentType);
    } else if (contentType === 'buttonsMessage' || contentType === 'templateMessage') {
      this.convertButtonMessage(messageContent);
    } else if (contentType === 'listMessage') {
      this.convertListMessage(messageContent);
    } else if (contentType === 'interactiveMessage') {
      this.convertInteractiveMessage(messageContent);
    } else if (contentType === 'interactiveResponseMessage') {
      this.convertInteractiveResponseMessage(messageContent[contentType]);
    } else if (contentType === 'locationMessage') {
      this.convertLocationMessage(messageContent.locationMessage);
    } else if (
      contentType === 'contactMessage' ||
      contentType === 'contactsArrayMessage'
    ) {
      this.convertContactMessage(messageContent[contentType]);
    } else if (contentType === 'reactionMessage') {
      this.convertReactionMessage(messageContent.reactionMessage);
    }

    const pollCreationContent = getPollCreationContent(messageContent);
    if (pollCreationContent) {
      await this.convertPollCreationMessage(pollCreationContent);
    }

    if (contentType === 'pollUpdateMessage') {
      await this.convertPollUpdateMessage(messageContent.pollUpdateMessage);
    }

    const content = messageContent[contentType] as any;
    if (content) {
      this.message.text =
        this.message.text ||
        content.text ||
        content.caption ||
        content.buttonText ||
        content.hydratedTemplate?.hydratedContentText ||
        content.displayName ||
        content.contentText ||
        '';

      this.message.selected =
        this.message.selected ||
        content?.singleSelectReply?.selectedRowId ||
        content?.selectedId ||
        content?.selectedButtonId ||
        '';

      if (content.contextInfo) {
        await this.convertContextMessage(content.contextInfo);
      }
    }
  }

  public async convertContextMessage(context: any): Promise<void> {
    if (context.mentionedJid) {
      for (const jid of context.mentionedJid) {
        const mentionId = this.bot && typeof this.bot.resolveId === 'function'
          ? await this.bot.resolveId(jid)
          : normalizeJid(jid);

        if (mentionId && !this.message.mentions.includes(mentionId)) {
          this.message.mentions.push(mentionId);
        }
      }
    }

    if (context.quotedMessage) {
      const remoteJid = context.remoteJid || this.waMessage.key?.remoteJid || '';
      const quotedFromMe =
        !!context.participant &&
        this.bot?.canonicalId?.(context.participant) === this.bot?.id;

      const message = {
        key: {
          remoteJid,
          participant: isGroupJid(normalizeJid(remoteJid)) ? context.participant : undefined,
          fromMe: quotedFromMe,
          id: context.stanzaId,
        },
        message: context.quotedMessage,
      };

      this.message.mention = await new ConvertWAMessage(this.bot, message).get();
    }
  }

  public convertConversationMessage(content: string): void {
    this.message = TextMessage.fromJSON({
      ...this.message,
      type: MessageType.Text,
      text: content,
    });
  }

  public convertExtendedTextMessage(content: any): void {
    this.message = TextMessage.fromJSON({
      ...this.message,
      type: MessageType.Text,
      text: typeof content === 'string' ? content : content?.text || '',
    });
  }

  public async convertProtocolMessage(content: any): Promise<void> {
    if (content?.type === 0) {
      this.waMessage.key = {
        ...this.waMessage.key,
        id: content.key?.id || this.waMessage.key?.id,
      };
      this.message.id = content.key?.id || this.message.id;
      this.message.isDeleted = true;
    } else if (content?.type === 14) {
      await this.convertEditedMessage(content);
    } else {
      this.message = EmptyMessage.fromJSON({
        ...this.message,
        type: MessageType.Empty,
      });
    }
  }

  public convertLocationMessage(content: any): void {
    this.message = LocationMessage.fromJSON({
      ...this.message,
      type: MessageType.Location,
      latitude: content.degreesLatitude,
      longitude: content.degreesLongitude,
    });
  }

  public convertContactMessage(content: any): void {
    const msg = ContactMessage.fromJSON({
      ...this.message,
      type: MessageType.Contact,
      text: content.displayName,
    });

    const getContact = (vcard: string | any): User => {
      const user = new User('');
      if (typeof vcard === 'object') {
        vcard = vcard.vcard;
      }
      const raw = String(vcard || '');
      const fnIdx = raw.indexOf('FN:');
      if (fnIdx !== -1) {
        const afterFn = raw.slice(fnIdx + 3);
        user.name = afterFn.slice(0, afterFn.indexOf('\n')).trim();
      }
      const waidIdx = raw.indexOf('waid=');
      if (waidIdx !== -1) {
        const afterWaid = raw.slice(waidIdx + 5);
        user.id = afterWaid.slice(0, afterWaid.indexOf(':')) + '@s.whatsapp.net';
      }
      return user;
    };

    if (content.contacts && Array.isArray(content.contacts)) {
      msg.contacts = content.contacts.map((vcard: any) => getContact(vcard));
    } else if (content.vcard) {
      msg.contacts = [getContact(content.vcard)];
    }

    this.message = msg;
  }

  public async convertMediaMessage(content: any, contentType: string): Promise<void> {
    content = content || {};

    let msg = MediaMessage.fromJSON({ ...this.message, type: MessageType.Media });
    const file: Media = { stream: this.waMessage };

    if (contentType === 'documentMessage') {
      msg = FileMessage.fromJSON({ ...msg, type: MessageType.File, file });
    } else if (contentType === 'imageMessage') {
      msg = ImageMessage.fromJSON({ ...msg, type: MessageType.Image, file });
    } else if (contentType === 'videoMessage' || contentType === 'ptvMessage') {
      msg = VideoMessage.fromJSON({
        ...msg,
        type: MessageType.Video,
        file,
        isPTV: contentType === 'ptvMessage',
        duration: toMediaNumber(content.seconds),
      });
    } else if (contentType === 'audioMessage') {
      msg = AudioMessage.fromJSON({
        ...msg,
        type: MessageType.Audio,
        file,
        isPTT: !!content.ptt,
        duration: toMediaNumber(content.seconds),
      });
    } else if (contentType === 'stickerMessage') {
      msg = StickerMessage.fromJSON({ ...msg, type: MessageType.Sticker, file });
      try {
        const waSticker = await getWaSticker();
        if (waSticker && this.bot?.downloadStreamMessage) {
          const buffer = await this.bot.downloadStreamMessage(file);
          if (buffer && buffer.length) {
            const data = await waSticker.extractMetadata(buffer);
            if (StickerMessage.isValid(msg) && data) {
              msg.author = data['sticker-pack-publisher'] || '';
              msg.stickerId = data['sticker-pack-id'] || '';
              msg.pack = data['sticker-pack-name'] || '';
            }
          }
        }
      } catch (err) {
        this.bot?.emit('error', err as any);
      }
    }

    msg.isGIF = !!content.gifPlayback;
    msg.name = content.fileName || msg.name;
    msg.mimetype = content.mimetype || msg.mimetype;
    msg.size = toMediaNumber(content.fileLength);
    msg.width = toMediaNumber(content.width);
    msg.height = toMediaNumber(content.height);

    // Visualização única: contêiner viewOnce* ou a flag `viewOnce` da própria mídia.
    const viewOnce = !!this.message.isViewOnce || !!content.viewOnce;
    msg.viewOnce = viewOnce;
    msg.isViewOnce = viewOnce;

    this.message = msg;
  }

  public convertReactionMessage(content: any): void {
    this.message = ReactionMessage.fromJSON(
      createReactionMessageData(this.message, content),
    );
  }

  public async convertEditedMessage(content: any): Promise<void> {
    await this.convertContentMessage(content?.editedMessage);
    this.message.id = content?.key?.id || '';
    this.message.isEdited = true;
  }

  public async convertPollCreationMessage(content: any): Promise<void> {
    const pollId = this.waMessage.key?.id || '';
    const pollCreation = this.bot ? await this.bot.getPollMessage(pollId) : null;

    const pollMessage = PollMessage.fromJSON({
      ...this.message,
      type: MessageType.Poll,
      text: content.name || '',
    });

    if (pollCreation && pollCreation.options && pollCreation.options.length > 0) {
      pollMessage.options = pollCreation.options;
    } else if (content.options && Array.isArray(content.options)) {
      for (const opt of content.options) {
        pollMessage.addOption(opt.optionName || opt.name || '');
      }
    }

    pollMessage.extra.pollCreatorJid = getPollCreatorJid(
      this.waMessage,
      this.bot?.id || '',
    );

    this.message = pollMessage;
  }

  public async convertPollUpdateMessage(content: any): Promise<void> {
    const pollMessageId =
      content?.pollCreationMessageKey?.id || this.waMessage.key?.id || '';
    const pollCreation = this.bot
      ? await this.bot.getPollMessage(pollMessageId)
      : null;

    const pollUpdate = PollUpdateMessage.fromJSON({
      ...this.message,
      type: MessageType.PollUpdate,
      text: pollCreation?.text || '',
    });
    pollUpdate.extra.pollCreationMessageId = pollMessageId;

    const userId = getPollVoterId(this.waMessage, this.bot?.id || '');

    if (pollCreation) {
      const oldVotes: string[] = pollCreation.getUserVotes(userId);
      const voteChange = getPollVoteChange(oldVotes, []);

      if (voteChange) {
        pollUpdate.action =
          voteChange.action === 'add' ? PollAction.Add : PollAction.Remove;
        pollUpdate.text = voteChange.option;
      }
    }

    this.message = pollUpdate;
  }

  public convertButtonMessage(content: any): void {
    let buttonMessage: any = content.buttonsMessage || content.templateMessage;
    const buttonMSG = ButtonMessage.fromJSON({
      ...this.message,
      type: MessageType.Button,
    });

    if (buttonMessage.hydratedTemplate) {
      buttonMessage = buttonMessage.hydratedTemplate;
    }

    buttonMSG.text =
      buttonMessage.contentText || buttonMessage.hydratedContentText || '';
    buttonMSG.footer =
      buttonMessage.footerText || buttonMessage.hydratedFooterText || '';

    if (buttonMessage.buttons) {
      buttonMessage.buttons.forEach((button: any) => {
        buttonMSG.addReply(
          button?.buttonText?.displayText || '',
          button?.buttonId || String(Date.now()),
        );
      });
    }

    if (buttonMessage.hydratedButtons) {
      buttonMessage.hydratedButtons.forEach((button: any) => {
        if (button.callButton) {
          buttonMSG.addCall(
            button.callButton.displayText || '',
            button.callButton.phoneNumber || buttonMSG.buttons.length,
          );
        }
        if (button.urlButton) {
          buttonMSG.addUrl(
            button.urlButton.displayText || '',
            button.urlButton.url || '',
          );
        }
        if (button.quickReplyButton) {
          buttonMSG.addReply(
            button.quickReplyButton.displayText || '',
            button.quickReplyButton.id,
          );
        }
      });
    }

    this.message = buttonMSG;
  }

  public convertListMessage(content: any): void {
    const listMessage = content.listMessage;
    if (!listMessage) return;

    const listMSG = ListMessage.fromJSON({
      ...this.message,
      type: MessageType.List,
    });

    listMSG.text = listMessage.description || '';
    listMSG.title = listMessage.title || '';
    listMSG.footer = listMessage.footerText || '';
    listMSG.button = listMessage.buttonText || '';

    const listType = listMessage.listType as number;
    if (listType in ListType) {
      listMSG.listType = listType as ListType;
    } else {
      listMSG.listType = ListType.UNKNOWN;
    }

    listMessage.sections?.forEach((list: any) => {
      const index = listMSG.list.length;
      listMSG.addCategory(list.title || '');

      list.rows?.forEach((item: any) => {
        listMSG.addItem(
          index,
          item.title || '',
          item.description || '',
          item.rowId || '',
        );
      });
    });

    this.message = listMSG;
  }

  public convertInteractiveMessage(content: any): void {
    const interactive = content.interactiveMessage;
    if (!interactive) return;

    this.message.text =
      interactive.body?.text || interactive.header?.title || '';

    if (interactive.nativeFlowMessage?.buttons) {
      const buttons = interactive.nativeFlowMessage.buttons;
      const buttonMSG = ButtonMessage.fromJSON({
        ...this.message,
        type: MessageType.Button,
      });

      for (const btn of buttons) {
        if (btn.name === 'quick_reply') {
          try {
            const params = JSON.parse(btn.buttonParamsJson || '{}');
            buttonMSG.addReply(params.display_text || '', params.id || '');
          } catch {}
        }
      }

      if (buttonMSG.buttons.length) {
        this.message = buttonMSG;
      }
    }
  }

  public convertInteractiveResponseMessage(content: any): void {
    this.message.selected = extractInteractiveListSelection(content);
    this.message.text = content?.body?.text || '';
    const listMessageId =
      content?.nativeFlowResponseMessage?.contextInfo?.stanzaId ||
      content?.contextInfo?.stanzaId;
    if (listMessageId) {
      this.message.extra.listMessageId = listMessageId;
    }
  }

  public static convertMessageStatus(status?: any): MessageStatus {
    if (status === 'ERROR' || status === 0) return MessageStatus.Error;
    if (status === 'PENDING' || status === 1) return MessageStatus.Sending;
    if (status === 'SERVER_ACK' || status === 2) return MessageStatus.Sended;
    if (status === 'DELIVERY_ACK' || status === 3) return MessageStatus.Received;
    if (status === 'READ' || status === 4) return MessageStatus.Readed;
    if (status === 'PLAYED' || status === 5) return MessageStatus.Played;

    return MessageStatus.Sending;
  }

  public static isMessageUpdate(waMessage: any): boolean {
    return (
      !!waMessage &&
      typeof waMessage === 'object' &&
      !!waMessage?.update &&
      typeof waMessage?.update === 'object' &&
      waMessage?.update?.status !== undefined
    );
  }
}
