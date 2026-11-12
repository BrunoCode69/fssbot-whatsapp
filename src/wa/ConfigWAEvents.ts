import type { WaClient } from 'zapo-js';
import { proto } from 'zapo-js';
import type {
  WaBlocklistResult,
  WaGroupEvent,
  WaIncomingAddonEvent,
  WaIncomingCallEvent,
  WaIncomingChatstateEvent,
  WaIncomingMessageEvent,
  WaIncomingPresenceEvent,
  WaIncomingProtocolMessageEvent,
  WaIncomingReceiptEvent,
  WaIncomingUnavailableMessageEvent,
  WaPictureEvent,
} from 'zapo-js';

import { BotStatus } from '../bot/BotStatus';
import type { ChatStateValue, GroupUpdateChanges, PresenceStatus } from '../bot/BotEventTypes';
import { getPhoneNumber, isGroupJid, isUserJid, normalizeJid } from './ID';
import Call, { CallStatus } from '../models/Call';
import Chat from '../modules/chat/Chat';
import User from '../modules/user/User';
import ChatType from '../modules/chat/ChatType';
import WhatsAppBot from './WhatsAppBot';
import ConvertWAMessage from './ConvertWAMessage';
import ErrorMessage from '../messages/ErrorMessage';

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

  public configureAll(client?: WaClient): void {
    const zapo = client || this.wa.zapo;
    if (!zapo) return;

    this.configAuth(zapo);
    this.configConnection(zapo);
    this.configMessages(zapo);
    this.configGroup(zapo);
    this.configPresence(zapo);
    this.configCall(zapo);
    this.configBlocklist(zapo);
    this.configReceipts(zapo);
    this.configChatstate(zapo);
    this.configMessageExtras(zapo);
    this.configPicture(zapo);
    this.configExtraEvents(zapo);
    if (this.wa.config?.ignoreStatusBroadcast !== false) this.configIgnoreStatus(zapo);
  }

  /** Momento do stanza (atributo `t`, em segundos) em milissegundos. */
  private stanzaTimestamp(event: { rawNode?: { attrs?: Readonly<Record<string, string>> } }, seconds?: number): number {
    const t = seconds ?? Number(event?.rawNode?.attrs?.t);
    return t && Number.isFinite(t) ? t * 1000 : Date.now();
  }

  private async toChat(id: string): Promise<Chat> {
    return isGroupJid(id) ? this.toGroupChat(id) : (await this.wa.getChat(new Chat(id))) || new Chat(id);
  }

  /**
   * Descarta mensagens de `status@broadcast` antes da descriptografia (o Zapo ainda envia o ack).
   * O filtro em `configMessages` continua como segurança caso o descarte não esteja disponível.
   */
  public configIgnoreStatus(zapo: WaClient): void {
    if (typeof (zapo as any).ignoreKey !== 'function') return;
    try {
      zapo.ignoreKey({ remoteJid: 'status@broadcast', only: ['message'] });
    } catch (err) {
      this.wa.reportError('não foi possível ignorar status@broadcast', err);
    }
  }

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

  private async toGroupChat(id: string): Promise<Chat> {
    const chatId = normalizeJid(id);
    const stored = await this.wa.getChat(new Chat(chatId));
    if (stored) return stored;

    const cached = this.wa.groupMetadataCache.get<any>(chatId);
    return Chat.fromJSON({
      id: chatId,
      type: ChatType.Group,
      name: cached?.subject,
    });
  }

  public configAuth(zapo: WaClient): void {
    zapo.on('auth_qr', ({ qr }) => {
      try {
        this.wa.emit('qr', qr);
      } catch (err) {
        this.wa.emit('error', err as any);
      }
    });

    zapo.on('auth_pairing_code', ({ code }) => {
      try {
        this.wa.emit('code', code);
      } catch (err) {
        this.wa.emit('error', err as any);
      }
    });

    zapo.on('auth_paired', ({ credentials }) => {
      try {
        if (credentials.meJid) {
          this.wa.id = normalizeJid(credentials.meJid);
          this.wa.phoneNumber = getPhoneNumber(this.wa.id);
        }
        if (credentials.meLid) {
          this.wa.lid = normalizeJid(credentials.meLid);
          this.wa.registerIdentity(this.wa.lid, this.wa.id);
        }
        if (credentials.pushName) {
          this.wa.name = credentials.pushName;
        }
      } catch (err) {
        this.wa.emit('error', err as any);
      }
    });
  }

  public configConnection(zapo: WaClient): void {
    zapo.on('connection', async (event) => {
      try {
        if (event.status === 'open') {
          const uptime = Date.now();
          this.wa.lastConnectionUpdateDate = uptime;
          this.wa.status = BotStatus.Online;

          const creds = zapo.getCredentials();
          if (creds?.meJid) {
            this.wa.id = normalizeJid(creds.meJid);
            this.wa.phoneNumber = getPhoneNumber(this.wa.id);
          }
          if (creds?.meLid) {
            this.wa.lid = normalizeJid(creds.meLid);
            this.wa.registerIdentity(this.wa.lid, this.wa.id);
          }
          if (creds?.pushName) {
            this.wa.name = creds.pushName;
          }

          if (this.wa.id) {
            await this.wa.readUser(
              { id: this.wa.id },
              {
                notify: this.wa.name || undefined,
                imgUrl: this.wa.profileUrl || undefined,
              },
            );
            await this.wa.readChat(
              { id: this.wa.id },
              { subject: this.wa.name || undefined },
            );
          }

          this.wa.emit('open', { isNewLogin: event.isNewLogin || false });

          // Carrega e armazena metadados dos grupos participantes em segundo plano
          void zapo.group
            .queryAllGroups()
            .then((groups) => {
              for (const metadata of groups || []) {
                this.wa.setGroupMetadata(metadata as any);
              }
            })
            .catch((err) => this.wa.reportError('falha ao carregar os metadados dos grupos', err));

          return;
        }

        if (event.status === 'close') {
          this.wa.status = BotStatus.Offline;
          this.wa.lastConnectionUpdateDate = Date.now();

          await this.wa.flushRecords();

          if (event.isLogout) {
            this.wa.emit('stop', { isLogout: true, reason: event.reason });
          } else {
            this.wa.emit('close', { reason: event.reason || 'connection_closed' });
          }
        }
      } catch (err) {
        this.wa.emit('error', err as any);
      }
    });
  }

  public configMessages(zapo: WaClient): void {
    zapo.on('message', async (event: WaIncomingMessageEvent) => {
      try {
        if (!event?.key) return;
        if (event.key.remoteJid === 'status@broadcast') return;

        if (event.key.id && this.wa.hasMessageCache(event.key.id)) {
          return;
        }

        if (event.key.id) {
          this.wa.addMessageCache(event.key.id);
          this.wa.cacheWAMessage(event as any);
        }

        // Aprende pares PN ↔ LID alternativos trazidos pelo ZapoJS
        if (event.key.remoteJidAlt) {
          this.wa.registerIdentity(event.key.remoteJid, event.key.remoteJidAlt);
        }
        if (event.key.participantAlt) {
          this.wa.registerIdentity(event.key.participant, event.key.participantAlt);
        }

        const msg = await new ConvertWAMessage(this.wa, event).get();

        const timestamp = event.timestampSeconds
          ? Number(event.timestampSeconds) * 1000
          : Date.now();

        const chat = await this.wa.getChat(new Chat(msg.chat.id));
        const pushName = event.pushName || undefined;

        await this.wa.updateChat({
          id: msg.chat.id,
          unreadCount: event.key.fromMe ? chat?.unreadCount : (chat?.unreadCount || 0) + 1,
          timestamp,
          name: !isGroupJid(msg.chat.id) && !event.key.fromMe ? pushName : undefined,
        });

        if (isUserJid(msg.user.id)) {
          await this.wa.updateUser({
            id: msg.user.id,
            name: event.key.fromMe ? undefined : pushName,
          });
        }

        this.wa.emit('message', msg);
      } catch (err) {
        this.wa.emit(
          'message',
          new ErrorMessage(
            this.wa.canonicalId(event?.key?.remoteJid || ''),
            err instanceof Error ? err : new Error(String(err)),
          ),
        );
      }
    });

    zapo.on('message_addon', async (event: WaIncomingAddonEvent) => {
      try {
        if (!event?.key) return;
        if (event.key.id && this.wa.hasMessageCache(event.key.id)) {
          return;
        }

        if (event.key.id) {
          this.wa.addMessageCache(event.key.id);
        }

        if (event.key.remoteJidAlt) {
          this.wa.registerIdentity(event.key.remoteJid, event.key.remoteJidAlt);
        }
        if (event.key.participantAlt) {
          this.wa.registerIdentity(event.key.participant, event.key.participantAlt);
        }

        const msg = await new ConvertWAMessage(this.wa, event).get();
        this.wa.emit('message', msg);
      } catch (err) {
        this.wa.emit(
          'message',
          new ErrorMessage(
            this.wa.canonicalId(event?.key?.remoteJid || ''),
            err instanceof Error ? err : new Error(String(err)),
          ),
        );
      }
    });
  }

  public configGroup(zapo: WaClient): void {
    zapo.on('group', async (event: WaGroupEvent) => {
      try {
        const groupId = normalizeJid(event.groupJid || event.rawActionNode?.attrs?.jid || '');
        if (!groupId || !isGroupJid(groupId)) return;

        const authorId = await this.wa.resolveId(event.authorJid);
        const action = event.action;

        // Trata membros: add, remove, promote, demote
        if (
          action === 'add' ||
          action === 'remove' ||
          action === 'promote' ||
          action === 'demote'
        ) {
          const participants = event.participants || [];

          for (const p of participants) {
            const rawParticipant = p.phoneJid || p.jid || '';
            const participantId = await this.wa.resolveId(rawParticipant);
            if (!participantId) continue;

            if (p.lidJid && p.phoneJid) {
              this.wa.registerIdentity(p.lidJid, p.phoneJid, true);
            }

            const isSelfAction = !authorId || authorId === participantId;
            const userAction =
              action === 'add'
                ? isSelfAction ? 'join' : 'add'
                : action === 'remove'
                  ? isSelfAction ? 'leave' : 'remove'
                  : action;

            await this.wa.groupParticipantsUpdate(
              userAction,
              groupId,
              participantId,
              authorId || participantId,
            );
          }
          return;
        }

        // Trata atualizações de configuração do grupo
        const changes: GroupUpdateChanges = {};
        if (event.subject !== undefined) changes.name = event.subject;
        if (event.description !== undefined) changes.description = event.description;
        if (action === 'announce') changes.announce = !!event.enabled;
        if (action === 'restrict') changes.restrict = !!event.enabled;
        if (event.code !== undefined) changes.inviteCode = event.code;
        if (action === 'member_add_mode') changes.memberAddMode = event.mode === 'all_member_add';
        if (action === 'membership_approval_mode') changes.joinApprovalMode = !!event.enabled;
        if (event.expirationSeconds !== undefined) changes.ephemeralDuration = Number(event.expirationSeconds) || 0;

        const changeKeys = Object.keys(changes) as (keyof GroupUpdateChanges)[];
        if (changeKeys.length) {
          const chat = await this.toGroupChat(groupId);
          const fromUser = authorId ? await this.toUser(authorId) : undefined;

          await this.wa.updateChat({
            id: groupId,
            name: changes.name || chat.name,
            description: changes.description || chat.description,
          });

          this.wa.emit('group-update', {
            action: changeKeys[0],
            changes,
            chat,
            fromUser,
          });
          return;
        }

        // Trata pedidos de entrada no grupo
        if (
          action === 'created_membership_requests' ||
          action === 'revoked_membership_requests' ||
          action === 'membership_approval_request'
        ) {
          for (const req of event.membershipRequests || []) {
            const userId = await this.wa.resolveId(req.phoneJid || req.jid);
            if (!userId) continue;

            const user = (await this.toUser(userId)) || User.fromJSON({ id: userId });
            const fromUser = authorId ? await this.toUser(authorId) : undefined;

            this.wa.emit('group-join-request', {
              action: action === 'created_membership_requests' ? 'created' : 'revoked',
              method: (req as any).requestMethod,
              chat: await this.toGroupChat(groupId),
              user,
              fromUser: fromUser && fromUser.id !== user.id ? fromUser : undefined,
            });
          }
        }
      } catch (err) {
        this.wa.emit('error', err as any);
      }
    });
  }

  public configPresence(zapo: WaClient): void {
    zapo.on('presence', async (event: WaIncomingPresenceEvent) => {
      try {
        const rawChatId = event.chatJid || event.stanzaId || '';
        const chatId = await this.wa.resolveId(rawChatId);
        if (!chatId) return;

        const chat = isGroupJid(chatId)
          ? await this.toGroupChat(chatId)
          : (await this.wa.getChat(new Chat(chatId))) || new Chat(chatId);

        const rawUser = (event as any).userJid || (event as any).senderJid || rawChatId;
        const user = await this.toUser(rawUser);
        if (!user || user.id === this.wa.id) return;

        const statusStr = (event as any).type || (event as any).status || 'available';
        const presenceStatus: PresenceStatus =
          statusStr === 'unavailable'
            ? 'unavailable'
            : statusStr === 'composing'
              ? 'composing'
              : statusStr === 'recording'
                ? 'recording'
                : statusStr === 'paused'
                  ? 'paused'
                  : 'available';

        this.wa.emit('presence', {
          chat,
          user,
          status: presenceStatus,
          lastSeen: (event as any).lastSeen ? Number((event as any).lastSeen) * 1000 : undefined,
        });
      } catch (err) {
        this.wa.emit('error', err as any);
      }
    });
  }

  public configCall(zapo: WaClient): void {
    zapo.on('call', async (event: WaIncomingCallEvent) => {
      try {
        const callData = (event as any).call || event;
        const fromRaw = callData.callerPnJid || callData.callCreatorJid || callData.senderLidJid || '';
        const userId = await this.wa.resolveId(fromRaw);
        const chatId = callData.groupJid
          ? normalizeJid(callData.groupJid)
          : userId;

        const statusStr = String(callData.type || callData.payloadTag || 'ringing').toLowerCase();
        const status = CALL_STATUS[statusStr] || CallStatus.Ringing;
        const user = (await this.toUser(userId)) || User.fromJSON({ id: userId });

        const call = new Call(
          callData.callId || String(Date.now()),
          chatId || userId,
          user,
          status,
          {
            date: new Date(),
            isVideo: !!callData.isVideo,
            offline: false,
            latencyMs: 1,
            isGroup: Boolean(callData.groupJid),
            extra: {
              from: fromRaw,
              chatId,
              groupJid: callData.groupJid,
              callCreatorJid: callData.callCreatorJid,
            },
          },
        );

        this.wa.emit('call', call);
      } catch (err) {
        this.wa.emit('error', err as any);
      }
    });
  }

  public configBlocklist(zapo: WaClient): void {
    zapo.on('blocklist', async (event: WaBlocklistResult) => {
      try {
        const users: string[] = [];
        for (const jid of event.jids || []) {
          const resolved = await this.wa.resolveId(jid);
          if (resolved) users.push(resolved);
        }
        this.wa.emit('blocklist', { action: 'set', users });
      } catch (err) {
        this.wa.emit('error', err as any);
      }
    });
  }

  /** Confirmações de entrega/leitura → evento `receipt`. */
  public configReceipts(zapo: WaClient): void {
    zapo.on('receipt', async (event: WaIncomingReceiptEvent) => {
      // Evento de alto volume: só resolve IDs se alguém estiver ouvindo
      if (!this.wa.hasListeners('receipt')) return;
      try {
        // Recibos de outro dispositivo da própria conta trazem o chat em `recipient`
        const rawChat = event.fromSelfDevice ? event.recipientJid || event.chatJid : event.chatJid;
        const chatId = await this.wa.resolveId(rawChat || '');
        if (!chatId) return;

        const userId = event.fromSelfDevice
          ? this.wa.id
          : await this.wa.resolveId(event.participantJid || event.chatJid || '');

        this.wa.emit('receipt', {
          chatId,
          userId: userId || chatId,
          messageIds: [...(event.messageIds || (event.stanzaId ? [event.stanzaId] : []))],
          type: event.status,
          timestamp: this.stanzaTimestamp(event),
          fromSelfDevice: !!event.fromSelfDevice,
        });
      } catch (err) {
        this.wa.reportError('falha ao processar recibo', err);
      }
    });
  }

  /** Digitando/gravando → evento `chatstate` (requer `subscribePresence`). */
  public configChatstate(zapo: WaClient): void {
    zapo.on('chatstate', async (event: WaIncomingChatstateEvent) => {
      if (!this.wa.hasListeners('chatstate')) return;
      try {
        const chatId = await this.wa.resolveId(event.chatJid || '');
        if (!chatId) return;

        const user = await this.toUser(event.participantJid || event.chatJid);
        if (!user || user.id === this.wa.id) return;

        // O protocolo só tem `composing`/`paused`; gravação é `composing` com mídia de áudio
        const state: ChatStateValue =
          event.state === 'paused' ? 'paused' : event.media === 'audio' ? 'recording' : 'composing';

        this.wa.emit('chatstate', { chat: await this.toChat(chatId), user, state });
      } catch (err) {
        this.wa.reportError('falha ao processar chatstate', err);
      }
    });
  }

  /** Mensagens sem conteúdo, mensagens de protocolo e cache das mensagens enviadas. */
  public configMessageExtras(zapo: WaClient): void {
    zapo.on('message_unavailable', async (event: WaIncomingUnavailableMessageEvent) => {
      try {
        const key = event?.key;
        this.wa.logger.warn('mensagem recebida sem conteúdo', {
          id: key?.id,
          chat: key?.remoteJid,
          kind: event?.kind,
          resendRequested: !!event?.resendRequested,
        });
        if (!key?.remoteJid || !this.wa.hasListeners('message-unavailable')) return;

        if (key.remoteJidAlt) this.wa.registerIdentity(key.remoteJid, key.remoteJidAlt);
        if (key.participantAlt) this.wa.registerIdentity(key.participant, key.participantAlt);

        const chatId = await this.wa.resolveId(key.remoteJid);
        if (!chatId) return;
        const userId = key.fromMe ? this.wa.id : await this.wa.resolveId(key.participant || key.remoteJid);
        const user = (await this.toUser(userId)) || User.fromJSON({ id: userId });
        if (!key.fromMe && event.pushName) user.name = event.pushName;

        this.wa.emit('message-unavailable', {
          chat: await this.toChat(chatId),
          user,
          id: key.id || '',
          reason: event.kind,
          resendRequested: !!event.resendRequested,
          timestamp: this.stanzaTimestamp(event, event.timestampSeconds),
        });
      } catch (err) {
        this.wa.reportError('falha ao processar mensagem indisponível', err);
      }
    });

    // Apagadas (REVOKE) e editadas (MESSAGE_EDIT) já chegam pelo evento `message`, que o Zapo
    // emite antes deste para o mesmo stanza (ConvertWAMessage marca isDeleted/isEdited).
    // Por isso aqui só repassamos o protocolMessage bruto, sem eventos de revoke/edit duplicados.
    zapo.on('message_protocol', async (event: WaIncomingProtocolMessageEvent) => {
      if (!this.wa.hasListeners('message-protocol')) return;
      try {
        const key = event?.key;
        if (!key?.remoteJid || key.remoteJid === 'status@broadcast') return;

        const chatId = await this.wa.resolveId(key.remoteJid);
        const userId = key.fromMe ? this.wa.id : await this.wa.resolveId(key.participant || key.remoteJid);
        const protocolMessage = event.protocolMessage;
        const type = Number(protocolMessage?.type ?? -1);

        this.wa.emit('message-protocol', {
          chatId,
          userId,
          id: key.id || '',
          targetId: protocolMessage?.key?.id || undefined,
          type,
          typeName: (proto.Message.ProtocolMessage.Type as any)[type] || undefined,
          fromMe: !!key.fromMe,
          protocolMessage,
        });
      } catch (err) {
        this.wa.reportError('falha ao processar protocolMessage', err);
      }
    });

    // Guarda as mensagens enviadas por este cliente para editar/encaminhar depois (original())
    zapo.on('message_send', (event) => {
      try {
        const message: any = event?.message;
        if (!event?.id || !event.to || !message || event.to === 'status@broadcast') return;
        if (message.protocolMessage || message.reactionMessage || message.pollUpdateMessage) return;
        this.wa.cacheWAMessage({ key: { remoteJid: event.to, id: event.id, fromMe: true }, message });
      } catch (err) {
        this.wa.reportError('falha ao guardar mensagem enviada no cache', err);
      }
    });
  }

  /** Foto de perfil de contato/grupo alterada → evento `picture`. */
  public configPicture(zapo: WaClient): void {
    zapo.on('picture', async (event: WaPictureEvent) => {
      if (!this.wa.hasListeners('picture')) return;
      try {
        const id = await this.wa.resolveId(event.targetJid || event.chatJid || '');
        if (!id) return;

        this.wa.emit('picture', {
          id,
          action: event.action,
          authorId: event.authorJid ? await this.wa.resolveId(event.authorJid) : undefined,
          pictureId: event.pictureId,
          timestamp: this.stanzaTimestamp(event, event.timestampSeconds),
          raw: event,
        });
      } catch (err) {
        this.wa.reportError('falha ao processar alteração de foto', err);
      }
    });
  }

  public configExtraEvents(zapo: WaClient): void {
    zapo.on('stream_failure', (event) => {
      this.wa.emit('error', new Error(`WhatsApp stream failure: ${event.failureMessage || event.failureReason || 'unknown'}`));
    });

    zapo.on('stanza_error', (event) => {
      this.wa.emit('error', new Error(`WhatsApp stanza error: ${event.code} - ${event.text || ''}`));
    });

    // Eventos futuros expostos pelo ZapoJS
    zapo.on('mex_notification', (event) => {
      this.wa.emit('mex' as any, event);
    });

    zapo.on('newsletter', (event) => {
      this.wa.emit('newsletter' as any, event);
    });

    zapo.on('own_username', (event) => {
      this.wa.emit('own-username' as any, event);
    });

    zapo.on('privacy', (event) => {
      this.wa.emit('privacy' as any, event);
    });

    zapo.on('offline_resume', (event) => {
      this.wa.emit('offline-resume' as any, event);
    });
  }
}
