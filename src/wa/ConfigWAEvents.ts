import {
  DisconnectReason,
  GroupMetadata,
  MessageUpsertType,
  WACallEvent,
  getContentType,
  normalizeMessageContent,
  proto,
} from 'baileys';
import { Boom } from '@hapi/boom';
import Long from 'long';

import { BotStatus } from '../bot/BotStatus';
import type { GroupUpdateChanges, PresenceStatus } from '../bot/BotEventTypes';
import { getPhoneNumber, isGroupJid, isUserJid, normalizeJid } from './ID';
import Call, { CallStatus } from '../models/Call';

import Chat from '../modules/chat/Chat';
import User from '../modules/user/User';
import ChatType from '../modules/chat/ChatType';
import WhatsAppBot from './WhatsAppBot';
import ConvertWAMessage from './ConvertWAMessage';
import ErrorMessage from '../messages/ErrorMessage';

/** Tipos de protocolo que não representam mensagens para o bot. */
const IGNORED_PROTOCOL_TYPES = new Set<number>([
  proto.Message.ProtocolMessage.Type.EPHEMERAL_SYNC_RESPONSE,
  proto.Message.ProtocolMessage.Type.APP_STATE_SYNC_KEY_SHARE,
  proto.Message.ProtocolMessage.Type.APP_STATE_SYNC_KEY_REQUEST,
  proto.Message.ProtocolMessage.Type.APP_STATE_FATAL_EXCEPTION_NOTIFICATION,
  proto.Message.ProtocolMessage.Type.EPHEMERAL_SETTING,
  proto.Message.ProtocolMessage.Type.HISTORY_SYNC_NOTIFICATION,
  proto.Message.ProtocolMessage.Type.INITIAL_SECURITY_NOTIFICATION_SETTING_SYNC,
]);

const CALL_STATUS: Record<string, CallStatus> = {
  offer: CallStatus.Offer,
  ringing: CallStatus.Ringing,
  reject: CallStatus.Reject,
  accept: CallStatus.Accept,
  timeout: CallStatus.Timeout,
  terminate: CallStatus.Terminate,
};

export default class ConfigWAEvents {
  public wa: WhatsAppBot;

  constructor(wa: WhatsAppBot) {
    this.wa = wa;
  }

  public configureAll() {
    this.configConnectionUpdate();
    this.configLidMapping();
    this.configHistorySet();
    this.configContactsUpsert();
    this.configContactsUpdate();
    this.configChatsDelete();
    this.configGroupsUpsert();
    this.configGroupsUpdate();
    this.configGroupParticipants();
    this.configGroupJoinRequest();
    this.configMessagesUpsert();
    this.configMessagesUpdate();
    this.configPresence();
    this.configBlocklist();
    this.configCall();
  }

  /** Cria um User com os IDs conhecidos (sem acessar o disco). */
  private async toUser(id?: string | null): Promise<User | undefined> {
    const userId = await this.wa.resolveId(id);
    if (!userId) return undefined;

    const stored = await this.wa.getUser(new User(userId));
    if (stored) return stored;

    return User.fromJSON({
      id: userId,
      phoneNumber: getPhoneNumber(userId),
      lid: this.wa.lidMapper.getLID(userId),
    });
  }

  /** Cria um Chat de grupo com o nome em cache, sem acessar a rede. */
  private async toGroupChat(id: string): Promise<Chat> {
    const chatId = normalizeJid(id);
    const stored = await this.wa.getChat(new Chat(chatId));
    if (stored) return stored;

    const metadata = this.wa.groupMetadataCache.get<GroupMetadata>(chatId);

    return Chat.fromJSON({ id: chatId, type: ChatType.Group, name: metadata?.subject });
  }

  public configLidMapping() {
    this.wa.sock.ev.on('lid-mapping.update', (mapping) => {
      try {
        this.wa.registerIdentity(mapping?.lid, mapping?.pn);
      } catch (err) {
        this.wa.emit('error', err);
      }
    });
  }

  public configGroupParticipants() {
    this.wa.sock.ev.on('group-participants.update', async (update) => {
      try {
        const groupId = normalizeJid(update?.id);
        if (!groupId || !isGroupJid(groupId)) return;

        this.wa.registerIdentity(update.author, update.authorPn, true);
        this.wa.registerParticipants(update.participants as any);
        this.wa.applyParticipantsUpdate(groupId, (update.participants || []) as any, update.action);

        if (update.action == 'modify') return;

        const authorId = await this.wa.resolveId(update.authorPn || update.author);

        for (const participant of update.participants || []) {
          try {
            const participantId = await this.wa.resolveId(participant.phoneNumber || participant.id);
            if (!participantId) continue;

            const isSelfAction = !authorId || authorId == participantId;

            const action =
              update.action == 'add'
                ? isSelfAction ? 'join' : 'add'
                : update.action == 'remove'
                  ? isSelfAction ? 'leave' : 'remove'
                  : update.action;

            await this.wa.groupParticipantsUpdate(
              action,
              groupId,
              participantId,
              authorId || participantId,
            );
          } catch (err) {
            this.wa.emit('error', err);
          }
        }
      } catch (err) {
        this.wa.emit('error', err);
      }
    });
  }

  public configGroupJoinRequest() {
    this.wa.sock.ev.on('group.join-request', async (update) => {
      try {
        const groupId = normalizeJid(update?.id);
        if (!groupId || !isGroupJid(groupId)) return;

        this.wa.registerIdentity(update.participant, update.participantPn, true);
        this.wa.registerIdentity(update.author, update.authorPn, true);

        const user = await this.toUser(update.participantPn || update.participant);
        if (!user) return;

        const fromUser = await this.toUser(update.authorPn || update.author);

        this.wa.emit('group-join-request', {
          action: update.action,
          method: update.method || undefined,
          chat: await this.toGroupChat(groupId),
          user,
          fromUser: fromUser && fromUser.id != user.id ? fromUser : undefined,
        });
      } catch (err) {
        this.wa.emit('error', err);
      }
    });
  }

  public async readMessages(
    messages: proto.IWebMessageInfo[],
    type: MessageUpsertType = 'notify',
  ) {
    try {
      for (const message of messages || []) {
        try {
          if (!message?.key) continue;
          if (message.key.remoteJid == 'status@broadcast') continue;

          const normalizedContent = normalizeMessageContent(message.message);
          const incomingContentType = getContentType(normalizedContent);
          const incomingPollUpdate = (normalizedContent as any)?.pollUpdateMessage;
          const isPollUpdate = incomingContentType === 'pollUpdateMessage' || Boolean(incomingPollUpdate);
          if (isPollUpdate) {
            console.info('[Rompot poll] raw vote update received', {
              upsertType: type,
              eventMessageId: message.key.id,
              chatId: message.key.remoteJid,
              contentType: incomingContentType,
              pollCreationMessageId: incomingPollUpdate?.pollCreationMessageKey?.id,
              hasVotePayload: Boolean(incomingPollUpdate?.vote?.encPayload?.length && incomingPollUpdate?.vote?.encIv?.length),
              hasParticipant: Boolean(message.key.participant || message.participant),
              hasAlternateParticipant: Boolean((message.key as any).participantAlt || (message as any).participantAlt),
              fromMe: Boolean(message.key.fromMe),
            });
          }

          if (!message.message) {
            if (
              !(
                message.messageStubType ==
                proto.WebMessageInfo.StubType.CIPHERTEXT
              )
            ) {
              continue; // Not read other null messages
            }

            const msgRetryCount =
              this.wa.config.msgRetryCounterCache?.get<number>(message.key.id!);

            if (msgRetryCount != this.wa.config.maxMsgRetryCount) {
              const time = this.wa.config.retryRequestDelayMs || 1000;

              await new Promise((res) => setTimeout(res, time * 3));

              const newMsgRetryCount =
                this.wa.config.msgRetryCounterCache?.get<number>(
                  message.key.id!,
                );

              if (!this.wa.config.readAllFailedMessages) {
                if (
                  msgRetryCount &&
                  newMsgRetryCount &&
                  msgRetryCount != newMsgRetryCount
                ) {
                  continue; // Not read duplicated failed message
                }
              }
            }
          }

          const protocolType = message.message?.protocolMessage?.type;
          if (protocolType != null && IGNORED_PROTOCOL_TYPES.has(protocolType)) {
            continue; // Not read empty messages
          }

          if (this.wa.messagesCached.includes(message.key.id!)) {
            if (isPollUpdate) {
              console.warn('[Rompot poll] raw vote update skipped as duplicate', {
                eventMessageId: message.key.id,
                pollCreationMessageId: incomingPollUpdate?.pollCreationMessageKey?.id,
              });
            }
            continue;
          }

          this.wa.addMessageCache(message.key.id!);
          this.wa.cacheWAMessage(message as any);

          const msg = await new ConvertWAMessage(this.wa, message as any, type).get();

          let timestamp: number | undefined;

          if (message.messageTimestamp) {
            if (Long.isLong(message.messageTimestamp)) {
              timestamp = message.messageTimestamp.toNumber() * 1000;
            } else {
              timestamp = (message.messageTimestamp as number) * 1000;
            }
          }

          const chat = await this.wa.getChat(new Chat(msg.chat.id));
          const pushName = message.pushName || message.verifiedBizName || undefined;

          await this.wa.updateChat({
            id: msg.chat.id,
            unreadCount: message.key.fromMe ? chat?.unreadCount : (chat?.unreadCount || 0) + 1,
            timestamp,
            name: !isGroupJid(msg.chat.id) && !message.key.fromMe ? pushName : undefined,
          });

          if (isUserJid(msg.user.id)) {
            await this.wa.updateUser({
              id: msg.user.id,
              name: message.key.fromMe ? undefined : pushName,
            });
          }

          if (isPollUpdate) {
            console.info('[Rompot poll] adapter emitted vote event', {
              type: msg.type,
              eventMessageId: msg.id,
              chatId: msg.chat?.id,
              pollCreationMessageId: msg.extra?.pollCreationMessageId,
              action: (msg as any).action,
              selected: msg.selected,
              text: msg.text,
              voterIdPresent: Boolean(msg.user?.id),
            });
          }

          if (msg.fromMe && msg.isUnofficial) {
            await this.wa.updateChat({ id: msg.chat.id, unreadCount: 0 });
          }

          this.wa.emit('message', msg);
        } catch (err) {
          const normalizedContent = normalizeMessageContent(message?.message);
          const failedPollUpdate = (normalizedContent as any)?.pollUpdateMessage;
          if (failedPollUpdate) {
            console.error('[Rompot poll] raw vote update conversion failed', {
              eventMessageId: message?.key?.id,
              pollCreationMessageId: failedPollUpdate.pollCreationMessageKey?.id,
              error: err instanceof Error ? err.message : String(err),
            });
          }
          this.wa.emit(
            'message',
            new ErrorMessage(
              this.wa.canonicalId(message?.key?.remoteJid || ''),
              err && err instanceof Error
                ? err
                : new Error(JSON.stringify(err)),
            ),
          );
        }
      }
    } catch (err) {
      this.wa.emit('error', err);
    }
  }

  public configMessagesUpsert() {
    this.wa.sock.ev.on('messages.upsert', async (m) => {
      try {
        await this.readMessages(m?.messages || [], m.type);
      } catch (err) {
        this.wa.emit('error', err);
      }
    });
  }

  public configMessagesUpdate() {
    this.wa.sock.ev.on('messages.update', async (messages) => {
      try {
        for (const message of messages || []) {
          try {
            if (message.key.remoteJid == 'status@broadcast') continue;

            if (message.update?.message) {
              await this.readMessages([{ key: message.key, ...message.update } as any]);
            }

            if (!message?.update?.status) continue;

            const msg = await new ConvertWAMessage(this.wa, message).get();

            msg.isUpdate = true;

            this.wa.emit('message', msg);
          } catch (err) {
            this.wa.emit(
              'message',
              new ErrorMessage(
                this.wa.canonicalId(message?.key?.remoteJid || ''),
                err && err instanceof Error
                  ? err
                  : new Error(JSON.stringify(err)),
              ),
            );
          }
        }
      } catch (err) {
        this.wa.emit('error', err);
      }
    });
  }

  public configConnectionUpdate() {
    this.wa.sock.ev.on('connection.update', async (update) => {
      try {
        this.wa.connectionListeners = this.wa.connectionListeners.filter(
          (listener) => !listener(update),
        );

        if (update.connection == 'connecting') {
          this.wa.lastConnectionUpdateDate = Date.now();
          this.wa.status = BotStatus.Offline;
          this.wa.emit('connecting', { action: 'connecting' });
        }

        if (update.qr) {
          this.wa.emit('qr', update.qr);
        }

        if (update.connection == 'open') {
          const uptime = Date.now();

          this.wa.lastConnectionUpdateDate = uptime;
          this.wa.status = BotStatus.Online;

          this.wa.id = normalizeJid(this.wa.sock?.user?.id || '');
          this.wa.lid = normalizeJid((this.wa.sock?.user as any)?.lid || '');
          this.wa.phoneNumber = getPhoneNumber(this.wa.id);
          this.wa.name =
            this.wa.sock?.user?.name ||
            this.wa.sock?.user?.notify ||
            this.wa.sock?.user?.verifiedName ||
            '';
          this.wa.profileUrl = this.wa.sock?.user?.imgUrl || '';

          if (this.wa.lid) this.wa.registerIdentity(this.wa.lid, this.wa.id);

          this.wa.readUser(
            { id: this.wa.id },
            {
              notify: this.wa.name || undefined,
              imgUrl: this.wa.profileUrl || undefined,
            },
          );
          this.wa.readChat(
            { id: this.wa.id },
            { subject: this.wa.name || undefined },
          );

          this.wa.emit('open', { isNewLogin: update.isNewLogin || false });

          setTimeout(async () => {
            try {
              if (this.wa.lastConnectionUpdateDate != uptime) return;

              await this.wa.reconnect(true, false);
            } catch (error) {
              this.wa.emit('error', error);
            }
          }, this.wa.config.autoRestartInterval);

          if (this.wa.checkConnectionInterval !== null) {
            clearInterval(this.wa.checkConnectionInterval);
          }

          this.wa.checkConnectionInterval = setInterval(() => {
            if (!this.wa.sock) {
              if (this.wa.checkConnectionInterval) {
                clearInterval(this.wa.checkConnectionInterval);
                this.wa.checkConnectionInterval = null;
              }

              return;
            }

            if (this.wa.sock.ws.isOpen) return;

            this.wa.sock.ev.emit('connection.update', {
              connection: 'close',
              lastDisconnect: {
                date: new Date(),
                error: new Boom('Socket closed', {
                  statusCode: DisconnectReason.connectionClosed,
                }),
              },
            });
          }, 10000);

          this.wa.eventsIsStoped = false;

          // Preenche o cache de grupos e aprende os pares LID ↔ PN de todos os participantes
          const groups = await this.wa.sock.groupFetchAllParticipating();

          for (const metadata of Object.values(groups || {})) {
            this.wa.setGroupMetadata(metadata);
          }
        }

        if (update.connection == 'close') {
          this.wa.lastConnectionUpdateDate = Date.now();
          this.wa.status = BotStatus.Offline;

          const status =
            (update.lastDisconnect?.error as Boom)?.output?.statusCode ||
            update.lastDisconnect?.error ||
            500;

          if (this.wa.checkConnectionInterval !== null) {
            clearInterval(this.wa.checkConnectionInterval);
            this.wa.checkConnectionInterval = null;
          }

          await this.wa.flushRecords();

          if (status === DisconnectReason.loggedOut) {
            this.wa.emit('stop', { isLogout: true });
          } else if (status === 402) {
            this.wa.emit('stop', { isLogout: false });
          } else if (status == DisconnectReason.restartRequired) {
            await this.wa.saveCreds(this.wa.sock.authState.creds);
            await this.wa.reconnect(true, true);
          } else {
            this.wa.emit('close', { reason: status });
          }
        }
      } catch (err) {
        this.wa.emit('error', err);
      }
    });
  }

  public configHistorySet() {
    const ignoreChats: string[] = [];

    this.wa.sock.ev.on('messaging-history.set', async (update) => {
      // Os pares LID ↔ PN e os contatos do histórico sempre ajudam a manter IDs únicos
      for (const mapping of update?.lidPnMappings || []) {
        this.wa.registerIdentity(mapping.lid, mapping.pn);
      }

      for (const contact of update?.contacts || []) {
        this.wa.registerIdentity(contact.id, contact.phoneNumber);
        this.wa.registerIdentity(contact.id, contact.lid);
      }

      if (!this.wa.config.autoSyncHistory) return;

      for (const chat of update.chats || []) {
        try {
          if (!('unreadCount' in chat) || chat.isDefaultSubgroup === true) {
            ignoreChats.push(normalizeJid(chat.id));

            continue;
          }

          const isGroup = isGroupJid(chat.id);

          if (!('pinned' in chat) || isGroup) {
            if (!isGroup) {
              ignoreChats.push(normalizeJid(chat.id));

              continue;
            }

            if (
              !('endOfHistoryTransferType' in chat) &&
              !('isDefaultSubgroup' in chat)
            ) {
              ignoreChats.push(normalizeJid(chat.id));

              continue;
            }
          }

          if ((chat.participant?.length || 0) > 0) {
            if (!chat.participant?.some((p) => this.wa.lidMapper.isSameUser(p.userJid, this.wa.id))) {
              ignoreChats.push(normalizeJid(chat.id));

              continue;
            }
          }

          const autoLoad = isGroup
            ? this.wa.config.autoLoadGroupInfo
            : this.wa.config.autoLoadContactInfo;

          if (autoLoad) {
            await this.wa.readChat({ id: chat.id }, chat);
          }
        } catch (err) {
          this.wa.emit('error', err);
        }
      }

      for (const message of update?.messages || []) {
        try {
          if (!message?.message || message.key.remoteJid == 'status@broadcast')
            continue;
          if (ignoreChats.includes(normalizeJid(message.key.remoteJid || '')))
            continue;

          this.wa.cacheWAMessage(message);

          const msg = await new ConvertWAMessage(this.wa, message).get();

          msg.isOld = true;

          this.wa.emit('message', msg);
        } catch (err) {
          const msg = new ErrorMessage(
            this.wa.canonicalId(message?.key?.remoteJid || ''),
            err && err instanceof Error ? err : new Error(JSON.stringify(err)),
          );

          msg.isOld = true;

          this.wa.emit('message', msg);
        }
      }
    });
  }

  private async handleContacts(updates: Array<Partial<{ id: string; lid?: string; phoneNumber?: string }>>) {
    for (const update of updates || []) {
      try {
        if (!update?.id) continue;

        this.wa.registerIdentity(update.id, update.phoneNumber);
        this.wa.registerIdentity(update.id, update.lid);

        if (!this.wa.config.autoLoadContactInfo) continue;

        if (isGroupJid(update.id)) {
          await this.wa.readChat({ id: update.id }, update as any);
        } else {
          await this.wa.readUser({ id: update.phoneNumber || update.id }, update as any);
        }
      } catch (err) {
        this.wa.emit('error', err);
      }
    }
  }

  public configContactsUpdate() {
    this.wa.sock.ev.on('contacts.update', (updates) => this.handleContacts(updates as any));
  }

  public configContactsUpsert() {
    this.wa.sock.ev.on('contacts.upsert', (updates) => this.handleContacts(updates as any));
  }

  public configGroupsUpsert() {
    this.wa.sock.ev.on('groups.upsert', async (groups) => {
      for (const metadata of groups || []) {
        try {
          this.wa.setGroupMetadata(metadata);

          await this.wa.readChat({ id: metadata.id }, metadata, false);
        } catch (err) {
          this.wa.emit('error', err);
        }
      }
    });
  }

  public configGroupsUpdate() {
    this.wa.sock.ev.on('groups.update', async (updates) => {
      for (const update of updates) {
        try {
          if (!update?.id) continue;

          const groupId = normalizeJid(update.id);
          const cached = this.wa.groupMetadataCache.get<GroupMetadata>(groupId);

          if (cached) {
            this.wa.setGroupMetadata({ ...cached, ...update, participants: cached.participants } as GroupMetadata);
          }

          const changes: GroupUpdateChanges = {};

          if (update.subject !== undefined) changes.name = update.subject;
          if (update.desc !== undefined) changes.description = update.desc;
          if (update.announce !== undefined) changes.announce = !!update.announce;
          if (update.restrict !== undefined) changes.restrict = !!update.restrict;
          if (update.inviteCode !== undefined) changes.inviteCode = update.inviteCode;
          if (update.memberAddMode !== undefined) changes.memberAddMode = !!update.memberAddMode;
          if (update.joinApprovalMode !== undefined) changes.joinApprovalMode = !!update.joinApprovalMode;
          if (update.ephemeralDuration !== undefined) changes.ephemeralDuration = Number(update.ephemeralDuration) || 0;

          const stored = await this.wa.getChat(new Chat(groupId));

          if (this.wa.config.autoLoadGroupInfo || stored) {
            await this.wa.readChat({ id: groupId }, update, stored == null);
          }

          const actions = Object.keys(changes) as (keyof GroupUpdateChanges)[];

          if (actions.length) {
            this.wa.registerIdentity(update.author, update.authorPn, true);

            this.wa.emit('group-update', {
              action: actions[0],
              changes,
              chat: await this.toGroupChat(groupId),
              fromUser: await this.toUser(update.authorPn || update.author),
            });
          }
        } catch (err) {
          this.wa.emit('error', err);
        }
      }
    });
  }

  public configChatsDelete() {
    this.wa.sock.ev.on('chats.delete', async (deletions) => {
      for (const id of deletions) {
        try {
          await this.wa.removeChat(new Chat(id));
        } catch (err) {
          this.wa.emit('error', err);
        }
      }
    });
  }

  public configPresence() {
    this.wa.sock.ev.on('presence.update', async (update) => {
      try {
        const chatId = await this.wa.resolveId(update?.id);
        if (!chatId) return;

        const chat = isGroupJid(chatId)
          ? await this.toGroupChat(chatId)
          : (await this.wa.getChat(new Chat(chatId))) || new Chat(chatId);

        for (const [participant, data] of Object.entries(update.presences || {})) {
          const user = await this.toUser(participant);
          if (!user || user.id == this.wa.id) continue;

          this.wa.emit('presence', {
            chat,
            user,
            status: (data?.lastKnownPresence || 'available') as PresenceStatus,
            lastSeen: data?.lastSeen ? Number(data.lastSeen) * 1000 : undefined,
          });
        }
      } catch (err) {
        this.wa.emit('error', err);
      }
    });
  }

  public configBlocklist() {
    const emitBlocklist = async (action: 'add' | 'remove' | 'set', list: string[]) => {
      const users: string[] = [];

      for (const id of list || []) {
        const resolved = await this.wa.resolveId(id);
        if (resolved) users.push(resolved);
      }

      this.wa.emit('blocklist', { action, users });
    };

    this.wa.sock.ev.on('blocklist.set', ({ blocklist }) => {
      emitBlocklist('set', blocklist).catch((err) => this.wa.emit('error', err));
    });

    this.wa.sock.ev.on('blocklist.update', ({ blocklist, type }) => {
      emitBlocklist(type, blocklist).catch((err) => this.wa.emit('error', err));
    });
  }

  public configCall() {
    this.wa.sock.ev.on('call', async (events: WACallEvent[]) => {
      for (const event of events || []) {
        try {
          this.wa.registerIdentity(event.from, event.callerPn, true);

          const userId = await this.wa.resolveId(event.callerPn || event.from);
          const chatId = event.isGroup && event.groupJid
            ? normalizeJid(event.groupJid)
            : await this.wa.resolveId(event.callerPn || event.chatId || event.from);

          const status = CALL_STATUS[event.status] || CallStatus.Ringing;

          const user = (await this.toUser(userId)) || userId;

          const call = new Call(event.id, chatId || userId, user, status, {
            date: event.date || new Date(),
            isVideo: !!event.isVideo,
            offline: !!event.offline,
            latencyMs: event.latencyMs || 1,
            isGroup: !!event.isGroup,
            extra: { from: event.from, chatId: event.chatId, groupJid: event.groupJid },
          });

          this.wa.emit('call', call);
        } catch (err) {
          this.wa.emit('error', err);
        }
      }
    });
  }
}
