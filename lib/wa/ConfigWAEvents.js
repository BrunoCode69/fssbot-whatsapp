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
const baileys_1 = require("baileys");
const boom_1 = require("@hapi/boom");
const long_1 = __importDefault(require("long"));
const BotStatus_1 = require("../bot/BotStatus");
const ID_1 = require("./ID");
const Call_1 = __importStar(require("../models/Call"));
const Chat_1 = __importDefault(require("../modules/chat/Chat"));
const User_1 = __importDefault(require("../modules/user/User"));
const ChatType_1 = __importDefault(require("../modules/chat/ChatType"));
const ConvertWAMessage_1 = __importDefault(require("./ConvertWAMessage"));
const ErrorMessage_1 = __importDefault(require("../messages/ErrorMessage"));
/** Tipos de protocolo que não representam mensagens para o bot. */
const IGNORED_PROTOCOL_TYPES = new Set([
    baileys_1.proto.Message.ProtocolMessage.Type.EPHEMERAL_SYNC_RESPONSE,
    baileys_1.proto.Message.ProtocolMessage.Type.APP_STATE_SYNC_KEY_SHARE,
    baileys_1.proto.Message.ProtocolMessage.Type.APP_STATE_SYNC_KEY_REQUEST,
    baileys_1.proto.Message.ProtocolMessage.Type.APP_STATE_FATAL_EXCEPTION_NOTIFICATION,
    baileys_1.proto.Message.ProtocolMessage.Type.EPHEMERAL_SETTING,
    baileys_1.proto.Message.ProtocolMessage.Type.HISTORY_SYNC_NOTIFICATION,
    baileys_1.proto.Message.ProtocolMessage.Type.INITIAL_SECURITY_NOTIFICATION_SETTING_SYNC,
]);
const CALL_STATUS = {
    offer: Call_1.CallStatus.Offer,
    ringing: Call_1.CallStatus.Ringing,
    reject: Call_1.CallStatus.Reject,
    accept: Call_1.CallStatus.Accept,
    timeout: Call_1.CallStatus.Timeout,
    terminate: Call_1.CallStatus.Terminate,
};
class ConfigWAEvents {
    constructor(wa) {
        this.wa = wa;
    }
    configureAll() {
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
    async toUser(id) {
        const userId = await this.wa.resolveId(id);
        if (!userId)
            return undefined;
        const stored = await this.wa.getUser(new User_1.default(userId));
        if (stored)
            return stored;
        return User_1.default.fromJSON({
            id: userId,
            phoneNumber: (0, ID_1.getPhoneNumber)(userId),
            lid: this.wa.lidMapper.getLID(userId),
        });
    }
    /** Cria um Chat de grupo com o nome em cache, sem acessar a rede. */
    async toGroupChat(id) {
        const chatId = (0, ID_1.normalizeJid)(id);
        const stored = await this.wa.getChat(new Chat_1.default(chatId));
        if (stored)
            return stored;
        const metadata = this.wa.groupMetadataCache.get(chatId);
        return Chat_1.default.fromJSON({ id: chatId, type: ChatType_1.default.Group, name: metadata === null || metadata === void 0 ? void 0 : metadata.subject });
    }
    configLidMapping() {
        this.wa.sock.ev.on('lid-mapping.update', (mapping) => {
            try {
                this.wa.registerIdentity(mapping === null || mapping === void 0 ? void 0 : mapping.lid, mapping === null || mapping === void 0 ? void 0 : mapping.pn);
            }
            catch (err) {
                this.wa.emit('error', err);
            }
        });
    }
    configGroupParticipants() {
        this.wa.sock.ev.on('group-participants.update', async (update) => {
            try {
                const groupId = (0, ID_1.normalizeJid)(update === null || update === void 0 ? void 0 : update.id);
                if (!groupId || !(0, ID_1.isGroupJid)(groupId))
                    return;
                this.wa.registerIdentity(update.author, update.authorPn, true);
                this.wa.registerParticipants(update.participants);
                this.wa.applyParticipantsUpdate(groupId, (update.participants || []), update.action);
                if (update.action == 'modify')
                    return;
                const authorId = await this.wa.resolveId(update.authorPn || update.author);
                for (const participant of update.participants || []) {
                    try {
                        const participantId = await this.wa.resolveId(participant.phoneNumber || participant.id);
                        if (!participantId)
                            continue;
                        const isSelfAction = !authorId || authorId == participantId;
                        const action = update.action == 'add'
                            ? isSelfAction ? 'join' : 'add'
                            : update.action == 'remove'
                                ? isSelfAction ? 'leave' : 'remove'
                                : update.action;
                        await this.wa.groupParticipantsUpdate(action, groupId, participantId, authorId || participantId);
                    }
                    catch (err) {
                        this.wa.emit('error', err);
                    }
                }
            }
            catch (err) {
                this.wa.emit('error', err);
            }
        });
    }
    configGroupJoinRequest() {
        this.wa.sock.ev.on('group.join-request', async (update) => {
            try {
                const groupId = (0, ID_1.normalizeJid)(update === null || update === void 0 ? void 0 : update.id);
                if (!groupId || !(0, ID_1.isGroupJid)(groupId))
                    return;
                this.wa.registerIdentity(update.participant, update.participantPn, true);
                this.wa.registerIdentity(update.author, update.authorPn, true);
                const user = await this.toUser(update.participantPn || update.participant);
                if (!user)
                    return;
                const fromUser = await this.toUser(update.authorPn || update.author);
                this.wa.emit('group-join-request', {
                    action: update.action,
                    method: update.method || undefined,
                    chat: await this.toGroupChat(groupId),
                    user,
                    fromUser: fromUser && fromUser.id != user.id ? fromUser : undefined,
                });
            }
            catch (err) {
                this.wa.emit('error', err);
            }
        });
    }
    async readMessages(messages, type = 'notify') {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r;
        try {
            for (const message of messages || []) {
                try {
                    if (!(message === null || message === void 0 ? void 0 : message.key))
                        continue;
                    if (message.key.remoteJid == 'status@broadcast')
                        continue;
                    const normalizedContent = (0, baileys_1.normalizeMessageContent)(message.message);
                    const incomingContentType = (0, baileys_1.getContentType)(normalizedContent);
                    const incomingPollUpdate = normalizedContent === null || normalizedContent === void 0 ? void 0 : normalizedContent.pollUpdateMessage;
                    const isPollUpdate = incomingContentType === 'pollUpdateMessage' || Boolean(incomingPollUpdate);
                    if (isPollUpdate) {
                        console.info('[Rompot poll] raw vote update received', {
                            upsertType: type,
                            eventMessageId: message.key.id,
                            chatId: message.key.remoteJid,
                            contentType: incomingContentType,
                            pollCreationMessageId: (_a = incomingPollUpdate === null || incomingPollUpdate === void 0 ? void 0 : incomingPollUpdate.pollCreationMessageKey) === null || _a === void 0 ? void 0 : _a.id,
                            hasVotePayload: Boolean(((_c = (_b = incomingPollUpdate === null || incomingPollUpdate === void 0 ? void 0 : incomingPollUpdate.vote) === null || _b === void 0 ? void 0 : _b.encPayload) === null || _c === void 0 ? void 0 : _c.length) && ((_e = (_d = incomingPollUpdate === null || incomingPollUpdate === void 0 ? void 0 : incomingPollUpdate.vote) === null || _d === void 0 ? void 0 : _d.encIv) === null || _e === void 0 ? void 0 : _e.length)),
                            hasParticipant: Boolean(message.key.participant || message.participant),
                            hasAlternateParticipant: Boolean(message.key.participantAlt || message.participantAlt),
                            fromMe: Boolean(message.key.fromMe),
                        });
                    }
                    if (!message.message) {
                        if (!(message.messageStubType ==
                            baileys_1.proto.WebMessageInfo.StubType.CIPHERTEXT)) {
                            continue; // Not read other null messages
                        }
                        const msgRetryCount = (_f = this.wa.config.msgRetryCounterCache) === null || _f === void 0 ? void 0 : _f.get(message.key.id);
                        if (msgRetryCount != this.wa.config.maxMsgRetryCount) {
                            const time = this.wa.config.retryRequestDelayMs || 1000;
                            await new Promise((res) => setTimeout(res, time * 3));
                            const newMsgRetryCount = (_g = this.wa.config.msgRetryCounterCache) === null || _g === void 0 ? void 0 : _g.get(message.key.id);
                            if (!this.wa.config.readAllFailedMessages) {
                                if (msgRetryCount &&
                                    newMsgRetryCount &&
                                    msgRetryCount != newMsgRetryCount) {
                                    continue; // Not read duplicated failed message
                                }
                            }
                        }
                    }
                    const protocolType = (_j = (_h = message.message) === null || _h === void 0 ? void 0 : _h.protocolMessage) === null || _j === void 0 ? void 0 : _j.type;
                    if (protocolType != null && IGNORED_PROTOCOL_TYPES.has(protocolType)) {
                        continue; // Not read empty messages
                    }
                    if (this.wa.messagesCached.includes(message.key.id)) {
                        if (isPollUpdate) {
                            console.warn('[Rompot poll] raw vote update skipped as duplicate', {
                                eventMessageId: message.key.id,
                                pollCreationMessageId: (_k = incomingPollUpdate === null || incomingPollUpdate === void 0 ? void 0 : incomingPollUpdate.pollCreationMessageKey) === null || _k === void 0 ? void 0 : _k.id,
                            });
                        }
                        continue;
                    }
                    this.wa.addMessageCache(message.key.id);
                    this.wa.cacheWAMessage(message);
                    const msg = await new ConvertWAMessage_1.default(this.wa, message, type).get();
                    let timestamp;
                    if (message.messageTimestamp) {
                        if (long_1.default.isLong(message.messageTimestamp)) {
                            timestamp = message.messageTimestamp.toNumber() * 1000;
                        }
                        else {
                            timestamp = message.messageTimestamp * 1000;
                        }
                    }
                    const chat = await this.wa.getChat(new Chat_1.default(msg.chat.id));
                    const pushName = message.pushName || message.verifiedBizName || undefined;
                    await this.wa.updateChat({
                        id: msg.chat.id,
                        unreadCount: message.key.fromMe ? chat === null || chat === void 0 ? void 0 : chat.unreadCount : ((chat === null || chat === void 0 ? void 0 : chat.unreadCount) || 0) + 1,
                        timestamp,
                        name: !(0, ID_1.isGroupJid)(msg.chat.id) && !message.key.fromMe ? pushName : undefined,
                    });
                    if ((0, ID_1.isUserJid)(msg.user.id)) {
                        await this.wa.updateUser({
                            id: msg.user.id,
                            name: message.key.fromMe ? undefined : pushName,
                        });
                    }
                    if (isPollUpdate) {
                        console.info('[Rompot poll] adapter emitted vote event', {
                            type: msg.type,
                            eventMessageId: msg.id,
                            chatId: (_l = msg.chat) === null || _l === void 0 ? void 0 : _l.id,
                            pollCreationMessageId: (_m = msg.extra) === null || _m === void 0 ? void 0 : _m.pollCreationMessageId,
                            action: msg.action,
                            selected: msg.selected,
                            text: msg.text,
                            voterIdPresent: Boolean((_o = msg.user) === null || _o === void 0 ? void 0 : _o.id),
                        });
                    }
                    if (msg.fromMe && msg.isUnofficial) {
                        await this.wa.updateChat({ id: msg.chat.id, unreadCount: 0 });
                    }
                    this.wa.emit('message', msg);
                }
                catch (err) {
                    const normalizedContent = (0, baileys_1.normalizeMessageContent)(message === null || message === void 0 ? void 0 : message.message);
                    const failedPollUpdate = normalizedContent === null || normalizedContent === void 0 ? void 0 : normalizedContent.pollUpdateMessage;
                    if (failedPollUpdate) {
                        console.error('[Rompot poll] raw vote update conversion failed', {
                            eventMessageId: (_p = message === null || message === void 0 ? void 0 : message.key) === null || _p === void 0 ? void 0 : _p.id,
                            pollCreationMessageId: (_q = failedPollUpdate.pollCreationMessageKey) === null || _q === void 0 ? void 0 : _q.id,
                            error: err instanceof Error ? err.message : String(err),
                        });
                    }
                    this.wa.emit('message', new ErrorMessage_1.default(this.wa.canonicalId(((_r = message === null || message === void 0 ? void 0 : message.key) === null || _r === void 0 ? void 0 : _r.remoteJid) || ''), err && err instanceof Error
                        ? err
                        : new Error(JSON.stringify(err))));
                }
            }
        }
        catch (err) {
            this.wa.emit('error', err);
        }
    }
    configMessagesUpsert() {
        this.wa.sock.ev.on('messages.upsert', async (m) => {
            try {
                await this.readMessages((m === null || m === void 0 ? void 0 : m.messages) || [], m.type);
            }
            catch (err) {
                this.wa.emit('error', err);
            }
        });
    }
    configMessagesUpdate() {
        this.wa.sock.ev.on('messages.update', async (messages) => {
            var _a, _b, _c;
            try {
                for (const message of messages || []) {
                    try {
                        if (message.key.remoteJid == 'status@broadcast')
                            continue;
                        if ((_a = message.update) === null || _a === void 0 ? void 0 : _a.message) {
                            await this.readMessages([{ key: message.key, ...message.update }]);
                        }
                        if (!((_b = message === null || message === void 0 ? void 0 : message.update) === null || _b === void 0 ? void 0 : _b.status))
                            continue;
                        const msg = await new ConvertWAMessage_1.default(this.wa, message).get();
                        msg.isUpdate = true;
                        this.wa.emit('message', msg);
                    }
                    catch (err) {
                        this.wa.emit('message', new ErrorMessage_1.default(this.wa.canonicalId(((_c = message === null || message === void 0 ? void 0 : message.key) === null || _c === void 0 ? void 0 : _c.remoteJid) || ''), err && err instanceof Error
                            ? err
                            : new Error(JSON.stringify(err))));
                    }
                }
            }
            catch (err) {
                this.wa.emit('error', err);
            }
        });
    }
    configConnectionUpdate() {
        this.wa.sock.ev.on('connection.update', async (update) => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r;
            try {
                this.wa.connectionListeners = this.wa.connectionListeners.filter((listener) => !listener(update));
                if (update.connection == 'connecting') {
                    this.wa.lastConnectionUpdateDate = Date.now();
                    this.wa.status = BotStatus_1.BotStatus.Offline;
                    this.wa.emit('connecting', { action: 'connecting' });
                }
                if (update.qr) {
                    this.wa.emit('qr', update.qr);
                }
                if (update.connection == 'open') {
                    const uptime = Date.now();
                    this.wa.lastConnectionUpdateDate = uptime;
                    this.wa.status = BotStatus_1.BotStatus.Online;
                    this.wa.id = (0, ID_1.normalizeJid)(((_b = (_a = this.wa.sock) === null || _a === void 0 ? void 0 : _a.user) === null || _b === void 0 ? void 0 : _b.id) || '');
                    this.wa.lid = (0, ID_1.normalizeJid)(((_d = (_c = this.wa.sock) === null || _c === void 0 ? void 0 : _c.user) === null || _d === void 0 ? void 0 : _d.lid) || '');
                    this.wa.phoneNumber = (0, ID_1.getPhoneNumber)(this.wa.id);
                    this.wa.name =
                        ((_f = (_e = this.wa.sock) === null || _e === void 0 ? void 0 : _e.user) === null || _f === void 0 ? void 0 : _f.name) ||
                            ((_h = (_g = this.wa.sock) === null || _g === void 0 ? void 0 : _g.user) === null || _h === void 0 ? void 0 : _h.notify) ||
                            ((_k = (_j = this.wa.sock) === null || _j === void 0 ? void 0 : _j.user) === null || _k === void 0 ? void 0 : _k.verifiedName) ||
                            '';
                    this.wa.profileUrl = ((_m = (_l = this.wa.sock) === null || _l === void 0 ? void 0 : _l.user) === null || _m === void 0 ? void 0 : _m.imgUrl) || '';
                    if (this.wa.lid)
                        this.wa.registerIdentity(this.wa.lid, this.wa.id);
                    this.wa.readUser({ id: this.wa.id }, {
                        notify: this.wa.name || undefined,
                        imgUrl: this.wa.profileUrl || undefined,
                    });
                    this.wa.readChat({ id: this.wa.id }, { subject: this.wa.name || undefined });
                    this.wa.emit('open', { isNewLogin: update.isNewLogin || false });
                    setTimeout(async () => {
                        try {
                            if (this.wa.lastConnectionUpdateDate != uptime)
                                return;
                            await this.wa.reconnect(true, false);
                        }
                        catch (error) {
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
                        if (this.wa.sock.ws.isOpen)
                            return;
                        this.wa.sock.ev.emit('connection.update', {
                            connection: 'close',
                            lastDisconnect: {
                                date: new Date(),
                                error: new boom_1.Boom('Socket closed', {
                                    statusCode: baileys_1.DisconnectReason.connectionClosed,
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
                    this.wa.status = BotStatus_1.BotStatus.Offline;
                    const status = ((_q = (_p = (_o = update.lastDisconnect) === null || _o === void 0 ? void 0 : _o.error) === null || _p === void 0 ? void 0 : _p.output) === null || _q === void 0 ? void 0 : _q.statusCode) ||
                        ((_r = update.lastDisconnect) === null || _r === void 0 ? void 0 : _r.error) ||
                        500;
                    if (this.wa.checkConnectionInterval !== null) {
                        clearInterval(this.wa.checkConnectionInterval);
                        this.wa.checkConnectionInterval = null;
                    }
                    await this.wa.flushRecords();
                    if (status === baileys_1.DisconnectReason.loggedOut) {
                        this.wa.emit('stop', { isLogout: true });
                    }
                    else if (status === 402) {
                        this.wa.emit('stop', { isLogout: false });
                    }
                    else if (status == baileys_1.DisconnectReason.restartRequired) {
                        await this.wa.saveCreds(this.wa.sock.authState.creds);
                        await this.wa.reconnect(true, true);
                    }
                    else {
                        this.wa.emit('close', { reason: status });
                    }
                }
            }
            catch (err) {
                this.wa.emit('error', err);
            }
        });
    }
    configHistorySet() {
        const ignoreChats = [];
        this.wa.sock.ev.on('messaging-history.set', async (update) => {
            var _a, _b, _c;
            // Os pares LID ↔ PN e os contatos do histórico sempre ajudam a manter IDs únicos
            for (const mapping of (update === null || update === void 0 ? void 0 : update.lidPnMappings) || []) {
                this.wa.registerIdentity(mapping.lid, mapping.pn);
            }
            for (const contact of (update === null || update === void 0 ? void 0 : update.contacts) || []) {
                this.wa.registerIdentity(contact.id, contact.phoneNumber);
                this.wa.registerIdentity(contact.id, contact.lid);
            }
            if (!this.wa.config.autoSyncHistory)
                return;
            for (const chat of update.chats || []) {
                try {
                    if (!('unreadCount' in chat) || chat.isDefaultSubgroup === true) {
                        ignoreChats.push((0, ID_1.normalizeJid)(chat.id));
                        continue;
                    }
                    const isGroup = (0, ID_1.isGroupJid)(chat.id);
                    if (!('pinned' in chat) || isGroup) {
                        if (!isGroup) {
                            ignoreChats.push((0, ID_1.normalizeJid)(chat.id));
                            continue;
                        }
                        if (!('endOfHistoryTransferType' in chat) &&
                            !('isDefaultSubgroup' in chat)) {
                            ignoreChats.push((0, ID_1.normalizeJid)(chat.id));
                            continue;
                        }
                    }
                    if ((((_a = chat.participant) === null || _a === void 0 ? void 0 : _a.length) || 0) > 0) {
                        if (!((_b = chat.participant) === null || _b === void 0 ? void 0 : _b.some((p) => this.wa.lidMapper.isSameUser(p.userJid, this.wa.id)))) {
                            ignoreChats.push((0, ID_1.normalizeJid)(chat.id));
                            continue;
                        }
                    }
                    const autoLoad = isGroup
                        ? this.wa.config.autoLoadGroupInfo
                        : this.wa.config.autoLoadContactInfo;
                    if (autoLoad) {
                        await this.wa.readChat({ id: chat.id }, chat);
                    }
                }
                catch (err) {
                    this.wa.emit('error', err);
                }
            }
            for (const message of (update === null || update === void 0 ? void 0 : update.messages) || []) {
                try {
                    if (!(message === null || message === void 0 ? void 0 : message.message) || message.key.remoteJid == 'status@broadcast')
                        continue;
                    if (ignoreChats.includes((0, ID_1.normalizeJid)(message.key.remoteJid || '')))
                        continue;
                    this.wa.cacheWAMessage(message);
                    const msg = await new ConvertWAMessage_1.default(this.wa, message).get();
                    msg.isOld = true;
                    this.wa.emit('message', msg);
                }
                catch (err) {
                    const msg = new ErrorMessage_1.default(this.wa.canonicalId(((_c = message === null || message === void 0 ? void 0 : message.key) === null || _c === void 0 ? void 0 : _c.remoteJid) || ''), err && err instanceof Error ? err : new Error(JSON.stringify(err)));
                    msg.isOld = true;
                    this.wa.emit('message', msg);
                }
            }
        });
    }
    async handleContacts(updates) {
        for (const update of updates || []) {
            try {
                if (!(update === null || update === void 0 ? void 0 : update.id))
                    continue;
                this.wa.registerIdentity(update.id, update.phoneNumber);
                this.wa.registerIdentity(update.id, update.lid);
                if (!this.wa.config.autoLoadContactInfo)
                    continue;
                if ((0, ID_1.isGroupJid)(update.id)) {
                    await this.wa.readChat({ id: update.id }, update);
                }
                else {
                    await this.wa.readUser({ id: update.phoneNumber || update.id }, update);
                }
            }
            catch (err) {
                this.wa.emit('error', err);
            }
        }
    }
    configContactsUpdate() {
        this.wa.sock.ev.on('contacts.update', (updates) => this.handleContacts(updates));
    }
    configContactsUpsert() {
        this.wa.sock.ev.on('contacts.upsert', (updates) => this.handleContacts(updates));
    }
    configGroupsUpsert() {
        this.wa.sock.ev.on('groups.upsert', async (groups) => {
            for (const metadata of groups || []) {
                try {
                    this.wa.setGroupMetadata(metadata);
                    await this.wa.readChat({ id: metadata.id }, metadata, false);
                }
                catch (err) {
                    this.wa.emit('error', err);
                }
            }
        });
    }
    configGroupsUpdate() {
        this.wa.sock.ev.on('groups.update', async (updates) => {
            for (const update of updates) {
                try {
                    if (!(update === null || update === void 0 ? void 0 : update.id))
                        continue;
                    const groupId = (0, ID_1.normalizeJid)(update.id);
                    const cached = this.wa.groupMetadataCache.get(groupId);
                    if (cached) {
                        this.wa.setGroupMetadata({ ...cached, ...update, participants: cached.participants });
                    }
                    const changes = {};
                    if (update.subject !== undefined)
                        changes.name = update.subject;
                    if (update.desc !== undefined)
                        changes.description = update.desc;
                    if (update.announce !== undefined)
                        changes.announce = !!update.announce;
                    if (update.restrict !== undefined)
                        changes.restrict = !!update.restrict;
                    if (update.inviteCode !== undefined)
                        changes.inviteCode = update.inviteCode;
                    if (update.memberAddMode !== undefined)
                        changes.memberAddMode = !!update.memberAddMode;
                    if (update.joinApprovalMode !== undefined)
                        changes.joinApprovalMode = !!update.joinApprovalMode;
                    if (update.ephemeralDuration !== undefined)
                        changes.ephemeralDuration = Number(update.ephemeralDuration) || 0;
                    const stored = await this.wa.getChat(new Chat_1.default(groupId));
                    if (this.wa.config.autoLoadGroupInfo || stored) {
                        await this.wa.readChat({ id: groupId }, update, stored == null);
                    }
                    const actions = Object.keys(changes);
                    if (actions.length) {
                        this.wa.registerIdentity(update.author, update.authorPn, true);
                        this.wa.emit('group-update', {
                            action: actions[0],
                            changes,
                            chat: await this.toGroupChat(groupId),
                            fromUser: await this.toUser(update.authorPn || update.author),
                        });
                    }
                }
                catch (err) {
                    this.wa.emit('error', err);
                }
            }
        });
    }
    configChatsDelete() {
        this.wa.sock.ev.on('chats.delete', async (deletions) => {
            for (const id of deletions) {
                try {
                    await this.wa.removeChat(new Chat_1.default(id));
                }
                catch (err) {
                    this.wa.emit('error', err);
                }
            }
        });
    }
    configPresence() {
        this.wa.sock.ev.on('presence.update', async (update) => {
            try {
                const chatId = await this.wa.resolveId(update === null || update === void 0 ? void 0 : update.id);
                if (!chatId)
                    return;
                const chat = (0, ID_1.isGroupJid)(chatId)
                    ? await this.toGroupChat(chatId)
                    : (await this.wa.getChat(new Chat_1.default(chatId))) || new Chat_1.default(chatId);
                for (const [participant, data] of Object.entries(update.presences || {})) {
                    const user = await this.toUser(participant);
                    if (!user || user.id == this.wa.id)
                        continue;
                    this.wa.emit('presence', {
                        chat,
                        user,
                        status: ((data === null || data === void 0 ? void 0 : data.lastKnownPresence) || 'available'),
                        lastSeen: (data === null || data === void 0 ? void 0 : data.lastSeen) ? Number(data.lastSeen) * 1000 : undefined,
                    });
                }
            }
            catch (err) {
                this.wa.emit('error', err);
            }
        });
    }
    configBlocklist() {
        const emitBlocklist = async (action, list) => {
            const users = [];
            for (const id of list || []) {
                const resolved = await this.wa.resolveId(id);
                if (resolved)
                    users.push(resolved);
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
    configCall() {
        this.wa.sock.ev.on('call', async (events) => {
            for (const event of events || []) {
                try {
                    this.wa.registerIdentity(event.from, event.callerPn, true);
                    const userId = await this.wa.resolveId(event.callerPn || event.from);
                    const chatId = event.isGroup && event.groupJid
                        ? (0, ID_1.normalizeJid)(event.groupJid)
                        : await this.wa.resolveId(event.callerPn || event.chatId || event.from);
                    const status = CALL_STATUS[event.status] || Call_1.CallStatus.Ringing;
                    const user = (await this.toUser(userId)) || userId;
                    const call = new Call_1.default(event.id, chatId || userId, user, status, {
                        date: event.date || new Date(),
                        isVideo: !!event.isVideo,
                        offline: !!event.offline,
                        latencyMs: event.latencyMs || 1,
                        isGroup: !!event.isGroup,
                        extra: { from: event.from, chatId: event.chatId, groupJid: event.groupJid },
                    });
                    this.wa.emit('call', call);
                }
                catch (err) {
                    this.wa.emit('error', err);
                }
            }
        });
    }
}
exports.default = ConfigWAEvents;
//# sourceMappingURL=ConfigWAEvents.js.map