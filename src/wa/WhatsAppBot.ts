import makeWASocket, {
  generateWAMessageFromContent,
  makeCacheableSignalKeyStore,
  DEFAULT_CONNECTION_CONFIG,
  MediaDownloadOptions,
  downloadMediaMessage,
  AuthenticationCreds,
  DEFAULT_CACHE_TTLS,
  WAConnectionState,
  DisconnectReason,
  ConnectionState,
  GroupMetadata,
  SocketConfig,
  isJidGroup,
  Browsers,
  Contact,
  proto,
  Chat as BaileysChat,
  jidNormalizedUser, // NOVO - Import para normalizar JIDs
} from 'baileys';
import { sendInteractiveMessage } from 'baileys_helper';

import NodeCache from 'node-cache';
import { Boom } from '@hapi/boom';
import internal from 'stream';
import pino from 'pino';
import Long from 'long';

import { WA_MEDIA_SERVERS } from '../configs/WAConfigs';

import { PollMessage, PollUpdateMessage, ReactionMessage } from '../messages';
import { getImageURL, verifyIsEquals } from '../utils/Generic';
import { getBaileysAuth, MultiFileAuthState } from './Auth';
import Message, { MessageType } from '../messages/Message';
import ConvertToWAMessage from './ConvertToWAMessage';
import makeInMemoryStore from './makeInMemoryStore';
import ConvertWAMessage from './ConvertWAMessage';
import { Media } from '../messages/MediaMessage';
import { UserAction, UserEvent } from '../modules/user';
import ConfigWAEvents from './ConfigWAEvents';
import { fixID, getPhoneNumber } from './ID';
import { BotStatus } from '../bot/BotStatus';
import ChatType from '../modules/chat/ChatType';
import BotEvents from '../bot/BotEvents';
import { WAStatus } from './WAStatus';
import ChatStatus from '../modules/chat/ChatStatus';
import IAuth from '../client/IAuth';
import User from '../modules/user/User';
import Chat from '../modules/chat/Chat';
import IBot from '../bot/IBot';
import Call from '../models/Call';

export type WhatsAppBotConfig = Partial<SocketConfig> & {
  /** Auto carrega o histórico de mensagens ao se conectar */
  autoSyncHistory: boolean;
  /** Lê todas as mensagens falhadas */
  readAllFailedMessages: boolean;
  /** Intervalo em milesgundos para reiniciar conexão */
  autoRestartInterval: number;
  /** Usar servidor experimental para download de mídias */
  useExperimentalServers: boolean;
  /** Auto carrega informações de contatos */
  autoLoadContactInfo: boolean;
  /** Auto carrega informações de contatos */
  autoLoadGroupInfo: boolean;
};

export default class WhatsAppBot extends BotEvents implements IBot {
  //@ts-ignore
  public sock: ReturnType<typeof makeWASocket> = {};
  public config: WhatsAppBotConfig;
  public auth: IAuth = new MultiFileAuthState('./session', undefined, false);

  public messagesCached: string[] = [];
  public store: ReturnType<typeof makeInMemoryStore>;
  public msgRetryCountercache: NodeCache = new NodeCache({
    stdTTL: DEFAULT_CACHE_TTLS.MSG_RETRY, // 1 hour
    useClones: false,
  });

  public saveCreds = (creds: Partial<AuthenticationCreds>) =>
    new Promise<void>((res) => res);
  public connectionListeners: ((
    update: Partial<ConnectionState>,
  ) => boolean)[] = [];

  public DisconnectReason = DisconnectReason;
  public logger: any = pino({ level: 'silent' });

  public id: string = '';
  public status: BotStatus = BotStatus.Offline;
  public phoneNumber: string = '';
  public name: string = '';
  public profileUrl: string = '';
  public lastConnectionUpdateDate: number = Date.now();

  public checkConnectionInterval: NodeJS.Timer | null = null;
  public configEvents: ConfigWAEvents = new ConfigWAEvents(this);

  constructor(config?: Partial<WhatsAppBotConfig>) {
    super();

    const store = makeInMemoryStore({ logger: this.logger });

    this.store = store;

    const waBot = this;

    this.config = {
      ...DEFAULT_CONNECTION_CONFIG,
      //printQRInTerminal: true,
      logger: this.logger,
      qrTimeout: 60000,
      defaultQueryTimeoutMs: 10000,
      retryRequestDelayMs: 500,
      maxMsgRetryCount: 5,
      readAllFailedMessages: false,
      msgRetryCounterCache: this.msgRetryCountercache,
      autoRestartInterval: 1000 * 60 * 30, // 30 minutes (recommended)
      useExperimentalServers: false,
      autoSyncHistory: false,
      autoLoadContactInfo: false,
      autoLoadGroupInfo: false,
      shouldIgnoreJid: () => false,
      async patchMessageBeforeSending(msg) {
        if (
          msg.deviceSentMessage?.message?.listMessage?.listType ==
          proto.Message.ListMessage.ListType.PRODUCT_LIST
        ) {
          msg = JSON.parse(JSON.stringify(msg));

          msg.deviceSentMessage!.message!.listMessage!.listType =
            proto.Message.ListMessage.ListType.SINGLE_SELECT;
        }

        if (
          msg.listMessage?.listType ==
          proto.Message.ListMessage.ListType.PRODUCT_LIST
        ) {
          msg = JSON.parse(JSON.stringify(msg));

          msg.listMessage!.listType =
            proto.Message.ListMessage.ListType.SINGLE_SELECT;
        }

        return msg;
      },
      async getMessage(key) {
        return (
          (await waBot.store.loadMessage(fixID(key.remoteJid!), key.id!))
            ?.message || undefined
        );
      },
      ...config,
    };

    delete this.config.auth;
  }

  // ============================================
  // MÉTODOS AUXILIARES PARA NORMALIZAR JIDs
  // ============================================

  /**
   * Normaliza um JID para o formato correto do Baileys 7.x
   * Usa o jidNormalizedUser oficial do Baileys
   * @param jid - JID a ser normalizado
   * @returns JID normalizado ou undefined se inválido
   */
  private safeNormalizeJid(jid: string | undefined): string | undefined {
    if (!jid || typeof jid !== 'string') return undefined;

    try {
      // Se já tem @, usa jidNormalizedUser
      if (jid.includes('@')) {
        return jidNormalizedUser(jid);
      }

      // Se é só número, adiciona @s.whatsapp.net primeiro
      if (/^\d+$/.test(jid)) {
        return jidNormalizedUser(`${jid}@s.whatsapp.net`);
      }

      return undefined;
    } catch (error) {
      this.logger?.error?.('Error normalizing JID:', jid, error);
      return undefined;
    }
  }

  /**
   * Normaliza um array de JIDs
   */
  private safeNormalizeJids(jids: string[]): string[] {
    return jids
      .map((jid) => this.safeNormalizeJid(jid))
      .filter((jid): jid is string => jid !== undefined);
  }

  // ============================================
  // MÉTODOS DE CONEXÃO
  // ============================================

  public async connect(auth?: string | IAuth): Promise<void> {
    if (!auth || typeof auth == 'string') {
      this.auth = new MultiFileAuthState(`${auth || './session'}`);
    } else {
      this.auth = auth;
    }

    if (!this.auth.botPhoneNumber) {
      await this.internalConnect({ browser: WhatsAppBot.Browser() });
    } else {
      await this.internalConnect({
        browser: ['Chrome (linux)', 'Falcão SSH BOT', '22.5.0'],
      });

      if (!this.sock?.authState?.creds?.registered) {
        await this.sock.waitForConnectionUpdate((update) => !!update.qr);

        const code = await this.sock.requestPairingCode(
          this.auth.botPhoneNumber,
        );

        this.emit('code', code);
      }
    }

    await this.awaitConnectionState('open');
  }

  public async internalConnect(
    additionalOptions: Partial<WhatsAppBot['config']> = {},
  ): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      try {
        const { state, saveCreds } = await getBaileysAuth(this.auth);

        this.saveCreds = saveCreds;

        this.sock = makeWASocket({
          auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(
              state.keys,
              this.config.logger || this.logger,
            ),
          },
          ...additionalOptions,
          ...this.config,
        });

        this.store.bind(this.sock.ev);

        this.configEvents.configureAll();

        resolve();

        await this.awaitConnectionState('open');

        this.sock.ev.on('creds.update', saveCreds);
      } catch (err) {
        this.ev.emit('error', err);
      }
    });
  }

  public async reconnect(
    stopEvents: boolean = false,
    showOpen?: boolean,
  ): Promise<void> {
    if (stopEvents) {
      this.eventsIsStoped = true;

      let state: WAConnectionState =
        this.status == BotStatus.Online ? 'close' : 'connecting';
      let status: number = DisconnectReason.connectionClosed;
      let retryCount: number = 0;

      this.connectionListeners.push((update: Partial<ConnectionState>) => {
        if (!update.connection) return false;

        if (retryCount >= 3) {
          this.eventsIsStoped = false;
          return true;
        }

        if (update.connection != state) {
          if (update.connection == 'close') {
            state = 'connecting';
            status =
              (update.lastDisconnect?.error as Boom)?.output?.statusCode ||
              (update.lastDisconnect?.error as any) ||
              DisconnectReason.connectionClosed;
            retryCount++;
          } else {
            this.eventsIsStoped = false;

            if (state == 'connecting') {
              this.emit('close', { reason: status });
            } else if (state == 'open') {
              this.emit('close', { reason: status });
              this.emit('connecting', {});
            }
          }

          return true;
        }

        if (state == 'close') {
          state = 'connecting';
          status =
            (update.lastDisconnect?.error as Boom)?.output?.statusCode ||
            (update.lastDisconnect?.error as any) ||
            DisconnectReason.connectionClosed;
        } else if (state == 'connecting') {
          state = 'open';
        } else if (state == 'open' && showOpen) {
          this.eventsIsStoped = !showOpen;
          return true;
        }

        return false;
      });
    }

    await this.stop();

    this.emit('reconnecting', {});

    await this.internalConnect();
  }

  public async stop(reason: any = 402): Promise<void> {
    try {
      this.status = BotStatus.Offline;

      this.sock?.end(reason);
    } catch (err) {
      this.emit('error', err);
    }
  }

  public async logout(): Promise<void> {
    await this.sock?.logout();
  }

  public async awaitConnectionState(
    connection: WAConnectionState,
  ): Promise<Partial<ConnectionState>> {
    return new Promise<Partial<ConnectionState>>((res) => {
      this.connectionListeners.push((update: Partial<ConnectionState>) => {
        if (update.connection != connection) return false;

        res(update);

        return true;
      });
    });
  }

  // ============================================
  // MÉTODOS DE LEITURA
  // ============================================

  public async readChat(
    chat: Partial<Chat>,
    metadata?: Partial<GroupMetadata> & Partial<BaileysChat>,
    updateMetadata: boolean = true,
  ) {
    try {
      // Normaliza o chat.id primeiro
      const normalizedId = this.safeNormalizeJid(chat.id);
      if (!normalizedId) return;

      chat.id = normalizedId;
      chat.type = isJidGroup(normalizedId) ? ChatType.Group : ChatType.PV;

      if (chat.type == ChatType.Group) {
        if (updateMetadata) {
          chat.profileUrl =
            (await this.getChatProfileUrl(new Chat(chat.id))) || undefined;

          if (!metadata) {
            try {
              metadata = await this.sock.groupMetadata(chat.id);
            } catch { }
          } else if (!metadata.participants) {
            try {
              metadata = {
                ...metadata,
                ...(await this.sock.groupMetadata(chat.id)),
              };
            } catch { }

            if (metadata.participant) {
              metadata.participants = [
                ...(metadata.participants || []),
                ...metadata.participant.map((p) => {
                  return {
                    id: p.userJid,
                    isSuperAdmin:
                      p.rank == proto.GroupParticipant.Rank.SUPERADMIN,
                    isAdmin: p.rank == proto.GroupParticipant.Rank.ADMIN,
                  } as any;
                }),
              ];
            }
          }
        }

        if (metadata?.participants) {
          chat.users = [];
          chat.admins = [];

          for (const p of metadata.participants) {
            const normalizedParticipantId = this.safeNormalizeJid(p.id);
            if (!normalizedParticipantId) continue;

            chat.users.push(normalizedParticipantId);

            if (p.admin == 'admin' || p.isAdmin) {
              chat.admins.push(normalizedParticipantId);
            } else if (p.isSuperAdmin) {
              chat.leader = normalizedParticipantId;
              chat.admins.push(normalizedParticipantId);
            }
          }
        }

        if (metadata?.subjectOwner) {
          const normalizedOwner = this.safeNormalizeJid(metadata.subjectOwner);
          if (normalizedOwner) {
            chat.leader = normalizedOwner;
          }
        }
      }

      if (metadata?.subject || metadata?.name) {
        chat.name = metadata.subject || metadata.name || undefined;
      }

      if (metadata?.desc || metadata?.description) {
        chat.description = metadata.desc || metadata.description || undefined;
      }

      if (metadata?.unreadCount) {
        chat.unreadCount = metadata.unreadCount || undefined;
      }

      if (metadata?.conversationTimestamp) {
        if (Long.isLong(metadata.conversationTimestamp)) {
          chat.timestamp = metadata.conversationTimestamp.toNumber() * 1000;
        } else {
          chat.timestamp = Number(metadata.conversationTimestamp) * 1000;
        }
      }

      await this.updateChat({ id: chat.id, ...chat });
    } catch { }
  }

  public async readUser(user: Partial<User>, metadata?: Partial<Contact>) {
    try {
      // Normaliza o user.id primeiro
      const normalizedId = this.safeNormalizeJid(user.id);
      if (!normalizedId) return;

      user.id = normalizedId;

      if (metadata?.imgUrl) {
        user.profileUrl = await this.getUserProfileUrl(new User(user.id));
      } else {
        const userData = await this.getUser(new User(user.id || ''));

        if (userData == null || !userData.profileUrl) {
          user.profileUrl = await this.getUserProfileUrl(new User(user.id));
        }
      }

      if (metadata?.notify || metadata?.verifiedName) {
        user.name = metadata?.notify || metadata?.verifiedName;
      }

      if (metadata?.name) {
        user.savedName = metadata.name;
      }

      user.name = user.name || user.savedName;

      await this.updateUser({ id: user.id || '', ...user });
    } catch (err) {
      this.emit('error', err);
    }
  }

  // ============================================
  // MÉTODOS DE POLL
  // ============================================

  public async getPollMessage(
    pollMessageId: string,
  ): Promise<PollMessage | PollUpdateMessage> {
    const pollMessage = await this.auth.get(`polls-${pollMessageId}`);

    if (!pollMessage || !PollMessage.isValid(pollMessage))
      return PollMessage.fromJSON({ id: pollMessageId });

    if (pollMessage.type == MessageType.PollUpdate) {
      return PollUpdateMessage.fromJSON(pollMessage);
    }

    return PollMessage.fromJSON(pollMessage);
  }

  public async savePollMessage(
    pollMessage: PollMessage | PollUpdateMessage,
  ): Promise<void> {
    await this.auth.set(`polls-${pollMessage.id}`, pollMessage.toJSON());
  }

  // ============================================
  // GROUP PARTICIPANTS
  // ============================================

  public async groupParticipantsUpdate(
    action: UserAction,
    chatId: string,
    userId: string,
    fromId: string,
  ) {
    // Normaliza todos os IDs
    const normalizedChatId = this.safeNormalizeJid(chatId);
    const normalizedUserId = this.safeNormalizeJid(userId);
    const normalizedFromId = this.safeNormalizeJid(fromId);

    if (!normalizedChatId || !isJidGroup(normalizedChatId)) return;
    if (!normalizedUserId || !normalizedFromId) return;

    const event: UserEvent =
      action == 'join' ? 'add' : action == 'leave' ? 'remove' : action;

    let chat = await this.getChat(new Chat(normalizedChatId));

    if (!chat) {
      if (!this.config.autoLoadGroupInfo) return;

      chat = Chat.fromJSON({
        id: normalizedChatId,
        phoneNumber: getPhoneNumber(normalizedChatId),
        type: ChatType.Group,
      });
    }

    const fromUser =
      (await this.getUser(new User(normalizedFromId))) ||
      User.fromJSON({ id: normalizedFromId, phoneNumber: getPhoneNumber(normalizedFromId) });
    const user =
      (await this.getUser(new User(normalizedUserId))) ||
      User.fromJSON({ id: normalizedUserId, phoneNumber: getPhoneNumber(normalizedUserId) });

    let users = chat.users || [];
    const admins = chat.admins || [];

    if (event == 'add') users.push(user.id);
    if (event == 'remove') users = users.filter((u) => u != user.id);
    if (event == 'demote')
      chat.admins = admins.filter((admin) => admin != user.id);
    if (event == 'promote') admins.push(user.id);

    chat.users = users;
    chat.admins = admins;

    if (user.id == this.id) {
      if (event == 'remove') await this.removeChat(chat);
      if (event == 'add') await this.updateChat(chat);
    } else {
      await this.updateChat(chat);
    }

    this.ev.emit('user', { action, event, user, fromUser, chat });
  }

  //! ********************************* CHAT *********************************

  public async getChatName(chat: Chat) {
    return (await this.getChat(chat))?.name || '';
  }

  public async setChatName(chat: Chat, name: string) {
    const normalizedId = this.safeNormalizeJid(chat.id);
    if (!normalizedId || !isJidGroup(normalizedId)) return;

    const admins = await this.getChatAdmins(chat);

    if (admins.length && !admins.includes(this.id)) return;

    await this.sock.groupUpdateSubject(normalizedId, name);
  }

  public async getChatDescription(chat: Chat) {
    return (await this.getChat(chat))?.description || '';
  }

  public async setChatDescription(
    chat: Chat,
    description: string,
  ): Promise<any> {
    const normalizedId = this.safeNormalizeJid(chat.id);
    if (!normalizedId || !isJidGroup(normalizedId)) return;

    const admins = await this.getChatAdmins(chat);

    if (admins.length && !admins.includes(this.id)) return;

    await this.sock.groupUpdateDescription(normalizedId, description);
  }

  public async getChatProfile(chat: Chat, lowQuality?: boolean) {
    const uri = await this.getChatProfileUrl(chat, lowQuality);

    return await getImageURL(uri);
  }

  public async getChatProfileUrl(chat: Chat, lowQuality?: boolean) {
    try {
      const normalizedId = this.safeNormalizeJid(chat.id);
      if (!normalizedId) return '';

      return (
        (await this.sock.profilePictureUrl(
          normalizedId,
          lowQuality ? 'preview' : 'image',
        )) || ''
      );
    } catch {
      return '';
    }
  }

  public async setChatProfile(chat: Chat, image: Buffer) {
    const normalizedId = this.safeNormalizeJid(chat.id);
    if (!normalizedId || !isJidGroup(normalizedId)) return;

    const admins = await this.getChatAdmins(chat);

    if (admins.length && !admins.includes(this.id)) return;

    await this.sock.updateProfilePicture(normalizedId, image);
  }

  public async updateChat(chat: { id: string } & Partial<Chat>): Promise<void> {
    const normalizedId = this.safeNormalizeJid(chat.id);
    if (!normalizedId) return;

    chat.id = normalizedId;

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

    newChat.type = isJidGroup(chat.id) ? ChatType.Group : ChatType.PV;
    newChat.phoneNumber = newChat.phoneNumber || getPhoneNumber(chat.id);

    await this.auth.set(`chats-${chat.id}`, newChat.toJSON());

    this.ev.emit('chat', { action: chatData != null ? 'update' : 'add', chat });
  }

  public async removeChat(chat: Chat): Promise<void> {
    const normalizedId = this.safeNormalizeJid(chat.id);
    if (!normalizedId) return;

    await this.auth.remove(`chats-${normalizedId}`);

    this.ev.emit('chat', { action: 'remove', chat });
  }

  public async getChat(chat: Chat): Promise<Chat | null> {
    const normalizedId = this.safeNormalizeJid(chat.id);
    if (!normalizedId) return null;

    const chatData = await this.auth.get(`chats-${normalizedId}`);

    if (!chatData) return null;

    if (!chat.name || !chat.profileUrl) {
      const user = await this.getUser(new User(normalizedId));

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

  public async getChatUsers(chat: Chat): Promise<string[]> {
    return (await this.getChat(chat))?.users || [];
  }

  public async getChatAdmins(chat: Chat): Promise<string[]> {
    const chatReaded = await this.getChat(chat);

    if (!chatReaded) return [];

    if (chatReaded.admins?.length) {
      return chatReaded.admins || [];
    }

    if (chatReaded.type !== ChatType.Group) return [];

    await this.readChat(chat);

    return (await this.getChat(chat))?.admins || [];
  }

  public async getChatLeader(chat: Chat): Promise<string> {
    return (await this.getChat(chat))?.leader || '';
  }

  public async addUserInChat(chat: Chat, user: User) {
    const normalizedChatId = this.safeNormalizeJid(chat.id);
    const normalizedUserId = this.safeNormalizeJid(user.id);

    if (!normalizedChatId || !normalizedUserId) return;
    if (!isJidGroup(normalizedChatId)) return;

    const admins = await this.getChatAdmins(chat);

    if (admins.length && !admins.includes(this.id)) return;

    await this.sock.groupParticipantsUpdate(normalizedChatId, [normalizedUserId], 'add');
  }

  public async removeUserInChat(chat: Chat, user: User) {
    const normalizedChatId = this.safeNormalizeJid(chat.id);
    const normalizedUserId = this.safeNormalizeJid(user.id);

    if (!normalizedChatId || !normalizedUserId) return;
    if (!isJidGroup(normalizedChatId)) return;

    const admins = await this.getChatAdmins(chat);

    if (admins.length && !admins.includes(this.id)) return;

    await this.sock.groupParticipantsUpdate(normalizedChatId, [normalizedUserId], 'remove');
  }

  public async promoteUserInChat(chat: Chat, user: User): Promise<void> {
    const normalizedChatId = this.safeNormalizeJid(chat.id);
    const normalizedUserId = this.safeNormalizeJid(user.id);

    if (!normalizedChatId || !normalizedUserId) return;
    if (!isJidGroup(normalizedChatId)) return;

    const admins = await this.getChatAdmins(chat);

    if (admins.length && !admins.includes(this.id)) return;

    await this.sock.groupParticipantsUpdate(normalizedChatId, [normalizedUserId], 'promote');
  }

  public async demoteUserInChat(chat: Chat, user: User): Promise<void> {
    const normalizedChatId = this.safeNormalizeJid(chat.id);
    const normalizedUserId = this.safeNormalizeJid(user.id);

    if (!normalizedChatId || !normalizedUserId) return;
    if (!isJidGroup(normalizedChatId)) return;

    const admins = await this.getChatAdmins(chat);

    if (admins.length && !admins.includes(this.id)) return;

    await this.sock.groupParticipantsUpdate(normalizedChatId, [normalizedUserId], 'demote');
  }

  public async changeChatStatus(chat: Chat, status: ChatStatus): Promise<void> {
    const normalizedId = this.safeNormalizeJid(chat.id);

    if (!normalizedId) {
      this.logger?.error?.('Invalid chat.id for changeChatStatus:', chat.id);
      return;
    }

    try {
      await this.sock.sendPresenceUpdate(
        WAStatus[status] || 'available',
        normalizedId,
      );
    } catch (error) {
      this.logger?.error?.('Error updating chat status:', error);
    }
  }

  public async createChat(chat: Chat) {
    await this.sock.groupCreate(chat.name || '', [this.id]);
  }

  public async leaveChat(chat: Chat): Promise<void> {
    const normalizedId = this.safeNormalizeJid(chat.id);
    if (!normalizedId || !isJidGroup(normalizedId)) return;

    if ((await this.getChat(chat)) == null) return;

    await this.sock.groupLeave(normalizedId);

    await this.removeChat(chat);
  }

  public async joinChat(code: string): Promise<void> {
    await this.sock.groupAcceptInvite(
      code.replace('https://chat.whatsapp.com/', ''),
    );
  }

  public async getChatInvite(chat: Chat): Promise<string> {
    const normalizedId = this.safeNormalizeJid(chat.id);
    if (!normalizedId || !isJidGroup(normalizedId)) return '';

    const admins = await this.getChatAdmins(chat);

    if (admins.length && !admins.includes(this.id)) return '';

    return (await this.sock.groupInviteCode(normalizedId)) || '';
  }

  public async revokeChatInvite(chat: Chat): Promise<string> {
    const normalizedId = this.safeNormalizeJid(chat.id);
    if (!normalizedId || !isJidGroup(normalizedId)) return '';

    const admins = await this.getChatAdmins(chat);

    if (admins.length && !admins.includes(this.id)) return '';

    return (await this.sock.groupRevokeInvite(normalizedId)) || '';
  }

  public async rejectCall(call: Call): Promise<void> {
    const normalizedChatId = this.safeNormalizeJid(call.chat.id);
    if (!normalizedChatId) return;

    await this.sock.rejectCall(call.id, normalizedChatId);
  }

  //! ********************************* USER *********************************

  public async getUserName(user: User): Promise<string> {
    return (await this.getUser(user))?.name || '';
  }

  public async setUserName(user: User, name: string): Promise<void> {
    if (user.id != this.id) return;

    await this.setBotName(name);
  }

  public async getUserDescription(user: User): Promise<string> {
    const normalizedId = this.safeNormalizeJid(user.id);
    if (!normalizedId) return '';

    return (await this.sock.fetchStatus(normalizedId))?.status || '';
  }

  public async setUserDescription(
    user: User,
    description: string,
  ): Promise<void> {
    if (user.id != this.id) return;

    await this.setBotDescription(description);
  }

  public async getUserProfile(user: User, lowQuality?: boolean) {
    const uri = await this.getUserProfileUrl(user, lowQuality);

    return await getImageURL(uri);
  }

  public async getUserProfileUrl(user: User, lowQuality?: boolean) {
    try {
      const normalizedId = this.safeNormalizeJid(user.id);
      if (!normalizedId) return '';

      return (
        (await this.sock.profilePictureUrl(
          normalizedId,
          lowQuality ? 'preview' : 'image',
        )) || ''
      );
    } catch {
      return '';
    }
  }

  public async setUserProfile(user: User, image: Buffer) {
    if (user.id != this.id) return;

    await this.setBotProfile(image);
  }

  public async getUser(user: User): Promise<User | null> {
    const normalizedId = this.safeNormalizeJid(user.id);
    if (!normalizedId) return null;

    const userData = await this.auth.get(`users-${normalizedId}`);

    if (!userData) return null;

    return User.fromJSON(userData);
  }

  public async getUsers(): Promise<string[]> {
    return (await this.auth.listAll('users-')).map((id) =>
      id.replace('users-', ''),
    );
  }

  public async updateUser(user: { id: string } & Partial<User>): Promise<void> {
    const normalizedId = this.safeNormalizeJid(user.id);
    if (!normalizedId) return;

    user.id = normalizedId;

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

    newUser.phoneNumber = newUser.phoneNumber || getPhoneNumber(user.id);

    await this.auth.set(`users-${user.id}`, newUser.toJSON());
  }

  public async setUsers(users: User[]): Promise<void> {
    await Promise.all(users.map(async (user) => await this.updateUser(user)));
  }

  public async removeUser(user: User): Promise<void> {
    const normalizedId = this.safeNormalizeJid(user.id);
    if (!normalizedId) return;

    await this.auth.remove(`users-${normalizedId}`);
  }

  public async blockUser(user: User) {
    const normalizedId = this.safeNormalizeJid(user.id);
    if (!normalizedId || normalizedId == this.id) return;

    await this.sock.updateBlockStatus(normalizedId, 'block');
  }

  public async unblockUser(user: User) {
    const normalizedId = this.safeNormalizeJid(user.id);
    if (!normalizedId || normalizedId == this.id) return;

    await this.sock.updateBlockStatus(normalizedId, 'unblock');
  }

  //! ******************************** BOT ********************************

  public async getBotName() {
    return await this.getUserName(new User(this.id));
  }

  public async setBotName(name: string) {
    await this.sock.updateProfileName(name);
  }

  public async getBotDescription() {
    return await this.getUserDescription(new User(this.id));
  }

  public async setBotDescription(description: string) {
    await this.sock.updateProfileStatus(description);
  }

  public async getBotProfile(lowQuality?: boolean) {
    return await this.getUserProfile(new User(this.id), lowQuality);
  }

  public async getBotProfileUrl(lowQuality?: boolean) {
    return (await this.getUserProfileUrl(new User(this.id), lowQuality)) || '';
  }

  public async setBotProfile(image: Buffer) {
    await this.sock.updateProfilePicture(this.id, image);
  }

  //! ******************************* MESSAGE *******************************

  public async readMessage(message: Message): Promise<void> {
    const normalizedChatId = this.safeNormalizeJid(message.chat.id);
    const normalizedUserId = this.safeNormalizeJid(message.user.id);

    if (!normalizedChatId || !normalizedUserId) return;

    const key = {
      remoteJid: normalizedChatId,
      id: message.id || '',
      fromMe: message.fromMe || normalizedUserId == this.id,
      participant: isJidGroup(normalizedChatId)
        ? normalizedUserId || this.id || undefined
        : undefined,
      toJSON: () => key,
    };

    const chat = await this.getChat(message.chat);

    if (chat != null) {
      await this.updateChat({
        id: normalizedChatId,
        unreadCount: (chat.unreadCount || 1) - 1,
      });
    }

    return await this.sock.readMessages([key]);
  }

  public async removeMessage(message: Message) {
    const normalizedChatId = this.safeNormalizeJid(message.chat.id);
    const normalizedUserId = this.safeNormalizeJid(message.user.id);

    if (!normalizedChatId || !normalizedUserId) return;

    const key: proto.IMessageKey = {
      remoteJid: normalizedChatId,
      id: message.id,
      fromMe: message.fromMe || normalizedUserId == this.id,
      participant: isJidGroup(normalizedChatId)
        ? normalizedUserId || this.id
        : undefined,
    };

    await this.sock.chatModify(
      {
        deleteForMe: {
          deleteMedia: false,
          key,
          timestamp: Number(message.timestamp || Date.now()),
        },
      },
      normalizedChatId,
    );
  }

  public async deleteMessage(message: Message) {
    const normalizedChatId = this.safeNormalizeJid(message.chat.id);
    const normalizedUserId = this.safeNormalizeJid(message.user.id);

    if (!normalizedChatId || !normalizedUserId) return;

    const key: proto.IMessageKey = {
      remoteJid: normalizedChatId,
      id: message.id,
      fromMe: message.fromMe || normalizedUserId == this.id,
      participant: isJidGroup(normalizedChatId)
        ? normalizedUserId || this.id
        : undefined,
    };

    if (key.participant && key.participant != this.id) {
      const admins = await this.getChatAdmins(message.chat);

      if (admins.length && !admins.includes(this.id)) return;
    }

    await this.sock.sendMessage(normalizedChatId, { delete: key });
  }

  public async addReaction(message: ReactionMessage): Promise<void> {
    await this.send(message);
  }

  public async removeReaction(message: ReactionMessage): Promise<void> {
    await this.send(message);
  }

  public async editMessage(message: Message): Promise<void> {
    await this.send(message);
  }

  /**
 * Envia mensagem interativa usando baileys_helper
 * @param jid - ID do chat (deve estar normalizado)
 * @param content - Conteúdo da mensagem interativa
 */
  public async sendInteractive(jid: string, content: {
    text?: string;
    title?: string;
    footer?: string;
    interactiveButtons: Array<{
      name: string;
      buttonParamsJson: string;
    }>;
  }): Promise<any> {
    const normalizedJid = this.safeNormalizeJid(jid);
    if (!normalizedJid) {
      throw new Error(`Invalid JID: ${jid}`);
    }

    return await sendInteractiveMessage(this.sock, normalizedJid, content);
  }


  public async send(content: Message): Promise<Message> {
    const waMSG = new ConvertToWAMessage(this, content);
    await waMSG.refactory(content);

    // Normaliza o chatId antes de enviar
    const normalizedChatId = this.safeNormalizeJid(waMSG.chatId);

    if (!normalizedChatId) {
      throw new Error(`Invalid chat ID: ${waMSG.chatId}`);
    }

    // Se a mensagem usa baileys_helper
    if (waMSG.waMessage.__useBaileysHelper) {
      delete waMSG.waMessage.__useBaileysHelper;

      // Importa dinamicamente o baileys_helper

      await sendInteractiveMessage(
        this.sock,
        normalizedChatId,
        waMSG.waMessage
      );

      // Retorna a mensagem original
      return content;
    }

    // Lógica normal de envio
    if (waMSG.isRelay) {
      try {
        await this.sock.relayMessage(normalizedChatId, waMSG.waMessage, {
          ...waMSG.options,
        });
      } catch (err) {
        throw err;
      }

      const msgRes = generateWAMessageFromContent(
        normalizedChatId,
        waMSG.waMessage,
        { ...waMSG.options, userJid: this.id },
      );

      return await new ConvertWAMessage(this, msgRes).get();
    }

    const sendedMessage = await this.sock.sendMessage(
      normalizedChatId,
      waMSG.waMessage,
      waMSG.options,
    );

    if (typeof sendedMessage == 'boolean') return content;

    const msgRes =
      (await new ConvertWAMessage(this, sendedMessage!).get()) || content;

    if (PollMessage.isValid(msgRes) && PollMessage.isValid(content)) {
      msgRes.options = content.options;
      msgRes.secretKey =
        sendedMessage?.message?.messageContextInfo?.messageSecret!;

      await this.savePollMessage(msgRes);
    }

    return msgRes;
  }

  public addMessageCache(id: string): void {
    this.messagesCached.push(id);

    setTimeout(() => {
      this.messagesCached = this.messagesCached.filter((msgId) => msgId != id);
    }, 1000 * 60);
  }

  public async downloadStreamMessage(media: Media): Promise<Buffer> {
    if (this.config.useExperimentalServers) {
      return await this.experimentalDownloadMediaMessage(media);
    }

    const stream: any = await downloadMediaMessage(
      media.stream,
      'buffer',
      {},
      {
        logger: this.logger,
        reuploadRequest: (m: proto.IWebMessageInfo) =>
          Promise.resolve(m as any),
      },
    );

    if (stream instanceof internal.Transform) {
      const buffer = await stream.read();
      return buffer || Buffer.from('');
    }

    return stream;
  }

  public async experimentalDownloadMediaMessage(
    media: Media,
    maxRetryCount?: number,
  ): Promise<Buffer> {
    let count = 0;

    while (count < (maxRetryCount || this.config.maxMsgRetryCount || 5)) {
      try {
        const serverIndex = Math.floor(Math.random() * WA_MEDIA_SERVERS.length);

        const stream: any = await downloadMediaMessage(
          media.stream,
          'buffer',
          ({
            options: {
              lookup(hostname, options, cb) {
                cb(null, WA_MEDIA_SERVERS[serverIndex], 4);
              },
            },
          } as any),
          {
            logger: this.logger,
            reuploadRequest: (m: proto.IWebMessageInfo) =>
              Promise.resolve(m as any),
          },
        );

        if (stream instanceof internal.Transform) {
          const buffer = await stream.read();
          return buffer || Buffer.from('');
        }

        return stream;
      } catch (error) {
        this.logger?.warn?.(
          `Failed to download media message. Retry count: ${count}`,
        );
        count++;

        if (count >= (maxRetryCount || this.config.maxMsgRetryCount || 5)) {
          this.emit('error', error);
        }
      }
    }

    throw new Error('Failed to download media message');
  }

  public download(
    message: proto.WebMessageInfo,
    type: 'buffer' | 'stream',
    options: MediaDownloadOptions,
    ctx?: any,
  ): Promise<any> {
    // downloadMediaMessage expects a WAMessage type; cast to any to avoid the WebMessageInfo vs WAMessage type mismatch
    return downloadMediaMessage(message as any, type, options, ctx);
  }

  public async onExists(id: string): Promise<{ exists: boolean; id: string }> {
    const normalizedId = this.safeNormalizeJid(id);
    if (!normalizedId) return { exists: false, id };

    const user = await this.sock.onWhatsApp(normalizedId);

    if (user && user.length > 0)
      return { exists: user[0].exists, id: user[0].jid };

    return { exists: false, id: normalizedId };
  }

  public async updateMediaMessage(
    message: proto.IWebMessageInfo,
  ): Promise<proto.IWebMessageInfo> {
    // Cast to any because Baileys expects a WAMessage type; IWebMessageInfo is compatible at runtime.
    return await this.sock.updateMediaMessage(message as any);
  }

  public async groupAcceptInvite(code: string): Promise<string> {
    return (await this.sock?.groupAcceptInvite(code)) || '';
  }

  public static Browser(
    plataform?: string,
    browser?: string,
    version?: string,
  ): [string, string, string] {
    const browserAppropriated = Browsers.appropriate(browser || 'Rompot');

    return [
      plataform || browserAppropriated[0],
      browser || browserAppropriated[1],
      version || browserAppropriated[2],
    ];
  }
}