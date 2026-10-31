"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const baileys_1 = __importStar(require("baileys"));
const baileys_helper_1 = require("baileys_helper");
const node_cache_1 = __importDefault(require("node-cache"));
const stream_1 = __importDefault(require("stream"));
const pino_1 = __importDefault(require("pino"));
const long_1 = __importDefault(require("long"));
const WAConfigs_1 = require("../configs/WAConfigs");
const messages_1 = require("../messages");
const Generic_1 = require("../utils/Generic");
const Auth_1 = require("./Auth");
const Message_1 = require("../messages/Message");
const ConvertToWAMessage_1 = __importDefault(require("./ConvertToWAMessage"));
const makeInMemoryStore_1 = __importDefault(require("./makeInMemoryStore"));
const ConvertWAMessage_1 = __importDefault(require("./ConvertWAMessage"));
const ConfigWAEvents_1 = __importDefault(require("./ConfigWAEvents"));
const ID_1 = require("./ID");
const LIDMapper_1 = require("./LIDMapper");
const BotStatus_1 = require("../bot/BotStatus");
const ChatType_1 = __importDefault(require("../modules/chat/ChatType"));
const BotEvents_1 = __importDefault(require("../bot/BotEvents"));
const WAStatus_1 = require("./WAStatus");
const User_1 = __importDefault(require("../modules/user/User"));
const Chat_1 = __importDefault(require("../modules/chat/Chat"));
/** Tempo de escrita atrasada dos registros de chat/usuário (agrupa várias alterações numa só gravação). */
const RECORD_FLUSH_DELAY_MS = 1500;
class WhatsAppBot extends BotEvents_1.default {
    constructor(config) {
        super();
        //@ts-ignore
        this.sock = {};
        this.auth = new Auth_1.MultiFileAuthState('./session', undefined, false);
        this.messagesCached = [];
        this.msgRetryCountercache = new node_cache_1.default({
            stdTTL: baileys_1.DEFAULT_CACHE_TTLS.MSG_RETRY,
            useClones: false,
        });
        this.saveCreds = (creds) => new Promise((res) => res);
        this.connectionListeners = [];
        this.DisconnectReason = baileys_1.DisconnectReason;
        this.logger = (0, pino_1.default)({ level: 'silent' });
        this.id = '';
        /** LID do próprio bot */
        this.lid = '';
        this.status = BotStatus_1.BotStatus.Offline;
        this.phoneNumber = '';
        this.name = '';
        this.profileUrl = '';
        this.lastConnectionUpdateDate = Date.now();
        this.checkConnectionInterval = null;
        this.configEvents = new ConfigWAEvents_1.default(this);
        this.lidMapper = new LIDMapper_1.LIDMapper();
        /** Cache dos registros `chats-*` e `users-*` (null = não existe no disco) */
        this.recordCache = new node_cache_1.default({ stdTTL: 30 * 60, useClones: false, checkperiod: 120 });
        this.pendingRecordWrites = new Map();
        const store = (0, makeInMemoryStore_1.default)({ logger: this.logger });
        this.store = store;
        this.userConfig = config || {};
        const waBot = this;
        this.config = {
            ...baileys_1.DEFAULT_CONNECTION_CONFIG,
            //printQRInTerminal: true,
            logger: this.logger,
            qrTimeout: 60000,
            defaultQueryTimeoutMs: 10000,
            retryRequestDelayMs: 500,
            maxMsgRetryCount: 5,
            readAllFailedMessages: false,
            msgRetryCounterCache: this.msgRetryCountercache,
            autoRestartInterval: 1000 * 60 * 30,
            useExperimentalServers: false,
            autoSyncHistory: false,
            autoLoadContactInfo: false,
            autoLoadGroupInfo: false,
            autoFetchLatestVersion: true,
            groupMetadataCacheTTL: 5 * 60,
            messageCacheTTL: 30 * 60,
            // Um bot não precisa do histórico completo; os pares LID ↔ PN do sync inicial continuam chegando.
            syncFullHistory: !!(config === null || config === void 0 ? void 0 : config.autoSyncHistory),
            shouldIgnoreJid: () => false,
            async patchMessageBeforeSending(msg) {
                var _a, _b, _c, _d;
                if (((_c = (_b = (_a = msg.deviceSentMessage) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.listMessage) === null || _c === void 0 ? void 0 : _c.listType) ==
                    baileys_1.proto.Message.ListMessage.ListType.PRODUCT_LIST) {
                    msg = JSON.parse(JSON.stringify(msg));
                    msg.deviceSentMessage.message.listMessage.listType =
                        baileys_1.proto.Message.ListMessage.ListType.SINGLE_SELECT;
                }
                if (((_d = msg.listMessage) === null || _d === void 0 ? void 0 : _d.listType) ==
                    baileys_1.proto.Message.ListMessage.ListType.PRODUCT_LIST) {
                    msg = JSON.parse(JSON.stringify(msg));
                    msg.listMessage.listType =
                        baileys_1.proto.Message.ListMessage.ListType.SINGLE_SELECT;
                }
                return msg;
            },
            async getMessage(key) {
                var _a, _b;
                const cached = key.id ? waBot.messageCache.get(key.id) : undefined;
                if (cached === null || cached === void 0 ? void 0 : cached.message)
                    return cached.message;
                const remoteJid = key.remoteJid || '';
                return (((_a = (await waBot.store.loadMessage((0, ID_1.normalizeJid)(remoteJid), key.id))) === null || _a === void 0 ? void 0 : _a.message) ||
                    ((_b = (await waBot.store.loadMessage(remoteJid, key.id))) === null || _b === void 0 ? void 0 : _b.message) ||
                    undefined);
            },
            async cachedGroupMetadata(jid) {
                return waBot.groupMetadataCache.get(jid);
            },
            ...config,
        };
        this.messageCache = new node_cache_1.default({
            stdTTL: this.config.messageCacheTTL,
            useClones: false,
            checkperiod: 120,
        });
        this.groupMetadataCache = new node_cache_1.default({
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
    canonicalId(id) {
        const normalized = (0, ID_1.normalizeJid)(id || '');
        if (!normalized)
            return '';
        if (this.lid && normalized === this.lid && this.id)
            return this.id;
        return this.lidMapper.canonical(normalized);
    }
    /**
     * ID canônico de um usuário ou chat, consultando também o store persistente do Baileys.
     * Aceita número puro, PN, LID, grupo, com ou sem sufixo de dispositivo.
     */
    async resolveId(id) {
        const normalized = (0, ID_1.normalizeJid)(id || '');
        if (!normalized)
            return '';
        if (this.lid && normalized === this.lid && this.id)
            return this.id;
        if (!(0, ID_1.isLidJid)(normalized))
            return normalized;
        return await this.lidMapper.canonicalAsync(normalized);
    }
    /** Retorna todos os identificadores conhecidos de um usuário. */
    async getIdentity(id) {
        const canonical = await this.resolveId(id);
        const pn = (0, ID_1.isPnJid)(canonical) ? canonical : undefined;
        const lid = (0, ID_1.isLidJid)(canonical) ? canonical : pn ? this.lidMapper.getLID(pn) : undefined;
        return { id: canonical, pn, lid, phoneNumber: pn ? (0, ID_1.getPhoneNumber)(pn) : '' };
    }
    /**
     * Busca o LID de um número no WhatsApp (pode consultar a rede).
     */
    async getUserLID(id) {
        const canonical = await this.resolveId(id);
        if (!canonical)
            return '';
        if ((0, ID_1.isLidJid)(canonical))
            return canonical;
        return (await this.lidMapper.resolveLID(canonical)) || '';
    }
    /**
     * Registra os pares PN ↔ LID de uma chave de mensagem.
     * Mantido por compatibilidade.
     */
    extractAndMapLID(message) {
        return (0, ID_1.extractAndMapLID)(message, this.lidMapper);
    }
    /** Registra um par PN ↔ LID descoberto fora das mensagens (participantes, contatos, chamadas). */
    registerIdentity(first, second, persist = false) {
        return this.lidMapper.register(first, second, persist);
    }
    /** Chamado quando um par PN ↔ LID novo é aprendido. */
    onIdentityMapping(pair) {
        this.emit('id-mapping', { ...pair, phoneNumber: (0, ID_1.getPhoneNumber)(pair.pn) });
        this.migrateLegacyRecords(pair).catch((err) => this.emit('error', err));
    }
    /**
     * Move registros salvos com LID (`users-<lid>`, `chats-<lid>`) para o ID canônico (PN),
     * para que a mesma pessoa não tenha dois registros.
     */
    async migrateLegacyRecords({ lid, pn }) {
        if (!this.legacyLidRecords) {
            // Uma única leitura do diretório, compartilhada por todas as migrações simultâneas
            this.legacyLidRecordsLoading =
                this.legacyLidRecordsLoading ||
                    Promise.all([this.auth.listAll('users-'), this.auth.listAll('chats-')]).then(([users, chats]) => new Set([...users, ...chats].filter((key) => key.endsWith('@lid'))));
            this.legacyLidRecords = await this.legacyLidRecordsLoading;
        }
        if (!this.legacyLidRecords.size)
            return;
        for (const prefix of ['users', 'chats']) {
            const legacyKey = `${prefix}-${lid}`;
            if (!this.legacyLidRecords.has(legacyKey))
                continue;
            this.legacyLidRecords.delete(legacyKey);
            const legacy = await this.getRecord(legacyKey);
            if (!legacy)
                continue;
            const currentKey = `${prefix}-${pn}`;
            const current = (await this.getRecord(currentKey)) || {};
            const merged = { ...legacy, ...current, id: pn, lid };
            merged.phoneNumber = (0, ID_1.getPhoneNumber)(pn);
            if (prefix == 'chats')
                merged.type = ChatType_1.default.PV;
            this.setRecord(currentKey, merged);
            this.removeRecord(legacyKey);
        }
    }
    // ============================================
    // REGISTROS (chats-* / users-*)
    // ============================================
    async getRecord(key) {
        const cached = this.recordCache.get(key);
        if (cached !== undefined)
            return cached;
        const value = (await this.auth.get(key)) || null;
        this.recordCache.set(key, value);
        return value;
    }
    setRecord(key, value) {
        this.recordCache.set(key, value);
        this.scheduleRecordWrite(key);
    }
    removeRecord(key) {
        this.recordCache.set(key, null);
        this.scheduleRecordWrite(key);
    }
    scheduleRecordWrite(key) {
        if (this.pendingRecordWrites.has(key))
            return;
        const timeout = setTimeout(() => {
            this.pendingRecordWrites.delete(key);
            this.writeRecord(key).catch((err) => this.emit('error', err));
        }, RECORD_FLUSH_DELAY_MS);
        this.pendingRecordWrites.set(key, timeout);
    }
    async writeRecord(key) {
        const value = this.recordCache.get(key);
        if (value) {
            await this.auth.set(key, value);
        }
        else {
            await this.auth.remove(key);
        }
    }
    /** Grava imediatamente todos os registros pendentes. */
    async flushRecords() {
        const keys = [...this.pendingRecordWrites.keys()];
        for (const key of keys) {
            clearTimeout(this.pendingRecordWrites.get(key));
            this.pendingRecordWrites.delete(key);
        }
        await Promise.all(keys.map((key) => this.writeRecord(key).catch(() => undefined)));
    }
    // ============================================
    // CACHE DE MENSAGENS E GRUPOS
    // ============================================
    /** Guarda uma mensagem recebida ou enviada (reenvio, votos de enquete, citação, encaminhamento). */
    cacheWAMessage(message) {
        var _a;
        if (!((_a = message === null || message === void 0 ? void 0 : message.key) === null || _a === void 0 ? void 0 : _a.id) || !message.message)
            return;
        this.messageCache.set(message.key.id, message);
    }
    /** Retorna a mensagem original do WhatsApp pelo ID, se ainda estiver em cache. */
    getCachedWAMessage(id) {
        if (!id)
            return undefined;
        return this.messageCache.get(id);
    }
    /** Registra os pares PN ↔ LID presentes nos participantes de um grupo. */
    registerParticipants(participants) {
        for (const participant of participants || []) {
            if (!(participant === null || participant === void 0 ? void 0 : participant.id))
                continue;
            this.lidMapper.register(participant.id, participant.phoneNumber, true);
            this.lidMapper.register(participant.id, participant.lid, true);
        }
    }
    /** Atualiza o cache de metadados de um grupo. */
    setGroupMetadata(metadata) {
        if (!(metadata === null || metadata === void 0 ? void 0 : metadata.id))
            return;
        this.registerParticipants(metadata.participants);
        if (metadata.owner || metadata.ownerPn)
            this.lidMapper.register(metadata.owner, metadata.ownerPn, true);
        if (metadata.subjectOwner || metadata.subjectOwnerPn) {
            this.lidMapper.register(metadata.subjectOwner, metadata.subjectOwnerPn, true);
        }
        this.groupMetadataCache.set(metadata.id, metadata);
    }
    /**
     * Aplica uma mudança de participantes no cache do grupo, sem nova consulta à rede.
     * Mantém o cache correto para o próximo envio ao grupo.
     */
    applyParticipantsUpdate(groupId, participants, action) {
        const id = (0, ID_1.normalizeJid)(groupId);
        const cached = this.groupMetadataCache.get(id);
        if (!cached)
            return;
        if (action == 'modify') {
            this.invalidateGroupMetadata(id);
            return;
        }
        const isSame = (a, b) => [a.id, a.phoneNumber, a.lid].some((x) => !!x && [b.id, b.phoneNumber, b.lid].some((y) => !!y && this.lidMapper.isSameUser(x, y)));
        let list = [...(cached.participants || [])];
        for (const participant of participants || []) {
            if (!(participant === null || participant === void 0 ? void 0 : participant.id))
                continue;
            if (action == 'add') {
                if (!list.some((p) => isSame(p, participant))) {
                    list.push({ ...participant, id: participant.id, admin: participant.admin || null });
                }
            }
            else if (action == 'remove') {
                if (this.lidMapper.isSameUser(participant.phoneNumber || participant.id, this.id)) {
                    this.invalidateGroupMetadata(id);
                    return;
                }
                list = list.filter((p) => !isSame(p, participant));
            }
            else {
                list = list.map((p) => isSame(p, participant) ? { ...p, admin: action == 'promote' ? 'admin' : null } : p);
            }
        }
        this.groupMetadataCache.set(id, { ...cached, participants: list, size: list.length });
    }
    /** Remove um grupo do cache para que o próximo acesso busque dados atuais. */
    invalidateGroupMetadata(id) {
        this.groupMetadataCache.del((0, ID_1.normalizeJid)(id) || id);
    }
    /**
     * Metadados de um grupo, usando cache.
     * @param chat - Grupo
     * @param force - Ignora o cache e consulta o WhatsApp
     */
    async getGroupMetadata(chat, force = false) {
        const id = (0, ID_1.normalizeJid)(typeof chat == 'string' ? chat : chat === null || chat === void 0 ? void 0 : chat.id);
        if (!id || !(0, ID_1.isGroupJid)(id))
            return null;
        if (!force) {
            const cached = this.groupMetadataCache.get(id);
            if (cached)
                return cached;
        }
        try {
            const metadata = await this.sock.groupMetadata(id);
            this.setGroupMetadata(metadata);
            return metadata;
        }
        catch (_a) {
            return null;
        }
    }
    // ============================================
    // MÉTODOS DE CONEXÃO
    // ============================================
    async connect(auth) {
        var _a, _b, _c;
        if (!auth || typeof auth == 'string') {
            this.auth = new Auth_1.MultiFileAuthState(`${auth || './session'}`);
        }
        else {
            this.auth = auth;
        }
        if (!this.auth.botPhoneNumber) {
            await this.internalConnect({ browser: WhatsAppBot.Browser() });
        }
        else {
            await this.internalConnect({
                browser: ['Chrome (linux)', 'Falcão SSH BOT', '22.5.0'],
            });
            if (!((_c = (_b = (_a = this.sock) === null || _a === void 0 ? void 0 : _a.authState) === null || _b === void 0 ? void 0 : _b.creds) === null || _c === void 0 ? void 0 : _c.registered)) {
                await this.sock.waitForConnectionUpdate(async (update) => !!update.qr);
                const code = await this.sock.requestPairingCode(this.auth.botPhoneNumber);
                this.emit('code', code);
            }
        }
        await this.awaitConnectionState('open');
    }
    /**
     * Versão do WhatsApp Web usada na conexão.
     * Busca a versão atual (com cache de 6 horas) e usa a versão embutida no Baileys se a busca falhar.
     */
    async resolveVersion() {
        var _a, _b;
        if (this.userConfig.version || !this.config.autoFetchLatestVersion)
            return undefined;
        const cached = WhatsAppBot.latestVersion;
        if (cached && Date.now() - cached.fetchedAt < 6 * 60 * 60 * 1000)
            return cached.version;
        try {
            const result = await Promise.race([
                (0, baileys_1.fetchLatestWaWebVersion)(),
                new Promise((resolve) => setTimeout(() => resolve(undefined), 5000)),
            ]);
            if (result && !('error' in result && result.error) && Array.isArray(result.version)) {
                WhatsAppBot.latestVersion = { version: result.version, fetchedAt: Date.now() };
                return result.version;
            }
        }
        catch (err) {
            (_b = (_a = this.logger) === null || _a === void 0 ? void 0 : _a.warn) === null || _b === void 0 ? void 0 : _b.call(_a, { err }, 'Failed to fetch latest WhatsApp Web version');
        }
        return undefined;
    }
    async internalConnect(additionalOptions = {}) {
        return new Promise(async (resolve, reject) => {
            var _a;
            try {
                const { state, saveCreds } = await (0, Auth_1.getBaileysAuth)(this.auth);
                const version = await this.resolveVersion();
                this.saveCreds = saveCreds;
                this.sock = (0, baileys_1.default)({
                    auth: {
                        creds: state.creds,
                        keys: (0, baileys_1.makeCacheableSignalKeyStore)(state.keys, this.config.logger || this.logger),
                    },
                    ...additionalOptions,
                    ...this.config,
                    ...(version ? { version } : {}),
                });
                this.lidMapper.attachStore((_a = this.sock.signalRepository) === null || _a === void 0 ? void 0 : _a.lidMapping);
                this.sock.ev.on('creds.update', saveCreds);
                this.store.bind(this.sock.ev);
                this.configEvents.configureAll();
                resolve();
                await this.awaitConnectionState('open');
            }
            catch (err) {
                this.ev.emit('error', err);
            }
        });
    }
    async reconnect(stopEvents = false, showOpen) {
        if (stopEvents) {
            this.eventsIsStoped = true;
            let state = this.status == BotStatus_1.BotStatus.Online ? 'close' : 'connecting';
            let status = baileys_1.DisconnectReason.connectionClosed;
            let retryCount = 0;
            this.connectionListeners.push((update) => {
                var _a, _b, _c, _d, _e, _f, _g, _h;
                if (!update.connection)
                    return false;
                if (retryCount >= 3) {
                    this.eventsIsStoped = false;
                    return true;
                }
                if (update.connection != state) {
                    if (update.connection == 'close') {
                        state = 'connecting';
                        status =
                            ((_c = (_b = (_a = update.lastDisconnect) === null || _a === void 0 ? void 0 : _a.error) === null || _b === void 0 ? void 0 : _b.output) === null || _c === void 0 ? void 0 : _c.statusCode) ||
                                ((_d = update.lastDisconnect) === null || _d === void 0 ? void 0 : _d.error) ||
                                baileys_1.DisconnectReason.connectionClosed;
                        retryCount++;
                    }
                    else {
                        this.eventsIsStoped = false;
                        if (state == 'connecting') {
                            this.emit('close', { reason: status });
                        }
                        else if (state == 'open') {
                            this.emit('close', { reason: status });
                            this.emit('connecting', {});
                        }
                    }
                    return true;
                }
                if (state == 'close') {
                    state = 'connecting';
                    status =
                        ((_g = (_f = (_e = update.lastDisconnect) === null || _e === void 0 ? void 0 : _e.error) === null || _f === void 0 ? void 0 : _f.output) === null || _g === void 0 ? void 0 : _g.statusCode) ||
                            ((_h = update.lastDisconnect) === null || _h === void 0 ? void 0 : _h.error) ||
                            baileys_1.DisconnectReason.connectionClosed;
                }
                else if (state == 'connecting') {
                    state = 'open';
                }
                else if (state == 'open' && showOpen) {
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
    async stop(reason = 402) {
        var _a;
        try {
            this.status = BotStatus_1.BotStatus.Offline;
            await this.flushRecords();
            (_a = this.sock) === null || _a === void 0 ? void 0 : _a.end(reason);
        }
        catch (err) {
            this.emit('error', err);
        }
    }
    async logout() {
        var _a;
        await this.flushRecords();
        await ((_a = this.sock) === null || _a === void 0 ? void 0 : _a.logout());
    }
    async awaitConnectionState(connection) {
        return new Promise((res) => {
            this.connectionListeners.push((update) => {
                if (update.connection != connection)
                    return false;
                res(update);
                return true;
            });
        });
    }
    // ============================================
    // MÉTODOS DE LEITURA
    // ============================================
    async readChat(chat, metadata, updateMetadata = true) {
        try {
            const id = await this.resolveId(chat.id);
            if (!id)
                return;
            chat.id = id;
            chat.type = (0, ID_1.isGroupJid)(id) ? ChatType_1.default.Group : ChatType_1.default.PV;
            if (chat.type == ChatType_1.default.Group) {
                if (updateMetadata) {
                    chat.profileUrl =
                        (await this.getChatProfileUrl(new Chat_1.default(chat.id))) || undefined;
                    if (!metadata) {
                        metadata = (await this.getGroupMetadata(chat.id)) || undefined;
                    }
                    else if (!metadata.participants) {
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
                                        isSuperAdmin: p.rank == baileys_1.proto.GroupParticipant.Rank.SUPERADMIN,
                                        isAdmin: p.rank == baileys_1.proto.GroupParticipant.Rank.ADMIN,
                                    };
                                }),
                            ];
                        }
                    }
                }
                if (metadata === null || metadata === void 0 ? void 0 : metadata.participants) {
                    this.registerParticipants(metadata.participants);
                    chat.users = [];
                    chat.admins = [];
                    for (const p of metadata.participants) {
                        const participantId = await this.resolveId(p.phoneNumber || p.id);
                        if (!participantId)
                            continue;
                        chat.users.push(participantId);
                        if (p.admin == 'admin' || p.isAdmin) {
                            chat.admins.push(participantId);
                        }
                        else if (p.admin == 'superadmin' || p.isSuperAdmin) {
                            chat.leader = participantId;
                            chat.admins.push(participantId);
                        }
                    }
                }
                const owner = (metadata === null || metadata === void 0 ? void 0 : metadata.ownerPn) || (metadata === null || metadata === void 0 ? void 0 : metadata.owner) || (metadata === null || metadata === void 0 ? void 0 : metadata.subjectOwnerPn) || (metadata === null || metadata === void 0 ? void 0 : metadata.subjectOwner);
                if (owner) {
                    const ownerId = await this.resolveId(owner);
                    if (ownerId)
                        chat.leader = ownerId;
                }
            }
            else {
                chat.phoneNumber = (0, ID_1.getPhoneNumber)(id) || undefined;
                chat.lid = this.lidMapper.getLID(id) || undefined;
            }
            if ((metadata === null || metadata === void 0 ? void 0 : metadata.subject) || (metadata === null || metadata === void 0 ? void 0 : metadata.name)) {
                chat.name = metadata.subject || metadata.name || undefined;
            }
            if ((metadata === null || metadata === void 0 ? void 0 : metadata.desc) || (metadata === null || metadata === void 0 ? void 0 : metadata.description)) {
                chat.description = metadata.desc || metadata.description || undefined;
            }
            if (metadata === null || metadata === void 0 ? void 0 : metadata.unreadCount) {
                chat.unreadCount = metadata.unreadCount || undefined;
            }
            if (metadata === null || metadata === void 0 ? void 0 : metadata.conversationTimestamp) {
                if (long_1.default.isLong(metadata.conversationTimestamp)) {
                    chat.timestamp = metadata.conversationTimestamp.toNumber() * 1000;
                }
                else {
                    chat.timestamp = Number(metadata.conversationTimestamp) * 1000;
                }
            }
            await this.updateChat({ id: chat.id, ...chat });
        }
        catch (_a) { }
    }
    async readUser(user, metadata) {
        try {
            if (metadata === null || metadata === void 0 ? void 0 : metadata.id) {
                this.lidMapper.register(metadata.id, metadata.phoneNumber, true);
                this.lidMapper.register(metadata.id, metadata.lid, true);
            }
            const id = await this.resolveId(user.id);
            if (!id || !(0, ID_1.isUserJid)(id))
                return;
            user.id = id;
            if (metadata === null || metadata === void 0 ? void 0 : metadata.imgUrl) {
                user.profileUrl = await this.getUserProfileUrl(new User_1.default(user.id));
            }
            else {
                const userData = await this.getUser(new User_1.default(user.id || ''));
                if (userData == null || !userData.profileUrl) {
                    user.profileUrl = await this.getUserProfileUrl(new User_1.default(user.id));
                }
            }
            if ((metadata === null || metadata === void 0 ? void 0 : metadata.notify) || (metadata === null || metadata === void 0 ? void 0 : metadata.verifiedName)) {
                user.name = (metadata === null || metadata === void 0 ? void 0 : metadata.notify) || (metadata === null || metadata === void 0 ? void 0 : metadata.verifiedName);
            }
            if (metadata === null || metadata === void 0 ? void 0 : metadata.name) {
                user.savedName = metadata.name;
            }
            user.name = user.name || user.savedName;
            await this.updateUser({ id: user.id || '', ...user });
        }
        catch (err) {
            this.emit('error', err);
        }
    }
    // ============================================
    // MÉTODOS DE POLL
    // ============================================
    async getPollMessage(pollMessageId) {
        var _a, _b;
        const pollMessage = await this.auth.get(`polls-${pollMessageId}`);
        console.info('[Rompot poll] storage lookup', {
            pollMessageId,
            found: Boolean(pollMessage),
            type: pollMessage === null || pollMessage === void 0 ? void 0 : pollMessage.type,
            optionCount: ((_a = pollMessage === null || pollMessage === void 0 ? void 0 : pollMessage.options) === null || _a === void 0 ? void 0 : _a.length) || 0,
            secretKeyLength: ((_b = pollMessage === null || pollMessage === void 0 ? void 0 : pollMessage.secretKey) === null || _b === void 0 ? void 0 : _b.length) || 0,
        });
        if (!pollMessage || !messages_1.PollMessage.isValid(pollMessage))
            return messages_1.PollMessage.fromJSON({ id: pollMessageId });
        if (pollMessage.type == Message_1.MessageType.PollUpdate) {
            return messages_1.PollUpdateMessage.fromJSON(pollMessage);
        }
        return messages_1.PollMessage.fromJSON(pollMessage);
    }
    async savePollMessage(pollMessage) {
        var _a, _b;
        await this.auth.set(`polls-${pollMessage.id}`, pollMessage.toJSON());
        console.info('[Rompot poll] storage saved', {
            pollMessageId: pollMessage.id,
            type: pollMessage.type,
            optionCount: ((_a = pollMessage.options) === null || _a === void 0 ? void 0 : _a.length) || 0,
            secretKeyLength: ((_b = pollMessage.secretKey) === null || _b === void 0 ? void 0 : _b.length) || 0,
            voterCount: Object.keys(pollMessage.votes || {}).length,
        });
    }
    // ============================================
    // GROUP PARTICIPANTS
    // ============================================
    async groupParticipantsUpdate(action, chatId, userId, fromId) {
        const normalizedChatId = (0, ID_1.normalizeJid)(chatId);
        const normalizedUserId = await this.resolveId(userId);
        const normalizedFromId = (await this.resolveId(fromId)) || normalizedUserId;
        if (!normalizedChatId || !(0, ID_1.isGroupJid)(normalizedChatId))
            return;
        if (!normalizedUserId)
            return;
        const event = action == 'join' ? 'add' : action == 'leave' ? 'remove' : action;
        const metadata = this.groupMetadataCache.get(normalizedChatId);
        let chat = await this.getChat(new Chat_1.default(normalizedChatId));
        if (!chat) {
            chat = Chat_1.default.fromJSON({ id: normalizedChatId, type: ChatType_1.default.Group });
        }
        if (!chat.name && (metadata === null || metadata === void 0 ? void 0 : metadata.subject))
            chat.name = metadata.subject;
        const toUser = async (id) => {
            const stored = await this.getUser(new User_1.default(id));
            if (stored)
                return stored;
            return User_1.default.fromJSON({
                id,
                phoneNumber: (0, ID_1.getPhoneNumber)(id),
                lid: this.lidMapper.getLID(id),
            });
        };
        const fromUser = await toUser(normalizedFromId);
        const user = await toUser(normalizedUserId);
        let users = chat.users || [];
        let admins = chat.admins || [];
        if (event == 'add' && !users.includes(user.id))
            users.push(user.id);
        if (event == 'remove') {
            users = users.filter((u) => u != user.id);
            admins = admins.filter((admin) => admin != user.id);
        }
        if (event == 'demote')
            admins = admins.filter((admin) => admin != user.id);
        if (event == 'promote' && !admins.includes(user.id))
            admins.push(user.id);
        chat.users = users;
        chat.admins = admins;
        if (user.id == this.id) {
            if (event == 'remove')
                await this.removeChat(chat);
            if (event == 'add')
                await this.updateChat(chat);
        }
        else {
            await this.updateChat(chat);
        }
        this.ev.emit('user', { action, event, user, fromUser, chat });
    }
    //! ********************************* CHAT *********************************
    async getChatName(chat) {
        var _a;
        return ((_a = (await this.getChat(chat))) === null || _a === void 0 ? void 0 : _a.name) || '';
    }
    /** Garante que o chat é um grupo e que o bot é administrador. Retorna o JID do grupo. */
    async requireGroupAdmin(chat) {
        const id = (0, ID_1.normalizeJid)(chat === null || chat === void 0 ? void 0 : chat.id);
        if (!id || !(0, ID_1.isGroupJid)(id))
            return '';
        const admins = await this.getChatAdmins(chat);
        if (admins.length && !admins.includes(this.id))
            return '';
        return id;
    }
    async setChatName(chat, name) {
        const id = await this.requireGroupAdmin(chat);
        if (!id)
            return;
        await this.sock.groupUpdateSubject(id, name);
    }
    async getChatDescription(chat) {
        var _a;
        return ((_a = (await this.getChat(chat))) === null || _a === void 0 ? void 0 : _a.description) || '';
    }
    async setChatDescription(chat, description) {
        const id = await this.requireGroupAdmin(chat);
        if (!id)
            return;
        await this.sock.groupUpdateDescription(id, description);
    }
    async getChatProfile(chat, lowQuality) {
        const uri = await this.getChatProfileUrl(chat, lowQuality);
        return await (0, Generic_1.getImageURL)(uri);
    }
    async getChatProfileUrl(chat, lowQuality) {
        try {
            const id = await this.resolveId(chat.id);
            if (!id)
                return '';
            return ((await this.sock.profilePictureUrl(id, lowQuality ? 'preview' : 'image')) || '');
        }
        catch (_a) {
            return '';
        }
    }
    async setChatProfile(chat, image) {
        const id = await this.requireGroupAdmin(chat);
        if (!id)
            return;
        await this.sock.updateProfilePicture(id, image);
    }
    async updateChat(chat) {
        const id = await this.resolveId(chat.id);
        if (!id)
            return;
        chat.id = id;
        const chatData = await this.getChat(new Chat_1.default(chat.id));
        if (chatData != null) {
            chat = Object.keys(chat).reduce((data, key) => {
                if (chat[key] == undefined || chat[key] == null)
                    return data;
                if ((0, Generic_1.verifyIsEquals)(chat[key], chatData[key]))
                    return data;
                return { ...data, [key]: chat[key] };
            }, { id: chat.id });
            if (Object.keys(chat).length < 2)
                return;
        }
        const newChat = Chat_1.default.fromJSON({ ...(chatData || {}), ...chat });
        newChat.type = (0, ID_1.isGroupJid)(chat.id) ? ChatType_1.default.Group : ChatType_1.default.PV;
        if (newChat.type == ChatType_1.default.PV) {
            newChat.phoneNumber = (0, ID_1.getPhoneNumber)(chat.id) || newChat.phoneNumber;
            newChat.lid = this.lidMapper.getLID(chat.id) || newChat.lid;
        }
        this.setRecord(`chats-${chat.id}`, newChat.toJSON());
        this.ev.emit('chat', { action: chatData != null ? 'update' : 'add', chat });
    }
    async removeChat(chat) {
        const id = await this.resolveId(chat.id);
        if (!id)
            return;
        this.removeRecord(`chats-${id}`);
        if ((0, ID_1.isGroupJid)(id))
            this.invalidateGroupMetadata(id);
        this.ev.emit('chat', { action: 'remove', chat });
    }
    async getChat(chat) {
        const id = await this.resolveId(chat.id);
        if (!id)
            return null;
        const chatData = await this.getRecord(`chats-${id}`);
        if (!chatData)
            return null;
        const stored = Chat_1.default.fromJSON(chatData);
        if (!stored.name || !stored.profileUrl) {
            const user = (0, ID_1.isUserJid)(id) ? await this.getUser(new User_1.default(id)) : null;
            if (user != null) {
                stored.name = stored.name || user.name || user.savedName;
                stored.profileUrl = stored.profileUrl || user.profileUrl;
            }
        }
        return stored;
    }
    async getChats() {
        return (await this.auth.listAll('chats-')).map((id) => id.replace('chats-', ''));
    }
    async setChats(chats) {
        await Promise.all(chats.map(async (chat) => await this.updateChat(chat)));
    }
    async getChatUsers(chat) {
        var _a;
        return ((_a = (await this.getChat(chat))) === null || _a === void 0 ? void 0 : _a.users) || [];
    }
    async getChatAdmins(chat) {
        var _a, _b, _c;
        const chatReaded = await this.getChat(chat);
        if (!chatReaded) {
            if (!(0, ID_1.isGroupJid)((0, ID_1.normalizeJid)(chat === null || chat === void 0 ? void 0 : chat.id)))
                return [];
            await this.readChat(chat);
            return ((_a = (await this.getChat(chat))) === null || _a === void 0 ? void 0 : _a.admins) || [];
        }
        if ((_b = chatReaded.admins) === null || _b === void 0 ? void 0 : _b.length) {
            return chatReaded.admins || [];
        }
        if (chatReaded.type !== ChatType_1.default.Group)
            return [];
        await this.readChat(chat);
        return ((_c = (await this.getChat(chat))) === null || _c === void 0 ? void 0 : _c.admins) || [];
    }
    async getChatLeader(chat) {
        var _a;
        return ((_a = (await this.getChat(chat))) === null || _a === void 0 ? void 0 : _a.leader) || '';
    }
    async participantsAction(chat, user, action) {
        const chatId = await this.requireGroupAdmin(chat);
        const userId = await this.resolveId(user.id);
        if (!chatId || !userId)
            return;
        await this.sock.groupParticipantsUpdate(chatId, [userId], action);
        this.invalidateGroupMetadata(chatId);
    }
    async addUserInChat(chat, user) {
        await this.participantsAction(chat, user, 'add');
    }
    async removeUserInChat(chat, user) {
        await this.participantsAction(chat, user, 'remove');
    }
    async promoteUserInChat(chat, user) {
        await this.participantsAction(chat, user, 'promote');
    }
    async demoteUserInChat(chat, user) {
        await this.participantsAction(chat, user, 'demote');
    }
    async changeChatStatus(chat, status) {
        var _a, _b, _c, _d;
        const id = await this.resolveId(chat.id);
        if (!id) {
            (_b = (_a = this.logger) === null || _a === void 0 ? void 0 : _a.error) === null || _b === void 0 ? void 0 : _b.call(_a, 'Invalid chat.id for changeChatStatus:', chat.id);
            return;
        }
        try {
            await this.sock.sendPresenceUpdate(WAStatus_1.WAStatus[status] || 'available', id);
        }
        catch (error) {
            (_d = (_c = this.logger) === null || _c === void 0 ? void 0 : _c.error) === null || _d === void 0 ? void 0 : _d.call(_c, 'Error updating chat status:', error);
        }
    }
    async createChat(chat) {
        await this.sock.groupCreate(chat.name || '', [this.id]);
    }
    async leaveChat(chat) {
        const id = (0, ID_1.normalizeJid)(chat.id);
        if (!id || !(0, ID_1.isGroupJid)(id))
            return;
        if ((await this.getChat(chat)) == null)
            return;
        await this.sock.groupLeave(id);
        await this.removeChat(chat);
    }
    async joinChat(code) {
        await this.sock.groupAcceptInvite(code.replace('https://chat.whatsapp.com/', ''));
    }
    async getChatInvite(chat) {
        const id = await this.requireGroupAdmin(chat);
        if (!id)
            return '';
        return (await this.sock.groupInviteCode(id)) || '';
    }
    async revokeChatInvite(chat) {
        const id = await this.requireGroupAdmin(chat);
        if (!id)
            return '';
        return (await this.sock.groupRevokeInvite(id)) || '';
    }
    /**
     * Define se só administradores podem enviar mensagens no grupo.
     * @param enabled - `true` fecha o grupo para membros comuns
     */
    async setChatAnnounce(chat, enabled) {
        const id = await this.requireGroupAdmin(chat);
        if (!id)
            return;
        await this.sock.groupSettingUpdate(id, enabled ? 'announcement' : 'not_announcement');
    }
    /**
     * Define se só administradores podem editar nome, descrição e foto do grupo.
     */
    async setChatLocked(chat, enabled) {
        const id = await this.requireGroupAdmin(chat);
        if (!id)
            return;
        await this.sock.groupSettingUpdate(id, enabled ? 'locked' : 'unlocked');
    }
    /**
     * Ativa ou desativa mensagens temporárias.
     * @param seconds - 0 desativa; valores comuns: 86400 (24 h), 604800 (7 dias), 7776000 (90 dias)
     */
    async setChatEphemeral(chat, seconds) {
        const id = await this.resolveId(chat.id);
        if (!id)
            return;
        if ((0, ID_1.isGroupJid)(id)) {
            const groupId = await this.requireGroupAdmin(chat);
            if (!groupId)
                return;
            await this.sock.groupToggleEphemeral(groupId, seconds);
        }
        else {
            await this.sock.sendMessage(id, { disappearingMessagesInChat: seconds || false });
        }
    }
    /**
     * Define se qualquer membro pode adicionar participantes.
     */
    async setChatMemberAddMode(chat, allMembers) {
        const id = await this.requireGroupAdmin(chat);
        if (!id)
            return;
        await this.sock.groupMemberAddMode(id, allMembers ? 'all_member_add' : 'admin_add');
    }
    /**
     * Define se a entrada no grupo exige aprovação de um administrador.
     */
    async setChatJoinApproval(chat, enabled) {
        const id = await this.requireGroupAdmin(chat);
        if (!id)
            return;
        await this.sock.groupJoinApprovalMode(id, enabled ? 'on' : 'off');
    }
    /** Lista os pedidos de entrada pendentes num grupo. */
    async getChatJoinRequests(chat) {
        const id = await this.requireGroupAdmin(chat);
        if (!id)
            return [];
        const requests = (await this.sock.groupRequestParticipantsList(id)) || [];
        const result = [];
        for (const request of requests) {
            const raw = request.jid || request.lid || request.phone_number || '';
            if (!raw)
                continue;
            this.lidMapper.register(request.jid, request.phone_number, true);
            this.lidMapper.register(request.lid, request.phone_number || request.jid, true);
            const userId = await this.resolveId(request.phone_number || raw);
            const stored = await this.getUser(new User_1.default(userId));
            const user = stored || User_1.default.fromJSON({ id: userId, phoneNumber: (0, ID_1.getPhoneNumber)(userId) });
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
    async updateChatJoinRequests(chat, users, action) {
        const id = await this.requireGroupAdmin(chat);
        if (!id)
            return [];
        const targets = [];
        for (const user of users) {
            const userId = await this.resolveId(user.id);
            if (!userId)
                continue;
            // O WhatsApp identifica pedidos pelo LID em grupos novos e pelo PN em grupos antigos.
            const lid = (0, ID_1.isLidJid)(userId) ? userId : this.lidMapper.getLID(userId);
            targets.push(lid || userId);
        }
        if (!targets.length)
            return [];
        const response = (await this.sock.groupRequestParticipantsUpdate(id, targets, action)) || [];
        this.invalidateGroupMetadata(id);
        const processed = [];
        for (const item of response) {
            if (item.status && String(item.status) !== '200')
                continue;
            const processedId = await this.resolveId(item.jid);
            if (processedId)
                processed.push(processedId);
        }
        return processed;
    }
    /** Consulta os dados de um grupo pelo código de convite, sem entrar nele. */
    async getChatInviteInfo(code) {
        const inviteCode = `${code || ''}`.replace('https://chat.whatsapp.com/', '').trim();
        if (!inviteCode)
            return null;
        const metadata = await this.sock.groupGetInviteInfo(inviteCode);
        if (!(metadata === null || metadata === void 0 ? void 0 : metadata.id))
            return null;
        const chat = new Chat_1.default(metadata.id, ChatType_1.default.Group, metadata.subject);
        chat.description = metadata.desc || undefined;
        const owner = metadata.ownerPn || metadata.owner;
        if (owner)
            chat.leader = await this.resolveId(owner);
        return chat;
    }
    async rejectCall(call) {
        var _a;
        const chatId = ((_a = call.extra) === null || _a === void 0 ? void 0 : _a.from) || (await this.resolveId(call.chat.id));
        if (!chatId)
            return;
        await this.sock.rejectCall(call.id, chatId);
    }
    //! ********************************* USER *********************************
    async getUserName(user) {
        var _a;
        return ((_a = (await this.getUser(user))) === null || _a === void 0 ? void 0 : _a.name) || '';
    }
    async setUserName(user, name) {
        if (user.id != this.id)
            return;
        await this.setBotName(name);
    }
    async getUserDescription(user) {
        var _a;
        const id = await this.resolveId(user.id);
        if (!id)
            return '';
        const result = await this.sock.fetchStatus(id);
        // Baileys 7 retorna [{ id, status: { status, setAt } }]
        const entry = Array.isArray(result) ? (_a = result[0]) === null || _a === void 0 ? void 0 : _a.status : result === null || result === void 0 ? void 0 : result.status;
        return (typeof entry === 'string' ? entry : entry === null || entry === void 0 ? void 0 : entry.status) || '';
    }
    async setUserDescription(user, description) {
        if (user.id != this.id)
            return;
        await this.setBotDescription(description);
    }
    async getUserProfile(user, lowQuality) {
        const uri = await this.getUserProfileUrl(user, lowQuality);
        return await (0, Generic_1.getImageURL)(uri);
    }
    async getUserProfileUrl(user, lowQuality) {
        try {
            const id = await this.resolveId(user.id);
            if (!id)
                return '';
            return ((await this.sock.profilePictureUrl(id, lowQuality ? 'preview' : 'image')) || '');
        }
        catch (_a) {
            return '';
        }
    }
    async setUserProfile(user, image) {
        if (user.id != this.id)
            return;
        await this.setBotProfile(image);
    }
    async getUser(user) {
        const id = await this.resolveId(user.id);
        if (!id)
            return null;
        const userData = await this.getRecord(`users-${id}`);
        if (!userData)
            return null;
        return User_1.default.fromJSON(userData);
    }
    async getUsers() {
        return (await this.auth.listAll('users-')).map((id) => id.replace('users-', ''));
    }
    async updateUser(user) {
        const id = await this.resolveId(user.id);
        if (!id)
            return;
        user.id = id;
        if ((0, ID_1.isUserJid)(id)) {
            user.phoneNumber = (0, ID_1.getPhoneNumber)(id) || undefined;
            user.lid = this.lidMapper.getLID(id) || user.lid || undefined;
        }
        const userData = await this.getUser(new User_1.default(user.id));
        if (userData != null) {
            user = Object.keys(user).reduce((data, key) => {
                if (user[key] == undefined || user[key] == null)
                    return data;
                if ((0, Generic_1.verifyIsEquals)(user[key], userData[key]))
                    return data;
                return { ...data, [key]: user[key] };
            }, { id: user.id });
            if (Object.keys(user).length < 2)
                return;
        }
        const newUser = User_1.default.fromJSON({ ...(userData || {}), ...user });
        this.setRecord(`users-${user.id}`, newUser.toJSON());
    }
    async setUsers(users) {
        await Promise.all(users.map(async (user) => await this.updateUser(user)));
    }
    async removeUser(user) {
        const id = await this.resolveId(user.id);
        if (!id)
            return;
        this.removeRecord(`users-${id}`);
    }
    async blockUser(user) {
        const id = await this.resolveId(user.id);
        if (!id || id == this.id)
            return;
        await this.sock.updateBlockStatus(id, 'block');
    }
    async unblockUser(user) {
        const id = await this.resolveId(user.id);
        if (!id || id == this.id)
            return;
        await this.sock.updateBlockStatus(id, 'unblock');
    }
    /** Lista os usuários bloqueados (IDs canônicos). */
    async getBlockedUsers() {
        const list = (await this.sock.fetchBlocklist()) || [];
        const result = [];
        for (const id of list) {
            const resolved = await this.resolveId(id);
            if (resolved)
                result.push(resolved);
        }
        return result;
    }
    /**
     * Passa a receber eventos `presence` (digitando, online...) deste chat.
     */
    async subscribePresence(chat) {
        const id = await this.resolveId(chat.id);
        if (!id)
            return;
        await this.sock.presenceSubscribe(id);
    }
    //! ******************************** BOT ********************************
    async getBotName() {
        return await this.getUserName(new User_1.default(this.id));
    }
    async setBotName(name) {
        await this.sock.updateProfileName(name);
    }
    async getBotDescription() {
        return await this.getUserDescription(new User_1.default(this.id));
    }
    async setBotDescription(description) {
        await this.sock.updateProfileStatus(description);
    }
    async getBotProfile(lowQuality) {
        return await this.getUserProfile(new User_1.default(this.id), lowQuality);
    }
    async getBotProfileUrl(lowQuality) {
        return (await this.getUserProfileUrl(new User_1.default(this.id), lowQuality)) || '';
    }
    async setBotProfile(image) {
        await this.sock.updateProfilePicture(this.id, image);
    }
    //! ******************************* MESSAGE *******************************
    /**
     * Chave da mensagem no WhatsApp.
     * Usa a chave original recebida (preserva LID/PN exatamente como o WhatsApp enviou);
     * sem ela, monta a chave a partir dos IDs canônicos.
     */
    async getMessageKey(message) {
        var _a, _b, _c;
        const raw = (_a = message === null || message === void 0 ? void 0 : message.extra) === null || _a === void 0 ? void 0 : _a.key;
        if ((raw === null || raw === void 0 ? void 0 : raw.id) && raw.id == message.id && raw.remoteJid) {
            return {
                remoteJid: raw.remoteJid,
                id: raw.id,
                fromMe: !!raw.fromMe,
                participant: raw.participant || undefined,
            };
        }
        const chatId = await this.resolveId((_b = message === null || message === void 0 ? void 0 : message.chat) === null || _b === void 0 ? void 0 : _b.id);
        if (!chatId || !(message === null || message === void 0 ? void 0 : message.id))
            return null;
        const userId = await this.resolveId((_c = message.user) === null || _c === void 0 ? void 0 : _c.id);
        const fromMe = !!message.fromMe || !userId || userId == this.id;
        return {
            remoteJid: chatId,
            id: message.id,
            fromMe,
            participant: (0, ID_1.isGroupJid)(chatId) && !fromMe ? userId : undefined,
        };
    }
    async readMessage(message) {
        const key = await this.getMessageKey(message);
        if (!key)
            return;
        const chat = await this.getChat(message.chat);
        if (chat != null && chat.unreadCount) {
            await this.updateChat({
                id: chat.id,
                unreadCount: Math.max(chat.unreadCount - 1, 0),
            });
        }
        return await this.sock.readMessages([key]);
    }
    async removeMessage(message) {
        const key = await this.getMessageKey(message);
        if (!key)
            return;
        await this.sock.chatModify({
            deleteForMe: {
                deleteMedia: false,
                key,
                timestamp: Number(message.timestamp || Date.now()),
            },
        }, key.remoteJid);
    }
    async deleteMessage(message) {
        const key = await this.getMessageKey(message);
        if (!key)
            return;
        if (!key.fromMe && (0, ID_1.isGroupJid)(key.remoteJid)) {
            const admins = await this.getChatAdmins(new Chat_1.default(key.remoteJid));
            if (admins.length && !admins.includes(this.id))
                return;
        }
        await this.sock.sendMessage(key.remoteJid, { delete: key });
    }
    /**
     * Fixa ou desafixa uma mensagem no chat.
     * @param duration - Tempo de fixação (24 h, 7 dias ou 30 dias). Use 0 para desafixar.
     */
    async pinMessage(message, duration = 604800) {
        const key = await this.getMessageKey(message);
        if (!key)
            return;
        await this.sock.sendMessage(key.remoteJid, {
            pin: key,
            type: duration ? baileys_1.proto.PinInChat.Type.PIN_FOR_ALL : baileys_1.proto.PinInChat.Type.UNPIN_FOR_ALL,
            ...(duration ? { time: duration } : {}),
        });
    }
    /** Marca ou desmarca uma mensagem com estrela. */
    async starMessage(message, star = true) {
        const key = await this.getMessageKey(message);
        if (!key)
            return;
        await this.sock.star(key.remoteJid, [{ id: key.id, fromMe: !!key.fromMe }], star);
    }
    /**
     * Encaminha uma mensagem recebida ou enviada (precisa estar no cache de mensagens).
     */
    async forwardMessage(chat, message) {
        var _a, _b;
        const target = await this.resolveId(chat.id);
        if (!target)
            throw new Error(`Invalid chat ID: ${chat.id}`);
        const original = this.getCachedWAMessage(((_b = (_a = message.extra) === null || _a === void 0 ? void 0 : _a.key) === null || _b === void 0 ? void 0 : _b.id) || message.id);
        if (!original) {
            throw new Error('A mensagem não está mais disponível para encaminhar.');
        }
        const sent = await this.sock.sendMessage(target, { forward: original });
        this.cacheWAMessage(sent);
        return await new ConvertWAMessage_1.default(this, sent).get();
    }
    async addReaction(message) {
        await this.send(message);
    }
    async removeReaction(message) {
        await this.send(message);
    }
    async editMessage(message) {
        await this.send(message);
    }
    /**
   * Envia mensagem interativa usando baileys_helper
   * @param jid - ID do chat (deve estar normalizado)
   * @param content - Conteúdo da mensagem interativa
   */
    async sendInteractive(jid, content) {
        const target = await this.resolveId(jid);
        if (!target) {
            throw new Error(`Invalid JID: ${jid}`);
        }
        return await (0, baileys_helper_1.sendInteractiveMessage)(this.sock, target, content);
    }
    async send(content) {
        var _a, _b, _c;
        const waMSG = new ConvertToWAMessage_1.default(this, content);
        await waMSG.refactory(content);
        const chatId = waMSG.chatId;
        if (!chatId) {
            throw new Error(`Invalid chat ID: ${(_a = content === null || content === void 0 ? void 0 : content.chat) === null || _a === void 0 ? void 0 : _a.id}`);
        }
        // Se a mensagem usa baileys_helper
        if (waMSG.waMessage.__useBaileysHelper) {
            delete waMSG.waMessage.__useBaileysHelper;
            const sentInteractiveMessage = await (0, baileys_helper_1.sendInteractiveMessage)(this.sock, chatId, waMSG.waMessage);
            this.cacheWAMessage(sentInteractiveMessage);
            return await new ConvertWAMessage_1.default(this, sentInteractiveMessage).get();
        }
        // Lógica normal de envio
        if (waMSG.isRelay) {
            const msgRes = (0, baileys_1.generateWAMessageFromContent)(chatId, waMSG.waMessage, { ...waMSG.options, userJid: this.id });
            await this.sock.relayMessage(chatId, msgRes.message, {
                ...waMSG.options,
                messageId: msgRes.key.id,
            });
            this.cacheWAMessage(msgRes);
            return await new ConvertWAMessage_1.default(this, msgRes).get();
        }
        const sendedMessage = await this.sock.sendMessage(chatId, waMSG.waMessage, waMSG.options);
        if (typeof sendedMessage == 'boolean')
            return content;
        this.cacheWAMessage(sendedMessage);
        const msgRes = (await new ConvertWAMessage_1.default(this, sendedMessage).get()) || content;
        if (messages_1.PollMessage.isValid(msgRes) && messages_1.PollMessage.isValid(content)) {
            msgRes.options = content.options;
            msgRes.secretKey =
                (_c = (_b = sendedMessage === null || sendedMessage === void 0 ? void 0 : sendedMessage.message) === null || _b === void 0 ? void 0 : _b.messageContextInfo) === null || _c === void 0 ? void 0 : _c.messageSecret;
            await this.savePollMessage(msgRes);
        }
        return msgRes;
    }
    addMessageCache(id) {
        this.messagesCached.push(id);
        setTimeout(() => {
            this.messagesCached = this.messagesCached.filter((msgId) => msgId != id);
        }, 1000 * 60);
    }
    async downloadStreamMessage(media) {
        if (this.config.useExperimentalServers) {
            return await this.experimentalDownloadMediaMessage(media);
        }
        const stream = await (0, baileys_1.downloadMediaMessage)(media.stream, 'buffer', {}, {
            logger: this.logger,
            reuploadRequest: (m) => this.sock.updateMediaMessage(m),
        });
        if (stream instanceof stream_1.default.Transform) {
            const buffer = await stream.read();
            return buffer || Buffer.from('');
        }
        return stream;
    }
    async experimentalDownloadMediaMessage(media, maxRetryCount) {
        var _a, _b;
        let count = 0;
        while (count < (maxRetryCount || this.config.maxMsgRetryCount || 5)) {
            try {
                const serverIndex = Math.floor(Math.random() * WAConfigs_1.WA_MEDIA_SERVERS.length);
                const stream = await (0, baileys_1.downloadMediaMessage)(media.stream, 'buffer', {
                    options: {
                        lookup(hostname, options, cb) {
                            cb(null, WAConfigs_1.WA_MEDIA_SERVERS[serverIndex], 4);
                        },
                    },
                }, {
                    logger: this.logger,
                    reuploadRequest: (m) => this.sock.updateMediaMessage(m),
                });
                if (stream instanceof stream_1.default.Transform) {
                    const buffer = await stream.read();
                    return buffer || Buffer.from('');
                }
                return stream;
            }
            catch (error) {
                (_b = (_a = this.logger) === null || _a === void 0 ? void 0 : _a.warn) === null || _b === void 0 ? void 0 : _b.call(_a, `Failed to download media message. Retry count: ${count}`);
                count++;
                if (count >= (maxRetryCount || this.config.maxMsgRetryCount || 5)) {
                    this.emit('error', error);
                }
            }
        }
        throw new Error('Failed to download media message');
    }
    download(message, type, options, ctx) {
        // downloadMediaMessage expects a WAMessage type; cast to any to avoid the WebMessageInfo vs WAMessage type mismatch
        return (0, baileys_1.downloadMediaMessage)(message, type, options, ctx);
    }
    async onExists(id) {
        const normalizedId = await this.resolveId(id);
        if (!normalizedId)
            return { exists: false, id };
        if ((0, ID_1.isLidJid)(normalizedId))
            return { exists: true, id: normalizedId };
        const user = await this.sock.onWhatsApp(normalizedId);
        if (user && user.length > 0) {
            const result = user[0];
            if (result.lid)
                this.lidMapper.register(result.lid, result.jid, true);
            return { exists: !!result.exists, id: (0, ID_1.normalizeJid)(result.jid) || normalizedId };
        }
        return { exists: false, id: normalizedId };
    }
    async updateMediaMessage(message) {
        // Cast to any because Baileys expects a WAMessage type; IWebMessageInfo is compatible at runtime.
        return await this.sock.updateMediaMessage(message);
    }
    async groupAcceptInvite(code) {
        var _a;
        return (await ((_a = this.sock) === null || _a === void 0 ? void 0 : _a.groupAcceptInvite(code))) || '';
    }
    static Browser(plataform, browser, version) {
        const browserAppropriated = baileys_1.Browsers.appropriate(browser || 'Rompot');
        return [
            plataform || browserAppropriated[0],
            browser || browserAppropriated[1],
            version || browserAppropriated[2],
        ];
    }
}
exports.default = WhatsAppBot;
//# sourceMappingURL=WhatsAppBot.js.map