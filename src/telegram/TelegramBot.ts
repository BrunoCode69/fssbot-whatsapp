import TelegramBotAPI from 'node-telegram-bot-api';

import IAuth from '../client/IAuth';

import ChatStatus from '../modules/chat/ChatStatus';
import ChatType from '../modules/chat/ChatType';
import Chat from '../modules/chat/Chat';
import User from '../modules/user/User';

import { BotStatus } from '../bot/BotStatus';
import BotEvents from '../bot/BotEvents';
import IBot from '../bot/IBot';

import ReactionMessage from '../messages/ReactionMessage';
import { Media } from '../messages/MediaMessage';
import Message from '../messages/Message';

import TelegramSendingController from './TelegramSendingController';
import TelegramToRompotConverter from './TelegramToRompotConverter';
import { TelegramUtils } from './TelegramUtils';
import TelegramEvents from './TelegramEvents';
import TelegramAuth from './TelegramAuth';

import { verifyIsEquals } from '../utils/Generic';
import {
  type MediaDownloadOptions,
  createMediaTooLargeError,
  getMediaMaxBytes,
  toMediaNumber,
} from '../utils/MediaUtils';
import Call from '../models/Call';

export default class TelegramBot extends BotEvents implements IBot {
  public auth: IAuth;
  public bot: TelegramBotAPI;
  public events: TelegramEvents;
  public options: Partial<TelegramBotAPI.ConstructorOptions>;

  public id: string = '';
  public status: BotStatus = BotStatus.Offline;
  public phoneNumber: string = '';
  public name: string = '';
  public profileUrl: string = '';
  private answeredCallbackQueries = new Set<string>();

  constructor(options?: Partial<TelegramBotAPI.ConstructorOptions>) {
    super();

    this.options = { ...(options || {}) };

    this.auth = new TelegramAuth('', './sessions', false);
    this.bot = new TelegramBotAPI('', this.options);
    this.events = new TelegramEvents(this);

    this.events.configAll();
  }

  public async connect(auth: string | IAuth): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      try {
        this.status = BotStatus.Offline;

        this.emit('connecting', {});

        if (typeof auth == 'string') {
          auth = new TelegramAuth(auth, './sessions');
        }

        this.auth = auth;

        const botToken = await this.auth.get('BOT_TOKEN');

        (this.bot as any).token = botToken;
        (this.bot as any).options = {
          ...(this.bot as any).options,
          ...this.options,
        };

        this.bot.startPolling();

        const botInfo = await this.bot.getMe();

        this.id = `${botInfo.id}`;
        this.status = BotStatus.Online;
        this.name = TelegramUtils.getName(botInfo);
        this.phoneNumber = TelegramUtils.getPhoneNumber(this.id);
        this.profileUrl = await this.getBotProfileUrl();

        resolve();

        this.emit('open', { isNewLogin: false });
      } catch (error) {
        reject(error);
      }
    });
  }

  public async reconnect(alert?: boolean): Promise<void> {
    this.status = BotStatus.Offline;

    try {
      await this.bot.close();
    } catch {}

    this.emit('reconnecting', {});

    await this.connect(this.auth);
  }

  public async stop(reason: any): Promise<void> {
    this.status = BotStatus.Offline;

    try {
      await this.bot.close();
    } catch {}

    this.emit('stop', { isLogout: false });
  }

  public async logout(): Promise<void> {
    this.status = BotStatus.Offline;

    try {
      await this.bot.logOut();
    } catch {}

    this.emit('stop', { isLogout: true });
  }

  public async send(message: Message): Promise<Message> {
    return await new TelegramSendingController(this).send(message);
  }

  public async editMessage(message: Message): Promise<void> {
    await new TelegramSendingController(this).sendEditedMessage(message);
  }

  public async addReaction(message: ReactionMessage): Promise<void> {
    await new TelegramSendingController(this).sendReaction(message);
  }

  public async removeReaction(message: ReactionMessage): Promise<void> {
    await new TelegramSendingController(this).sendReaction(message);
  }

  public async readMessage(message: Message): Promise<void> {
    const chat = await this.getChat(message.chat);
    if (chat && chat.unreadCount) {
      await this.updateChat({ id: chat.id, unreadCount: Math.max(0, chat.unreadCount - 1) });
    }
  }

  public async removeMessage(message: Message): Promise<void> {
    await this.deleteMessage(message);
  }

  public async pinMessage(message: Message, _duration?: number): Promise<void> {
    await this.bot.pinChatMessage(Number(message.chat.id), Number(message.id));
  }

  public async unpinMessage(message: Message): Promise<void> {
    await this.bot.unpinChatMessage(Number(message.chat.id), {
      message_id: Number(message.id),
    } as any);
  }

  public async forwardMessage(chat: Chat, message: Message): Promise<Message> {
    const forwarded = await this.bot.forwardMessage(
      Number(chat.id),
      Number(message.chat.id),
      Number(message.id),
    );
    return await new TelegramToRompotConverter(forwarded).convert();
  }

  public async deleteMessage(message: Message): Promise<void> {
    await this.bot.deleteMessage(Number(message.chat.id), Number(message.id));
  }

  /**
   * Baixa a mídia para a memória.
   * @param options Opcional: `maxBytes` (sem valor = sem limite), `signal` e `timeoutMs`.
   */
  public async downloadStreamMessage(
    media: Media,
    options?: MediaDownloadOptions,
  ): Promise<Buffer> {
    if (
      !media?.stream ||
      typeof media.stream != 'object' ||
      !media.stream.file_id
    ) {
      return Buffer.from('');
    }

    TelegramBot.assertDeclaredMediaSize(media, options);

    const fileUrl = await this.bot.getFileLink(media.stream.file_id);

    return await TelegramUtils.downloadFileFromURL(fileUrl, options);
  }

  /**
   * Baixa a mídia direto para `filePath`, em stream (sem carregar tudo em memória).
   * Aplica `maxBytes` pelo tamanho declarado, pelo Content-Length e pelos bytes contados.
   * Em caso de falha o arquivo parcial é apagado.
   */
  public async downloadMediaToFile(
    media: Media,
    filePath: string,
    options?: MediaDownloadOptions,
  ): Promise<void> {
    if (
      !media?.stream ||
      typeof media.stream != 'object' ||
      !media.stream.file_id
    ) {
      throw new Error('A mensagem não tem um arquivo do Telegram para baixar.');
    }

    TelegramBot.assertDeclaredMediaSize(media, options);

    const fileUrl = await this.bot.getFileLink(media.stream.file_id);

    await TelegramUtils.downloadFileFromURLToFile(fileUrl, filePath, options);
  }

  /** Falha cedo quando o Telegram declara (`file_size`) um tamanho acima de `maxBytes`. */
  private static assertDeclaredMediaSize(
    media: Media,
    options?: MediaDownloadOptions,
  ): void {
    const maxBytes = getMediaMaxBytes(options);
    const size = toMediaNumber(media?.stream?.file_size);

    if (maxBytes && size > maxBytes) {
      throw createMediaTooLargeError(maxBytes, size);
    }
  }

  public async getBotName(): Promise<string> {
    return TelegramUtils.getName(await this.bot.getMe());
  }

  public async setBotName(name: string): Promise<void> {
    await this.setUserName(new User(this.id), name);
  }

  public async getBotDescription(): Promise<string> {
    return await this.getUserDescription(new User(this.id));
  }

  public async setBotDescription(description: string): Promise<void> {
    await this.setUserDescription(new User(this.id), description);
  }

  public async getBotProfile(lowQuality?: boolean): Promise<Buffer> {
    return await this.getUserProfile(new User(this.id));
  }

  public async getBotProfileUrl(lowQuality?: boolean): Promise<string> {
    return await this.getUserProfileUrl(new User(this.id));
  }

  public async setBotProfile(image: Buffer): Promise<void> {
    await this.setUserProfile(new User(this.id), image);
  }

  public async getChat(chat: Chat): Promise<Chat | null> {
    const chatData = await this.auth.get(`chats-${chat.id}`);

    if (!chatData) return null;

    if (!chat.name || !chat.profileUrl) {
      const user = await this.getUser(new User(chat.id));

      if (user != null) {
        return Chat.fromJSON({ ...chat, ...user });
      }
    }

    return Chat.fromJSON(chatData);
  }

  public async getChats(): Promise<string[]> {
    return (await this.auth.listAll('chats-')).map((id) =>
      id.replace('chats-', ''),
    );
  }

  public async setChats(chats: Chat[]): Promise<void> {
    await Promise.all(chats.map(async (chat) => await this.updateChat(chat)));
  }

  public async updateChat(chat: { id: string } & Partial<Chat>): Promise<void> {
    const chatData = await this.getChat(new Chat(chat.id));

    if (chatData != null) {
      chat = Object.keys(chat).reduce(
        (data, key) => {
          if (chat[key] == undefined || chat[key] == null) return data;
          if (verifyIsEquals(chat[key], chatData[key])) return data;

          return { ...data, [key]: chat[key] };
        },
        { id: chat.id },
      );

      if (Object.keys(chat).length < 2) return;
    }

    const newChat = Chat.fromJSON({ ...(chatData || {}), ...chat });

    newChat.type = chat.id.length > 10 ? ChatType.Group : ChatType.PV;
    newChat.phoneNumber =
      newChat.phoneNumber || TelegramUtils.getPhoneNumber(chat.id);

    if (!newChat.profileUrl) {
      try {
        newChat.profileUrl = await this.getChatProfileUrl(newChat);
      } catch {}
    }

    await this.auth.set(`chats-${chat.id}`, newChat.toJSON());

    this.ev.emit('chat', { action: chatData != null ? 'update' : 'add', chat });
  }

  public async removeChat(chat: Chat): Promise<void> {
    await this.auth.remove(`chats-${chat.id}`);

    this.ev.emit('chat', { action: 'remove', chat });
  }

  public async createChat(chat: Chat): Promise<void> {
    //TODO: Create chat
  }

  public async leaveChat(chat: Chat): Promise<void> {
    await this.bot.leaveChat(Number(chat.id));
  }

  public async addUserInChat(chat: Chat, user: User): Promise<void> {
    await this.bot.unbanChatMember(Number(chat.id), Number(user.id));
  }

  public async removeUserInChat(chat: Chat, user: User): Promise<void> {
    await this.bot.banChatMember(Number(chat.id), Number(user.id));
  }

  public async promoteUserInChat(chat: Chat, user: User): Promise<void> {
    await this.bot.promoteChatMember(Number(chat.id), Number(user.id));
  }

  public async demoteUserInChat(chat: Chat, user: User): Promise<void> {
    await this.bot.promoteChatMember(Number(chat.id), Number(user.id), {
      can_change_info: false,
      can_post_messages: false,
      can_edit_messages: false,
      can_delete_messages: false,
      can_invite_users: false,
      can_restrict_members: false,
      can_pin_messages: false,
      can_promote_members: false,
    });
  }

  public async changeChatStatus(chat: Chat, status: ChatStatus): Promise<void> {
    const actionMap: Record<ChatStatus, TelegramBotAPI.ChatAction> = {
      [ChatStatus.Typing]: 'typing',
      [ChatStatus.Recording]: 'record_voice',
      [ChatStatus.Paused]: 'typing',
      [ChatStatus.Online]: 'typing',
      [ChatStatus.Offline]: 'typing',
    };
    const action = actionMap[status] || 'typing';
    try {
      await this.bot.sendChatAction(Number(chat.id), action);
    } catch {}
  }

  public async getChatUsers(chat: Chat): Promise<string[]> {
    return (await this.getChat(chat))?.users || [];
  }

  public async getChatAdmins(chat: Chat): Promise<string[]> {
    const members = await this.bot.getChatAdministrators(Number(chat.id));

    return members.map((member) => TelegramUtils.getId(member.user));
  }

  public async getChatLeader(chat: Chat): Promise<string> {
    const members = await this.bot.getChatAdministrators(Number(chat.id));

    return `${members.find((member) => member.status == 'creator') || ''}`;
  }

  public async getChatName(chat: Chat): Promise<string> {
    const chatData = await this.bot.getChat(Number(chat.id));

    return `${chatData.title || ''}`;
  }

  public async setChatName(chat: Chat, name: string): Promise<void> {
    await this.bot.setChatTitle(Number(chat.id), `${name}`);
  }

  public async getChatDescription(chat: Chat): Promise<string> {
    const chatData = await this.bot.getChat(Number(chat.id));

    return `${chatData.description || chatData.bio || ''}`;
  }

  public async setChatDescription(
    chat: Chat,
    description: string,
  ): Promise<void> {
    await this.bot.setChatDescription(Number(chat.id), `${description || ''}`);
  }

  public async getChatProfile(
    chat: Chat,
    lowQuality?: boolean,
  ): Promise<Buffer> {
    const fileUrl = await this.getChatProfileUrl(chat, lowQuality);

    if (!fileUrl) {
      return Buffer.from('');
    }

    return await TelegramUtils.downloadFileFromURL(fileUrl);
  }

  public async getChatProfileUrl(
    chat: Chat,
    lowQuality?: boolean,
  ): Promise<string> {
    const chatData = await this.bot.getChat(Number(chat.id));

    const fileId = lowQuality
      ? chatData.photo?.small_file_id
      : chatData.photo?.big_file_id;

    if (!fileId) return '';

    return await this.bot.getFileLink(fileId);
  }

  public async setChatProfile(chat: Chat, profile: Buffer): Promise<void> {
    await this.bot.setChatPhoto(Number(chat.id), profile);
  }

  public async joinChat(code: string): Promise<void> {
    //TODO: Join chat
  }

  public async getChatInvite(chat: Chat): Promise<string> {
    return await this.bot.exportChatInviteLink(Number(chat.id));
  }

  public async revokeChatInvite(chat: Chat): Promise<string> {
    const result = await this.bot.revokeChatInviteLink(
      Number(chat.id),
      await this.getChatInvite(chat),
    );

    return result.invite_link;
  }

  public async rejectCall(call: Call): Promise<void> {
    //TODO: Reject call
  }

  public async getUser(user: User): Promise<User | null> {
    const userData = await this.auth.get(`users-${user.id}`);

    if (!userData) return null;

    return User.fromJSON(userData);
  }

  public async getUsers(): Promise<string[]> {
    return (await this.auth.listAll('users-')).map((id) =>
      id.replace('users-', ''),
    );
  }

  public async setUsers(users: User[]): Promise<void> {
    await Promise.all(users.map(async (user) => await this.updateUser(user)));
  }

  public async updateUser(user: { id: string } & Partial<User>): Promise<void> {
    const userData = await this.getUser(new User(user.id));

    if (userData != null) {
      user = Object.keys(user).reduce(
        (data, key) => {
          if (user[key] == undefined || user[key] == null) return data;
          if (verifyIsEquals(user[key], userData[key])) return data;

          return { ...data, [key]: user[key] };
        },
        { id: user.id },
      );

      if (Object.keys(user).length < 2) return;
    }

    const newUser = User.fromJSON({ ...(userData || {}), ...user });

    newUser.phoneNumber =
      newUser.phoneNumber || TelegramUtils.getPhoneNumber(user.id);

    if (!newUser.profileUrl) {
      try {
        newUser.profileUrl = await this.getUserProfileUrl(newUser);
      } catch {}
    }

    await this.auth.set(`users-${user.id}`, newUser.toJSON());
  }

  public async removeUser(user: User): Promise<void> {
    await this.auth.remove(`users-${user.id}`);
  }

  public async unblockUser(user: User): Promise<void> {
    try {
      await this.bot.unbanChatMember(Number(user.id), Number(user.id));
    } catch {}
  }

  public async blockUser(user: User): Promise<void> {
    try {
      await this.bot.banChatMember(Number(user.id), Number(user.id));
    } catch {}
  }

  public async getUserName(user: User): Promise<string> {
    const chat = await this.bot.getChat(Number(user.id));

    return `${chat.title || ''}`;
  }

  public async setUserName(user: User, name: string): Promise<void> {
    await this.bot.setChatTitle(Number(user.id), `${name || ''}`);
  }

  public async getUserDescription(user: User): Promise<string> {
    const chatData = await this.bot.getChat(Number(user.id));

    return `${chatData.description || chatData.bio || ''}`;
  }

  public async setUserDescription(
    user: User,
    description: string,
  ): Promise<void> {
    await this.bot.setChatDescription(Number(user.id), `${description || ''}`);
  }

  public async getUserProfile(
    user: User,
    lowQuality?: boolean,
  ): Promise<Buffer> {
    try {
      const fileUrl = await this.getUserProfileUrl(user, lowQuality);
      if (!fileUrl) {
        return Buffer.from('');
      }
      return await TelegramUtils.downloadFileFromURL(fileUrl);
    } catch {
      return Buffer.from('');
    }
  }

  public async getUserProfileUrl(
    user: User,
    lowQuality?: boolean,
  ): Promise<string> {
    try {
      const profile = await this.bot.getUserProfilePhotos(Number(user.id));
      if (!profile?.photos || profile.photos.length === 0) {
        return '';
      }
      const photoVariants = profile.photos[0];
      if (!photoVariants || photoVariants.length === 0) {
        return '';
      }
      const photo = lowQuality ? photoVariants[0] : photoVariants[photoVariants.length - 1];
      if (!photo?.file_id) {
        return '';
      }
      return (await this.bot.getFileLink(photo.file_id)) || '';
    } catch {
      return '';
    }
  }

  public async setUserProfile(user: User, profile: Buffer): Promise<void> {
    await this.bot.setChatPhoto(Number(user.id), profile);
  }

  public isCallbackQueryAnswered(queryId: string): boolean {
    return this.answeredCallbackQueries.has(queryId);
  }

  public async answerCallbackQuery(
    queryId: string,
    text?: string,
    showAlert: boolean = false,
    url?: string,
  ): Promise<boolean> {
    this.answeredCallbackQueries.add(queryId);
    if (this.answeredCallbackQueries.size > 2000) {
      const oldest = this.answeredCallbackQueries.values().next().value;
      if (oldest) this.answeredCallbackQueries.delete(oldest);
    }
    return await this.bot.answerCallbackQuery(queryId, {
      ...(text !== undefined && text !== '' ? { text } : {}),
      ...(showAlert ? { show_alert: true } : {}),
      ...(url ? { url } : {}),
    });
  }

  public async answerInlineQuery(
    queryId: string,
    results: TelegramBotAPI.InlineQueryResult[],
    options?: TelegramBotAPI.AnswerInlineQueryOptions,
  ): Promise<boolean> {
    return await this.bot.answerInlineQuery(queryId, results, options);
  }

  public async sendInvoice(
    chatId: string | number,
    title: string,
    description: string,
    payload: string,
    providerToken: string,
    currency: string,
    prices: Array<{ label: string; amount: number }>,
    options?: TelegramBotAPI.SendInvoiceOptions,
  ): Promise<Message> {
    const sent = await this.bot.sendInvoice(
      Number(chatId),
      title,
      description,
      payload,
      providerToken,
      currency,
      prices,
      options,
    );
    return await new TelegramToRompotConverter(sent).convert();
  }

  public async answerPreCheckoutQuery(
    queryId: string,
    ok: boolean,
    errorMessage?: string,
  ): Promise<boolean> {
    return await this.bot.answerPreCheckoutQuery(queryId, ok, errorMessage ? { error_message: errorMessage } : undefined);
  }

  public async sendMediaGroup(
    chatId: string | number,
    media: TelegramBotAPI.InputMedia[],
    options?: TelegramBotAPI.SendMediaGroupOptions,
  ): Promise<Message[]> {
    const sent = await this.bot.sendMediaGroup(Number(chatId), media, options);
    return await Promise.all((sent || []).map((item) => new TelegramToRompotConverter(item).convert()));
  }

  public async banUserInChat(chat: Chat, user: User, untilDate?: number): Promise<void> {
    await this.bot.banChatMember(Number(chat.id), Number(user.id), untilDate ? { until_date: untilDate } : undefined);
  }

  public async restrictUserInChat(
    chat: Chat,
    user: User,
    permissions: TelegramBotAPI.ChatPermissions,
    untilDate?: number,
  ): Promise<void> {
    await this.bot.restrictChatMember(Number(chat.id), Number(user.id), {
      permissions,
      ...(untilDate ? { until_date: untilDate } : {}),
    });
  }

  public async approveChatJoinRequests(chat: Chat, users: User[]): Promise<string[]> {
    const approved: string[] = [];
    for (const user of users) {
      await this.bot.approveChatJoinRequest(Number(chat.id), Number(user.id));
      approved.push(String(user.id));
    }
    return approved;
  }

  public async rejectChatJoinRequests(chat: Chat, users: User[]): Promise<string[]> {
    const rejected: string[] = [];
    for (const user of users) {
      await this.bot.declineChatJoinRequest(Number(chat.id), Number(user.id));
      rejected.push(String(user.id));
    }
    return rejected;
  }

  public async createForumTopic(chatId: string | number, name: string, iconColor?: number): Promise<any> {
    return await this.bot.createForumTopic(Number(chatId), name, iconColor ? { icon_color: iconColor as any } : undefined);
  }

  public async closeForumTopic(chatId: string | number, threadId: number): Promise<boolean> {
    return await this.bot.closeForumTopic(Number(chatId), Number(threadId));
  }

  public async reopenForumTopic(chatId: string | number, threadId: number): Promise<boolean> {
    return await this.bot.reopenForumTopic(Number(chatId), Number(threadId));
  }
}
