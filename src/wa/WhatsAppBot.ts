import makeWASocket, {
  generateWAMessageFromContent,
  makeCacheableSignalKeyStore,
  DEFAULT_CONNECTION_CONFIG,
  MediaDownloadOptions,
  downloadMediaMessage,
  fetchLatestWaWebVersion,
  AuthenticationCreds,
  DEFAULT_CACHE_TTLS,
  WAConnectionState,
  DisconnectReason,
  ConnectionState,
  GroupMetadata,
  SocketConfig,
  WAMessage,
  WAVersion,
  Browsers,
  Contact,
  proto,
  Chat as BaileysChat,
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
import {
  extractAndMapLID,
  getPhoneNumber,
  isGroupJid,
  isLidJid,
  isPnJid,
  isUserJid,
  normalizeJid,
} from './ID';
import { LIDMapper, LIDPNPair } from './LIDMapper';
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
  /** Busca a versão mais recente do WhatsApp Web antes de conectar (recomendado) */
  autoFetchLatestVersion: boolean;
  /** Tempo, em segundos, que os metadados de grupo ficam em cache */
  groupMetadataCacheTTL: number;
  /** Tempo, em segundos, que mensagens ficam em cache para reenvio, citação e encaminhamento */
  messageCacheTTL: number;
};

/** Identidade de um usuário no WhatsApp. */
export type WAIdentity = {
  /** ID canônico (PN quando conhecido, senão LID) */
  id: string;
  /** JID baseado no número (`@s.whatsapp.net`), quando conhecido */
  pn?: string;
  /** LID (`@lid`), quando conhecido */
  lid?: string;
  /** Número em dígitos, ou vazio quando oculto */
  phoneNumber: string;
};

/** Pedido de entrada pendente num grupo. */
export type WAJoinRequest = {
  user: User;
  /** Momento do pedido em milissegundos */
  requestedAt?: number;
  /** Origem do pedido */
  method?: string;
};

/** Tempo de fixação aceito pelo WhatsApp: 24 horas, 7 dias ou 30 dias. */
export type WAPinDuration = 86400 | 604800 | 2592000;

/** Tempo de escrita atrasada dos registros de chat/usuário (agrupa várias alterações numa só gravação). */
const RECORD_FLUSH_DELAY_MS = 1500;

export default class WhatsAppBot extends BotEvents implements IBot {
  /** Versão do WhatsApp Web obtida em tempo de execução (compartilhada entre instâncias). */
  private static latestVersion?: { version: WAVersion; fetchedAt: number };

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
  /** Mensagens recentes por ID (reenvio, votos de enquete, citação e encaminhamento) */
  public messageCache: NodeCache;
  /** Metadados de grupo (usado pelo Baileys em `cachedGroupMetadata`) */
  public groupMetadataCache: NodeCache;

  public saveCreds = (creds: Partial<AuthenticationCreds>) =>
    new Promise<void>((res) => res);
  public connectionListeners: ((
    update: Partial<ConnectionState>,
  ) => boolean)[] = [];

  public DisconnectReason = DisconnectReason;
  public logger: any = pino({ level: 'silent' });

  public id: string = '';
  /** LID do próprio bot */
  public lid: string = '';
  public status: BotStatus = BotStatus.Offline;
  public phoneNumber: string = '';
  public name: string = '';
  public profileUrl: string = '';
  public lastConnectionUpdateDate: number = Date.now();

  public checkConnectionInterval: NodeJS.Timer | null = null;
  public configEvents: ConfigWAEvents = new ConfigWAEvents(this);
  public lidMapper: LIDMapper = new LIDMapper();

  /** Cache dos registros `chats-*` e `users-*` (null = não existe no disco) */
  private recordCache = new NodeCache({ stdTTL: 30 * 60, useClones: false, checkperiod: 120 });
  private pendingRecordWrites = new Map<string, NodeJS.Timeout>();
  /** Chaves de registros antigos salvos com LID, carregadas sob demanda para migração */
  private legacyLidRecords?: Set<string>;
  private legacyLidRecordsLoading?: Promise<Set<string>>;
  private userConfig: Partial<WhatsAppBotConfig>;

  constructor(config?: Partial<WhatsAppBotConfig>) {
    super();

    const store = makeInMemoryStore({ logger: this.logger });

    this.store = store;
    this.userConfig = config || {};

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
      autoFetchLatestVersion: true,
      groupMetadataCacheTTL: 5 * 60,
      messageCacheTTL: 30 * 60,
      // Um bot não precisa do histórico completo; os pares LID ↔ PN do sync inicial continuam chegando.
      syncFullHistory: !!config?.autoSyncHistory,
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
        const cached = key.id ? waBot.messageCache.get<WAMessage>(key.id) : undefined;
        if (cached?.message) return cached.message;

        const remoteJid = key.remoteJid || '';

        return (
          (await waBot.store.loadMessage(normalizeJid(remoteJid), key.id!))?.message ||
          (await waBot.store.loadMessage(remoteJid, key.id!))?.message ||
          undefined
        );
      },
      async cachedGroupMetadata(jid) {
        return waBot.groupMetadataCache.get<GroupMetadata>(jid);
      },
      ...config,
    };

    this.messageCache = new NodeCache({
      stdTTL: this.config.messageCacheTTL,
      useClones: false,
      checkperiod: 120,
    });
    this.groupMetadataCache = new NodeCache({
      stdTTL: this.config.groupMetadataCacheTTL,
      useClones: false,
      checkperiod: 60,
    });

    this.lidMapper.onMapping((pair) => this.onIdentityMapping(pair));

    delete this.config.auth;
  }

  // ============================================
  // IDENTIDADE (PN ↔ LID)
  // ============================================

  /**
   * ID canônico de um usuário ou chat, só com dados em memória.
   * Pessoas: PN quando conhecido, senão LID. Grupos/canais: apenas normalizados.
   */
  public canonicalId(id?: string | null): string {
    const normalized = normalizeJid(id || '');
    if (!normalized) return '';
    if (this.lid && normalized === this.lid && this.id) return this.id;

    return this.lidMapper.canonical(normalized);
  }

  /**
   * ID canônico de um usuário ou chat, consultando também o store persistente do Baileys.
   * Aceita número puro, PN, LID, grupo, com ou sem sufixo de dispositivo.
   */
  public async resolveId(id?: string | null): Promise<string> {
    const normalized = normalizeJid(id || '');
    if (!normalized) return '';
    if (this.lid && normalized === this.lid && this.id) return this.id;
    if (!isLidJid(normalized)) return normalized;

    return await this.lidMapper.canonicalAsync(normalized);
  }

  /** Retorna todos os identificadores conhecidos de um usuário. */
  public async getIdentity(id?: string | null): Promise<WAIdentity> {
    const canonical = await this.resolveId(id);
    const pn = isPnJid(canonical) ? canonical : undefined;
    const lid = isLidJid(canonical) ? canonical : pn ? this.lidMapper.getLID(pn) : undefined;

    return { id: canonical, pn, lid, phoneNumber: pn ? getPhoneNumber(pn) : '' };
  }

  /**
   * Busca o LID de um número no WhatsApp (pode consultar a rede).
   */
  public async getUserLID(id: string): Promise<string> {
    const canonical = await this.resolveId(id);
    if (!canonical) return '';
    if (isLidJid(canonical)) return canonical;

    return (await this.lidMapper.resolveLID(canonical)) || '';
  }

  /**
   * Registra os pares PN ↔ LID de uma chave de mensagem.
   * Mantido por compatibilidade.
   */
  public extractAndMapLID(message: any): { id: string; lid?: string } {
    return extractAndMapLID(message, this.lidMapper);
  }

  /** Registra um par PN ↔ LID descoberto fora das mensagens (participantes, contatos, chamadas). */
  public registerIdentity(first?: string | null, second?: string | null, persist: boolean = false): boolean {
    return this.lidMapper.register(first, second, persist);
  }

  /** Chamado quando um par PN ↔ LID novo é aprendido. */
  private onIdentityMapping(pair: LIDPNPair) {
    this.emit('id-mapping', { ...pair, phoneNumber: getPhoneNumber(pair.pn) });

    this.migrateLegacyRecords(pair).catch((err) => this.emit('error', err));
  }

  /**
   * Move registros salvos com LID (`users-<lid>`, `chats-<lid>`) para o ID canônico (PN),
   * para que a mesma pessoa não tenha dois registros.
   */
  private async migrateLegacyRecords({ lid, pn }: LIDPNPair) {
    if (!this.legacyLidRecords) {
      // Uma única leitura do diretório, compartilhada por todas as migrações simultâneas
      this.legacyLidRecordsLoading =
        this.legacyLidRecordsLoading ||
        Promise.all([this.auth.listAll('users-'), this.auth.listAll('chats-')]).then(
          ([users, chats]) => new Set([...users, ...chats].filter((key) => key.endsWith('@lid'))),
        );

      this.legacyLidRecords = await this.legacyLidRecordsLoading;
    }

    if (!this.legacyLidRecords.size) return;

    for (const prefix of ['users', 'chats']) {
      const legacyKey = `${prefix}-${lid}`;
      if (!this.legacyLidRecords.has(legacyKey)) continue;

      this.legacyLidRecords.delete(legacyKey);

      const legacy = await this.getRecord(legacyKey);
      if (!legacy) continue;

      const currentKey = `${prefix}-${pn}`;
      const current = (await this.getRecord(currentKey)) || {};

      const merged = { ...legacy, ...current, id: pn, lid };
      merged.phoneNumber = getPhoneNumber(pn);

      if (prefix == 'chats') merged.type = ChatType.PV;

      this.setRecord(currentKey, merged);
      this.removeRecord(legacyKey);
    }
  }

  // ============================================
  // REGISTROS (chats-* / users-*)
  // ============================================

  private async getRecord(key: string): Promise<any> {
    const cached = this.recordCache.get(key);
    if (cached !== undefined) return cached;

    const value = (await this.auth.get(key)) || null;
    this.recordCache.set(key, value);

    return value;
  }

  private setRecord(key: string, value: any) {
    this.recordCache.set(key, value);
    this.scheduleRecordWrite(key);
  }

  private removeRecord(key: string) {
    this.recordCache.set(key, null);
    this.scheduleRecordWrite(key);
  }

  private scheduleRecordWrite(key: string) {
    if (this.pendingRecordWrites.has(key)) return;

    const timeout = setTimeout(() => {
      this.pendingRecordWrites.delete(key);
      this.writeRecord(key).catch((err) => this.emit('error', err));
    }, RECORD_FLUSH_DELAY_MS);

    this.pendingRecordWrites.set(key, timeout);
  }

  private async writeRecord(key: string) {
    const value = this.recordCache.get(key);

    if (value) {
      await this.auth.set(key, value);
    } else {
      await this.auth.remove(key);
    }
  }

  /** Grava imediatamente todos os registros pendentes. */
  public async flushRecords(): Promise<void> {
    const keys = [...this.pendingRecordWrites.keys()];

    for (const key of keys) {
      clearTimeout(this.pendingRecordWrites.get(key)!);
      this.pendingRecordWrites.delete(key);
    }

    await Promise.all(keys.map((key) => this.writeRecord(key).catch(() => undefined)));
  }

  // ============================================
  // CACHE DE MENSAGENS E GRUPOS
  // ============================================

  /** Guarda uma mensagem recebida ou enviada (reenvio, votos de enquete, citação, encaminhamento). */
  public cacheWAMessage(message?: WAMessage | null) {
    if (!message?.key?.id || !message.message) return;

    this.messageCache.set(message.key.id, message);
  }

  /** Retorna a mensagem original do WhatsApp pelo ID, se ainda estiver em cache. */
  public getCachedWAMessage(id?: string): WAMessage | undefined {
    if (!id) return undefined;

    return this.messageCache.get<WAMessage>(id);
  }

  /** Registra os pares PN ↔ LID presentes nos participantes de um grupo. */
  public registerParticipants(participants?: Array<Partial<Contact>> | null) {
    for (const participant of participants || []) {
      if (!participant?.id) continue;

      this.lidMapper.register(participant.id, participant.phoneNumber, true);
      this.lidMapper.register(participant.id, participant.lid, true);
    }
  }

  /** Atualiza o cache de metadados de um grupo. */
  public setGroupMetadata(metadata?: GroupMetadata | null) {
    if (!metadata?.id) return;

    this.registerParticipants(metadata.participants);

    if (metadata.owner || metadata.ownerPn) this.lidMapper.register(metadata.owner, metadata.ownerPn, true);
    if (metadata.subjectOwner || metadata.subjectOwnerPn) {
      this.lidMapper.register(metadata.subjectOwner, metadata.subjectOwnerPn, true);
    }

    this.groupMetadataCache.set(metadata.id, metadata);
  }

  /**
   * Aplica uma mudança de participantes no cache do grupo, sem nova consulta à rede.
   * Mantém o cache correto para o próximo envio ao grupo.
   */
  public applyParticipantsUpdate(
    groupId: string,
    participants: Array<Partial<Contact> & { admin?: 'admin' | 'superadmin' | null }>,
    action: 'add' | 'remove' | 'promote' | 'demote' | 'modify',
  ) {
    const id = normalizeJid(groupId);
    const cached = this.groupMetadataCache.get<GroupMetadata>(id);
    if (!cached) return;

    if (action == 'modify') {
      this.invalidateGroupMetadata(id);
      return;
    }

    const isSame = (a: Partial<Contact>, b: Partial<Contact>) =>
      [a.id, a.phoneNumber, a.lid].some(
        (x) => !!x && [b.id, b.phoneNumber, b.lid].some((y) => !!y && this.lidMapper.isSameUser(x, y)),
      );

    let list = [...(cached.participants || [])];

    for (const participant of participants || []) {
      if (!participant?.id) continue;

      if (action == 'add') {
        if (!list.some((p) => isSame(p, participant))) {
          list.push({ ...participant, id: participant.id, admin: participant.admin || null } as any);
        }
      } else if (action == 'remove') {
        if (this.lidMapper.isSameUser(participant.phoneNumber || participant.id, this.id)) {
          this.invalidateGroupMetadata(id);
          return;
        }

        list = list.filter((p) => !isSame(p, participant));
      } else {
        list = list.map((p) =>
          isSame(p, participant) ? ({ ...p, admin: action == 'promote' ? 'admin' : null } as any) : p,
        );
      }
    }

    this.groupMetadataCache.set(id, { ...cached, participants: list, size: list.length });
  }

  /** Remove um grupo do cache para que o próximo acesso busque dados atuais. */
  public invalidateGroupMetadata(id: string) {
    this.groupMetadataCache.del(normalizeJid(id) || id);
  }

  /**
   * Metadados de um grupo, usando cache.
   * @param chat - Grupo
   * @param force - Ignora o cache e consulta o WhatsApp
   */
  public async getGroupMetadata(chat: Chat | string, force: boolean = false): Promise<GroupMetadata | null> {
    const id = normalizeJid(typeof chat == 'string' ? chat : chat?.id);
    if (!id || !isGroupJid(id)) return null;

    if (!force) {
      const cached = this.groupMetadataCache.get<GroupMetadata>(id);
      if (cached) return cached;
    }

    try {
      const metadata = await this.sock.groupMetadata(id);
      this.setGroupMetadata(metadata);

      return metadata;
    } catch {
      return null;
    }
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
        await this.sock.waitForConnectionUpdate(async (update) => !!update.qr);

        const code = await this.sock.requestPairingCode(
          this.auth.botPhoneNumber,
        );

        this.emit('code', code);
      }
    }

    await this.awaitConnectionState('open');
  }

  /**
   * Versão do WhatsApp Web usada na conexão.
   * Busca a versão atual (com cache de 6 horas) e usa a versão embutida no Baileys se a busca falhar.
   */
  public async resolveVersion(): Promise<WAVersion | undefined> {
    if (this.userConfig.version || !this.config.autoFetchLatestVersion) return undefined;

    const cached = WhatsAppBot.latestVersion;
    if (cached && Date.now() - cached.fetchedAt < 6 * 60 * 60 * 1000) return cached.version;

    try {
      const result = await Promise.race([
        fetchLatestWaWebVersion(),
        new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 5000)),
      ]);

      if (result && !('error' in result && result.error) && Array.isArray(result.version)) {
        WhatsAppBot.latestVersion = { version: result.version, fetchedAt: Date.now() };

        return result.version;
      }
    } catch (err) {
      this.logger?.warn?.({ err }, 'Failed to fetch latest WhatsApp Web version');
    }

    return undefined;
  }

  public async internalConnect(
    additionalOptions: Partial<WhatsAppBot['config']> = {},
  ): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      try {
        const { state, saveCreds } = await getBaileysAuth(this.auth);
        const version = await this.resolveVersion();

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
          ...(version ? { version } : {}),
        });

        this.lidMapper.attachStore(this.sock.signalRepository?.lidMapping);

        this.sock.ev.on('creds.update', saveCreds);
        this.store.bind(this.sock.ev);

        this.configEvents.configureAll();

        resolve();

        await this.awaitConnectionState('open');
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

      await this.flushRecords();

      this.sock?.end(reason);
    } catch (err) {
      this.emit('error', err);
    }
  }

  public async logout(): Promise<void> {
    await this.flushRecords();
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
      const id = await this.resolveId(chat.id);
      if (!id) return;

      chat.id = id;
      chat.type = isGroupJid(id) ? ChatType.Group : ChatType.PV;

      if (chat.type == ChatType.Group) {
        if (updateMetadata) {
          chat.profileUrl =
            (await this.getChatProfileUrl(new Chat(chat.id))) || undefined;

          if (!metadata) {
            metadata = (await this.getGroupMetadata(chat.id)) || undefined;
          } else if (!metadata.participants) {
            metadata = {
              ...metadata,
              ...((await this.getGroupMetadata(chat.id)) || {}),
            };

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
          this.registerParticipants(metadata.participants);

          chat.users = [];
          chat.admins = [];

          for (const p of metadata.participants) {
            const participantId = await this.resolveId(p.phoneNumber || p.id);
            if (!participantId) continue;

            chat.users.push(participantId);

            if (p.admin == 'admin' || p.isAdmin) {
              chat.admins.push(participantId);
            } else if (p.admin == 'superadmin' || p.isSuperAdmin) {
              chat.leader = participantId;
              chat.admins.push(participantId);
            }
          }
        }

        const owner = metadata?.ownerPn || metadata?.owner || metadata?.subjectOwnerPn || metadata?.subjectOwner;
        if (owner) {
          const ownerId = await this.resolveId(owner);
          if (ownerId) chat.leader = ownerId;
        }
      } else {
        chat.phoneNumber = getPhoneNumber(id) || undefined;
        chat.lid = this.lidMapper.getLID(id) || undefined;
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
      if (metadata?.id) {
        this.lidMapper.register(metadata.id, metadata.phoneNumber, true);
        this.lidMapper.register(metadata.id, metadata.lid, true);
      }

      const id = await this.resolveId(user.id);
      if (!id || !isUserJid(id)) return;

      user.id = id;

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

    console.info('[Rompot poll] storage lookup', {
      pollMessageId,
      found: Boolean(pollMessage),
      type: pollMessage?.type,
      optionCount: pollMessage?.options?.length || 0,
      secretKeyLength: pollMessage?.secretKey?.length || 0,
    });

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
    console.info('[Rompot poll] storage saved', {
      pollMessageId: pollMessage.id,
      type: pollMessage.type,
      optionCount: pollMessage.options?.length || 0,
      secretKeyLength: pollMessage.secretKey?.length || 0,
      voterCount: Object.keys(pollMessage.votes || {}).length,
    });
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
    const normalizedChatId = normalizeJid(chatId);
    const normalizedUserId = await this.resolveId(userId);
    const normalizedFromId = (await this.resolveId(fromId)) || normalizedUserId;

    if (!normalizedChatId || !isGroupJid(normalizedChatId)) return;
    if (!normalizedUserId) return;

    const event: UserEvent =
      action == 'join' ? 'add' : action == 'leave' ? 'remove' : action;

    const metadata = this.groupMetadataCache.get<GroupMetadata>(normalizedChatId);
    let chat = await this.getChat(new Chat(normalizedChatId));

    if (!chat) {
      chat = Chat.fromJSON({ id: normalizedChatId, type: ChatType.Group });
    }

    if (!chat.name && metadata?.subject) chat.name = metadata.subject;

    const toUser = async (id: string) => {
      const stored = await this.getUser(new User(id));
      if (stored) return stored;

      return User.fromJSON({
        id,
        phoneNumber: getPhoneNumber(id),
        lid: this.lidMapper.getLID(id),
      });
    };

    const fromUser = await toUser(normalizedFromId);
    const user = await toUser(normalizedUserId);

    let users = chat.users || [];
    let admins = chat.admins || [];

    if (event == 'add' && !users.includes(user.id)) users.push(user.id);
    if (event == 'remove') {
      users = users.filter((u) => u != user.id);
      admins = admins.filter((admin) => admin != user.id);
    }
    if (event == 'demote') admins = admins.filter((admin) => admin != user.id);
    if (event == 'promote' && !admins.includes(user.id)) admins.push(user.id);

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

  /** Garante que o chat é um grupo e que o bot é administrador. Retorna o JID do grupo. */
  private async requireGroupAdmin(chat: Chat): Promise<string> {
    const id = normalizeJid(chat?.id);
    if (!id || !isGroupJid(id)) return '';

    const admins = await this.getChatAdmins(chat);

    if (admins.length && !admins.includes(this.id)) return '';

    return id;
  }

  public async setChatName(chat: Chat, name: string) {
    const id = await this.requireGroupAdmin(chat);
    if (!id) return;

    await this.sock.groupUpdateSubject(id, name);
  }

  public async getChatDescription(chat: Chat) {
    return (await this.getChat(chat))?.description || '';
  }

  public async setChatDescription(
    chat: Chat,
    description: string,
  ): Promise<any> {
    const id = await this.requireGroupAdmin(chat);
    if (!id) return;

    await this.sock.groupUpdateDescription(id, description);
  }

  public async getChatProfile(chat: Chat, lowQuality?: boolean) {
    const uri = await this.getChatProfileUrl(chat, lowQuality);

    return await getImageURL(uri);
  }

  public async getChatProfileUrl(chat: Chat, lowQuality?: boolean) {
    try {
      const id = await this.resolveId(chat.id);
      if (!id) return '';

      return (
        (await this.sock.profilePictureUrl(
          id,
          lowQuality ? 'preview' : 'image',
        )) || ''
      );
    } catch {
      return '';
    }
  }

  public async setChatProfile(chat: Chat, image: Buffer) {
    const id = await this.requireGroupAdmin(chat);
    if (!id) return;

    await this.sock.updateProfilePicture(id, image);
  }

  public async updateChat(chat: { id: string } & Partial<Chat>): Promise<void> {
    const id = await this.resolveId(chat.id);
    if (!id) return;

    chat.id = id;

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

    newChat.type = isGroupJid(chat.id) ? ChatType.Group : ChatType.PV;

    if (newChat.type == ChatType.PV) {
      newChat.phoneNumber = getPhoneNumber(chat.id) || newChat.phoneNumber;
      newChat.lid = this.lidMapper.getLID(chat.id) || newChat.lid;
    }

    this.setRecord(`chats-${chat.id}`, newChat.toJSON());

    this.ev.emit('chat', { action: chatData != null ? 'update' : 'add', chat });
  }

  public async removeChat(chat: Chat): Promise<void> {
    const id = await this.resolveId(chat.id);
    if (!id) return;

    this.removeRecord(`chats-${id}`);

    if (isGroupJid(id)) this.invalidateGroupMetadata(id);

    this.ev.emit('chat', { action: 'remove', chat });
  }

  public async getChat(chat: Chat): Promise<Chat | null> {
    const id = await this.resolveId(chat.id);
    if (!id) return null;

    const chatData = await this.getRecord(`chats-${id}`);

    if (!chatData) return null;

    const stored = Chat.fromJSON(chatData);

    if (!stored.name || !stored.profileUrl) {
      const user = isUserJid(id) ? await this.getUser(new User(id)) : null;

      if (user != null) {
        stored.name = stored.name || user.name || user.savedName;
        stored.profileUrl = stored.profileUrl || user.profileUrl;
      }
    }

    return stored;
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

    if (!chatReaded) {
      if (!isGroupJid(normalizeJid(chat?.id))) return [];

      await this.readChat(chat);

      return (await this.getChat(chat))?.admins || [];
    }

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

  private async participantsAction(chat: Chat, user: User, action: 'add' | 'remove' | 'promote' | 'demote') {
    const chatId = await this.requireGroupAdmin(chat);
    const userId = await this.resolveId(user.id);

    if (!chatId || !userId) return;

    await this.sock.groupParticipantsUpdate(chatId, [userId], action);

    this.invalidateGroupMetadata(chatId);
  }

  public async addUserInChat(chat: Chat, user: User) {
    await this.participantsAction(chat, user, 'add');
  }

  public async removeUserInChat(chat: Chat, user: User) {
    await this.participantsAction(chat, user, 'remove');
  }

  public async promoteUserInChat(chat: Chat, user: User): Promise<void> {
    await this.participantsAction(chat, user, 'promote');
  }

  public async demoteUserInChat(chat: Chat, user: User): Promise<void> {
    await this.participantsAction(chat, user, 'demote');
  }

  public async changeChatStatus(chat: Chat, status: ChatStatus): Promise<void> {
    const id = await this.resolveId(chat.id);

    if (!id) {
      this.logger?.error?.('Invalid chat.id for changeChatStatus:', chat.id);
      return;
    }

    try {
      await this.sock.sendPresenceUpdate(
        WAStatus[status] || 'available',
        id,
      );
    } catch (error) {
      this.logger?.error?.('Error updating chat status:', error);
    }
  }

  public async createChat(chat: Chat) {
    await this.sock.groupCreate(chat.name || '', [this.id]);
  }

  public async leaveChat(chat: Chat): Promise<void> {
    const id = normalizeJid(chat.id);
    if (!id || !isGroupJid(id)) return;

    if ((await this.getChat(chat)) == null) return;

    await this.sock.groupLeave(id);

    await this.removeChat(chat);
  }

  public async joinChat(code: string): Promise<void> {
    await this.sock.groupAcceptInvite(
      code.replace('https://chat.whatsapp.com/', ''),
    );
  }

  public async getChatInvite(chat: Chat): Promise<string> {
    const id = await this.requireGroupAdmin(chat);
    if (!id) return '';

    return (await this.sock.groupInviteCode(id)) || '';
  }

  public async revokeChatInvite(chat: Chat): Promise<string> {
    const id = await this.requireGroupAdmin(chat);
    if (!id) return '';

    return (await this.sock.groupRevokeInvite(id)) || '';
  }

  /**
   * Define se só administradores podem enviar mensagens no grupo.
   * @param enabled - `true` fecha o grupo para membros comuns
   */
  public async setChatAnnounce(chat: Chat, enabled: boolean): Promise<void> {
    const id = await this.requireGroupAdmin(chat);
    if (!id) return;

    await this.sock.groupSettingUpdate(id, enabled ? 'announcement' : 'not_announcement');
  }

  /**
   * Define se só administradores podem editar nome, descrição e foto do grupo.
   */
  public async setChatLocked(chat: Chat, enabled: boolean): Promise<void> {
    const id = await this.requireGroupAdmin(chat);
    if (!id) return;

    await this.sock.groupSettingUpdate(id, enabled ? 'locked' : 'unlocked');
  }

  /**
   * Ativa ou desativa mensagens temporárias.
   * @param seconds - 0 desativa; valores comuns: 86400 (24 h), 604800 (7 dias), 7776000 (90 dias)
   */
  public async setChatEphemeral(chat: Chat, seconds: number): Promise<void> {
    const id = await this.resolveId(chat.id);
    if (!id) return;

    if (isGroupJid(id)) {
      const groupId = await this.requireGroupAdmin(chat);
      if (!groupId) return;

      await this.sock.groupToggleEphemeral(groupId, seconds);
    } else {
      await this.sock.sendMessage(id, { disappearingMessagesInChat: seconds || false });
    }
  }

  /**
   * Define se qualquer membro pode adicionar participantes.
   */
  public async setChatMemberAddMode(chat: Chat, allMembers: boolean): Promise<void> {
    const id = await this.requireGroupAdmin(chat);
    if (!id) return;

    await this.sock.groupMemberAddMode(id, allMembers ? 'all_member_add' : 'admin_add');
  }

  /**
   * Define se a entrada no grupo exige aprovação de um administrador.
   */
  public async setChatJoinApproval(chat: Chat, enabled: boolean): Promise<void> {
    const id = await this.requireGroupAdmin(chat);
    if (!id) return;

    await this.sock.groupJoinApprovalMode(id, enabled ? 'on' : 'off');
  }

  /** Lista os pedidos de entrada pendentes num grupo. */
  public async getChatJoinRequests(chat: Chat): Promise<WAJoinRequest[]> {
    const id = await this.requireGroupAdmin(chat);
    if (!id) return [];

    const requests = (await this.sock.groupRequestParticipantsList(id)) || [];
    const result: WAJoinRequest[] = [];

    for (const request of requests) {
      const raw = request.jid || request.lid || request.phone_number || '';
      if (!raw) continue;

      this.lidMapper.register(request.jid, request.phone_number, true);
      this.lidMapper.register(request.lid, request.phone_number || request.jid, true);

      const userId = await this.resolveId(request.phone_number || raw);
      const stored = await this.getUser(new User(userId));
      const user = stored || User.fromJSON({ id: userId, phoneNumber: getPhoneNumber(userId) });

      user.lid = user.lid || this.lidMapper.getLID(userId);

      const requestedAt = Number(request.request_time || request.t || 0) * 1000 || undefined;

      result.push({ user, requestedAt, method: request.request_method || undefined });
    }

    return result;
  }

  /**
   * Aprova ou recusa pedidos de entrada.
   * @returns IDs processados com sucesso
   */
  public async updateChatJoinRequests(
    chat: Chat,
    users: User[],
    action: 'approve' | 'reject',
  ): Promise<string[]> {
    const id = await this.requireGroupAdmin(chat);
    if (!id) return [];

    const targets: string[] = [];

    for (const user of users) {
      const userId = await this.resolveId(user.id);
      if (!userId) continue;

      // O WhatsApp identifica pedidos pelo LID em grupos novos e pelo PN em grupos antigos.
      const lid = isLidJid(userId) ? userId : this.lidMapper.getLID(userId);

      targets.push(lid || userId);
    }

    if (!targets.length) return [];

    const response = (await this.sock.groupRequestParticipantsUpdate(id, targets, action)) || [];

    this.invalidateGroupMetadata(id);

    const processed: string[] = [];

    for (const item of response) {
      if (item.status && String(item.status) !== '200') continue;

      const processedId = await this.resolveId(item.jid);
      if (processedId) processed.push(processedId);
    }

    return processed;
  }

  /** Consulta os dados de um grupo pelo código de convite, sem entrar nele. */
  public async getChatInviteInfo(code: string): Promise<Chat | null> {
    const inviteCode = `${code || ''}`.replace('https://chat.whatsapp.com/', '').trim();
    if (!inviteCode) return null;

    const metadata = await this.sock.groupGetInviteInfo(inviteCode);
    if (!metadata?.id) return null;

    const chat = new Chat(metadata.id, ChatType.Group, metadata.subject);

    chat.description = metadata.desc || undefined;

    const owner = metadata.ownerPn || metadata.owner;
    if (owner) chat.leader = await this.resolveId(owner);

    return chat;
  }

  public async rejectCall(call: Call): Promise<void> {
    const chatId = call.extra?.from || (await this.resolveId(call.chat.id));
    if (!chatId) return;

    await this.sock.rejectCall(call.id, chatId);
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
    const id = await this.resolveId(user.id);
    if (!id) return '';

    const result = await this.sock.fetchStatus(id) as any;
    // Baileys 7 retorna [{ id, status: { status, setAt } }]
    const entry = Array.isArray(result) ? result[0]?.status : result?.status;

    return (typeof entry === 'string' ? entry : entry?.status) || '';
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
      const id = await this.resolveId(user.id);
      if (!id) return '';

      return (
        (await this.sock.profilePictureUrl(
          id,
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
    const id = await this.resolveId(user.id);
    if (!id) return null;

    const userData = await this.getRecord(`users-${id}`);

    if (!userData) return null;

    return User.fromJSON(userData);
  }

  public async getUsers(): Promise<string[]> {
    return (await this.auth.listAll('users-')).map((id) =>
      id.replace('users-', ''),
    );
  }

  public async updateUser(user: { id: string } & Partial<User>): Promise<void> {
    const id = await this.resolveId(user.id);
    if (!id) return;

    user.id = id;

    if (isUserJid(id)) {
      user.phoneNumber = getPhoneNumber(id) || undefined;
      user.lid = this.lidMapper.getLID(id) || user.lid || undefined;
    }

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

    this.setRecord(`users-${user.id}`, newUser.toJSON());
  }

  public async setUsers(users: User[]): Promise<void> {
    await Promise.all(users.map(async (user) => await this.updateUser(user)));
  }

  public async removeUser(user: User): Promise<void> {
    const id = await this.resolveId(user.id);
    if (!id) return;

    this.removeRecord(`users-${id}`);
  }

  public async blockUser(user: User) {
    const id = await this.resolveId(user.id);
    if (!id || id == this.id) return;

    await this.sock.updateBlockStatus(id, 'block');
  }

  public async unblockUser(user: User) {
    const id = await this.resolveId(user.id);
    if (!id || id == this.id) return;

    await this.sock.updateBlockStatus(id, 'unblock');
  }

  /** Lista os usuários bloqueados (IDs canônicos). */
  public async getBlockedUsers(): Promise<string[]> {
    const list = (await this.sock.fetchBlocklist()) || [];
    const result: string[] = [];

    for (const id of list) {
      const resolved = await this.resolveId(id);
      if (resolved) result.push(resolved);
    }

    return result;
  }

  /**
   * Passa a receber eventos `presence` (digitando, online...) deste chat.
   */
  public async subscribePresence(chat: Chat): Promise<void> {
    const id = await this.resolveId(chat.id);
    if (!id) return;

    await this.sock.presenceSubscribe(id);
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

  /**
   * Chave da mensagem no WhatsApp.
   * Usa a chave original recebida (preserva LID/PN exatamente como o WhatsApp enviou);
   * sem ela, monta a chave a partir dos IDs canônicos.
   */
  public async getMessageKey(message: Message): Promise<proto.IMessageKey | null> {
    const raw = message?.extra?.key;

    if (raw?.id && raw.id == message.id && raw.remoteJid) {
      return {
        remoteJid: raw.remoteJid,
        id: raw.id,
        fromMe: !!raw.fromMe,
        participant: raw.participant || undefined,
      };
    }

    const chatId = await this.resolveId(message?.chat?.id);
    if (!chatId || !message?.id) return null;

    const userId = await this.resolveId(message.user?.id);
    const fromMe = !!message.fromMe || !userId || userId == this.id;

    return {
      remoteJid: chatId,
      id: message.id,
      fromMe,
      participant: isGroupJid(chatId) && !fromMe ? userId : undefined,
    };
  }

  public async readMessage(message: Message): Promise<void> {
    const key = await this.getMessageKey(message);
    if (!key) return;

    const chat = await this.getChat(message.chat);

    if (chat != null && chat.unreadCount) {
      await this.updateChat({
        id: chat.id,
        unreadCount: Math.max(chat.unreadCount - 1, 0),
      });
    }

    return await this.sock.readMessages([key]);
  }

  public async removeMessage(message: Message) {
    const key = await this.getMessageKey(message);
    if (!key) return;

    await this.sock.chatModify(
      {
        deleteForMe: {
          deleteMedia: false,
          key,
          timestamp: Number(message.timestamp || Date.now()),
        },
      },
      key.remoteJid!,
    );
  }

  public async deleteMessage(message: Message) {
    const key = await this.getMessageKey(message);
    if (!key) return;

    if (!key.fromMe && isGroupJid(key.remoteJid)) {
      const admins = await this.getChatAdmins(new Chat(key.remoteJid!));

      if (admins.length && !admins.includes(this.id)) return;
    }

    await this.sock.sendMessage(key.remoteJid!, { delete: key });
  }

  /**
   * Fixa ou desafixa uma mensagem no chat.
   * @param duration - Tempo de fixação (24 h, 7 dias ou 30 dias). Use 0 para desafixar.
   */
  public async pinMessage(message: Message, duration: WAPinDuration | 0 = 604800): Promise<void> {
    const key = await this.getMessageKey(message);
    if (!key) return;

    await this.sock.sendMessage(key.remoteJid!, {
      pin: key,
      type: duration ? proto.PinInChat.Type.PIN_FOR_ALL : proto.PinInChat.Type.UNPIN_FOR_ALL,
      ...(duration ? { time: duration } : {}),
    } as any);
  }

  /** Marca ou desmarca uma mensagem com estrela. */
  public async starMessage(message: Message, star: boolean = true): Promise<void> {
    const key = await this.getMessageKey(message);
    if (!key) return;

    await this.sock.star(key.remoteJid!, [{ id: key.id!, fromMe: !!key.fromMe }], star);
  }

  /**
   * Encaminha uma mensagem recebida ou enviada (precisa estar no cache de mensagens).
   */
  public async forwardMessage(chat: Chat, message: Message): Promise<Message> {
    const target = await this.resolveId(chat.id);
    if (!target) throw new Error(`Invalid chat ID: ${chat.id}`);

    const original = this.getCachedWAMessage(message.extra?.key?.id || message.id);
    if (!original) {
      throw new Error('A mensagem não está mais disponível para encaminhar.');
    }

    const sent = await this.sock.sendMessage(target, { forward: original });

    this.cacheWAMessage(sent);

    return await new ConvertWAMessage(this, sent!).get();
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
    const target = await this.resolveId(jid);
    if (!target) {
      throw new Error(`Invalid JID: ${jid}`);
    }

    return await sendInteractiveMessage(this.sock, target, content);
  }


  public async send(content: Message): Promise<Message> {
    const waMSG = new ConvertToWAMessage(this, content);
    await waMSG.refactory(content);

    const chatId = waMSG.chatId;

    if (!chatId) {
      throw new Error(`Invalid chat ID: ${content?.chat?.id}`);
    }

    // Se a mensagem usa baileys_helper
    if (waMSG.waMessage.__useBaileysHelper) {
      delete waMSG.waMessage.__useBaileysHelper;

      const sentInteractiveMessage = await sendInteractiveMessage(
        this.sock,
        chatId,
        waMSG.waMessage
      );

      this.cacheWAMessage(sentInteractiveMessage);

      return await new ConvertWAMessage(this, sentInteractiveMessage).get();
    }

    // Lógica normal de envio
    if (waMSG.isRelay) {
      const msgRes = generateWAMessageFromContent(
        chatId,
        waMSG.waMessage,
        { ...waMSG.options, userJid: this.id },
      );

      await this.sock.relayMessage(chatId, msgRes.message!, {
        ...waMSG.options,
        messageId: msgRes.key.id,
      });

      this.cacheWAMessage(msgRes);

      return await new ConvertWAMessage(this, msgRes).get();
    }

    const sendedMessage = await this.sock.sendMessage(
      chatId,
      waMSG.waMessage,
      waMSG.options,
    );

    if (typeof sendedMessage == 'boolean') return content;

    this.cacheWAMessage(sendedMessage);

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
        reuploadRequest: (m) => this.sock.updateMediaMessage(m),
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
            reuploadRequest: (m) => this.sock.updateMediaMessage(m),
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
    const normalizedId = await this.resolveId(id);
    if (!normalizedId) return { exists: false, id };

    if (isLidJid(normalizedId)) return { exists: true, id: normalizedId };

    const user = await this.sock.onWhatsApp(normalizedId);

    if (user && user.length > 0) {
      const result: any = user[0];

      if (result.lid) this.lidMapper.register(result.lid, result.jid, true);

      return { exists: !!result.exists, id: normalizeJid(result.jid) || normalizedId };
    }

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
