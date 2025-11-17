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
const ConvertWAMessage_1 = __importDefault(require("./ConvertWAMessage"));
const ErrorMessage_1 = __importDefault(require("../messages/ErrorMessage"));
class ConfigWAEvents {
    constructor(wa) {
        this.wa = wa;
    }
    configureAll() {
        this.configConnectionUpdate();
        this.configHistorySet();
        this.configContactsUpsert();
        this.configContactsUpdate();
        this.configChatsDelete();
        this.configGroupsUpdate();
        this.configMessagesUpsert();
        this.configMessagesUpdate();
        this.configCall();
        this.configCBNotifications();
    }
    configCBNotifications() {
        this.configCBNotificationRemove();
        this.configCBNotificationAdd();
        this.configCBNotificationPromote();
        this.configCBNotificationDemote();
    }
    configCBNotificationRemove() {
        this.wa.sock.ws.on('CB:notification,,remove', async (data) => {
            var _a;
            for (const content of ((_a = data.content[0]) === null || _a === void 0 ? void 0 : _a.content) || []) {
                try {
                    await this.wa.groupParticipantsUpdate(content.attrs.jid == data.attrs.participant ? 'leave' : 'remove', data.attrs.from, content.attrs.jid, data.attrs.participant);
                }
                catch (err) {
                    this.wa.emit('error', err);
                }
            }
        });
    }
    configCBNotificationAdd() {
        this.wa.sock.ws.on('CB:notification,,add', async (data) => {
            var _a;
            for (const content of ((_a = data.content[0]) === null || _a === void 0 ? void 0 : _a.content) || []) {
                try {
                    if (!data.attrs.participant)
                        data.attrs.participant = content.attrs.jid;
                    await this.wa.groupParticipantsUpdate(content.attrs.jid == data.attrs.participant ? 'join' : 'add', data.attrs.from, content.attrs.jid, data.attrs.participant);
                }
                catch (err) {
                    this.wa.emit('error', err);
                }
            }
        });
    }
    configCBNotificationPromote() {
        this.wa.sock.ws.on('CB:notification,,promote', async (data) => {
            var _a;
            for (const content of ((_a = data.content[0]) === null || _a === void 0 ? void 0 : _a.content) || []) {
                try {
                    await this.wa.groupParticipantsUpdate('promote', data.attrs.from, content.attrs.jid, data.attrs.participant);
                }
                catch (err) {
                    this.wa.emit('error', err);
                }
            }
        });
    }
    configCBNotificationDemote() {
        this.wa.sock.ws.on('CB:notification,,demote', async (data) => {
            var _a;
            for (const content of ((_a = data.content[0]) === null || _a === void 0 ? void 0 : _a.content) || []) {
                try {
                    await this.wa.groupParticipantsUpdate('demote', data.attrs.from, content.attrs.jid, data.attrs.participant);
                }
                catch (err) {
                    this.wa.emit('error', err);
                }
            }
        });
    }
    async readMessages(messages, type = 'notify') {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t;
        try {
            for (const message of messages || []) {
                try {
                    if (!message)
                        return;
                    if (message.key.remoteJid == 'status@broadcast')
                        return;
                    if (!message.message) {
                        if (!(message.messageStubType ==
                            baileys_1.proto.WebMessageInfo.StubType.CIPHERTEXT)) {
                            return; // Not read other null messages
                        }
                        const msgRetryCount = (_a = this.wa.config.msgRetryCounterCache) === null || _a === void 0 ? void 0 : _a.get(message.key.id);
                        if (msgRetryCount != this.wa.config.maxMsgRetryCount) {
                            const time = this.wa.config.retryRequestDelayMs || 1000;
                            await new Promise((res) => setTimeout(res, time * 3));
                            const newMsgRetryCount = (_b = this.wa.config.msgRetryCounterCache) === null || _b === void 0 ? void 0 : _b.get(message.key.id);
                            if (!this.wa.config.readAllFailedMessages) {
                                if (msgRetryCount &&
                                    newMsgRetryCount &&
                                    msgRetryCount != newMsgRetryCount) {
                                    return; // Not read duplicated failed message
                                }
                            }
                        }
                    }
                    if (((_d = (_c = message.message) === null || _c === void 0 ? void 0 : _c.protocolMessage) === null || _d === void 0 ? void 0 : _d.type) ==
                        baileys_1.proto.Message.ProtocolMessage.Type.EPHEMERAL_SYNC_RESPONSE ||
                        ((_f = (_e = message.message) === null || _e === void 0 ? void 0 : _e.protocolMessage) === null || _f === void 0 ? void 0 : _f.type) ==
                            baileys_1.proto.Message.ProtocolMessage.Type.APP_STATE_SYNC_KEY_SHARE ||
                        ((_h = (_g = message.message) === null || _g === void 0 ? void 0 : _g.protocolMessage) === null || _h === void 0 ? void 0 : _h.type) ==
                            baileys_1.proto.Message.ProtocolMessage.Type.APP_STATE_SYNC_KEY_REQUEST ||
                        ((_k = (_j = message.message) === null || _j === void 0 ? void 0 : _j.protocolMessage) === null || _k === void 0 ? void 0 : _k.type) ==
                            baileys_1.proto.Message.ProtocolMessage.Type
                                .APP_STATE_FATAL_EXCEPTION_NOTIFICATION ||
                        ((_m = (_l = message.message) === null || _l === void 0 ? void 0 : _l.protocolMessage) === null || _m === void 0 ? void 0 : _m.type) ==
                            baileys_1.proto.Message.ProtocolMessage.Type.EPHEMERAL_SETTING ||
                        ((_p = (_o = message.message) === null || _o === void 0 ? void 0 : _o.protocolMessage) === null || _p === void 0 ? void 0 : _p.type) ==
                            baileys_1.proto.Message.ProtocolMessage.Type.HISTORY_SYNC_NOTIFICATION ||
                        ((_r = (_q = message.message) === null || _q === void 0 ? void 0 : _q.protocolMessage) === null || _r === void 0 ? void 0 : _r.type) ==
                            baileys_1.proto.Message.ProtocolMessage.Type
                                .INITIAL_SECURITY_NOTIFICATION_SETTING_SYNC) {
                        return; // Not read empty messages
                    }
                    if (this.wa.messagesCached.includes(message.key.id))
                        return;
                    this.wa.addMessageCache(message.key.id);
                    const chatId = (0, ID_1.fixID)(message.key.remoteJid || this.wa.id);
                    const chat = await this.wa.getChat(new Chat_1.default(chatId));
                    let timestamp;
                    if (message.messageTimestamp) {
                        if (long_1.default.isLong(message.messageTimestamp)) {
                            timestamp = message.messageTimestamp.toNumber() * 1000;
                        }
                        else {
                            timestamp = message.messageTimestamp * 1000;
                        }
                    }
                    await this.wa.updateChat({
                        id: chatId,
                        unreadCount: ((chat === null || chat === void 0 ? void 0 : chat.unreadCount) || 0) + 1,
                        timestamp,
                        name: ((_s = message.key.id) === null || _s === void 0 ? void 0 : _s.includes('@s')) && !message.key.fromMe
                            ? message.pushName || message.verifiedBizName || undefined
                            : undefined,
                    });
                    const userId = (0, ID_1.fixID)(message.key.fromMe
                        ? this.wa.id
                        : message.key.participant ||
                            message.participant ||
                            message.key.remoteJid ||
                            '');
                    await this.wa.updateUser({
                        id: userId,
                        name: message.pushName || message.verifiedBizName || undefined,
                    });
                    const msg = await new ConvertWAMessage_1.default(this.wa, message, type).get();
                    if (msg.fromMe && msg.isUnofficial) {
                        await this.wa.updateChat({ id: msg.chat.id, unreadCount: 0 });
                    }
                    this.wa.emit('message', msg);
                }
                catch (err) {
                    this.wa.emit('message', new ErrorMessage_1.default((0, ID_1.fixID)(((_t = message === null || message === void 0 ? void 0 : message.key) === null || _t === void 0 ? void 0 : _t.remoteJid) || ''), err && err instanceof Error
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
            var _a, _b;
            try {
                for (const message of messages || []) {
                    try {
                        if (message.key.remoteJid == 'status@broadcast')
                            return;
                        await this.readMessages([{ key: message.key, ...message.update }]);
                        if (!((_a = message === null || message === void 0 ? void 0 : message.update) === null || _a === void 0 ? void 0 : _a.status))
                            return;
                        const msg = await new ConvertWAMessage_1.default(this.wa, message).get();
                        msg.isUpdate = true;
                        this.wa.emit('message', msg);
                    }
                    catch (err) {
                        this.wa.emit('message', new ErrorMessage_1.default((0, ID_1.fixID)(((_b = message === null || message === void 0 ? void 0 : message.key) === null || _b === void 0 ? void 0 : _b.remoteJid) || ''), err && err instanceof Error
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
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
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
                    this.wa.id = (0, ID_1.fixID)(((_b = (_a = this.wa.sock) === null || _a === void 0 ? void 0 : _a.user) === null || _b === void 0 ? void 0 : _b.id) || '');
                    this.wa.phoneNumber = (0, ID_1.getPhoneNumber)(this.wa.id);
                    this.wa.name =
                        ((_d = (_c = this.wa.sock) === null || _c === void 0 ? void 0 : _c.user) === null || _d === void 0 ? void 0 : _d.name) ||
                            ((_f = (_e = this.wa.sock) === null || _e === void 0 ? void 0 : _e.user) === null || _f === void 0 ? void 0 : _f.notify) ||
                            ((_h = (_g = this.wa.sock) === null || _g === void 0 ? void 0 : _g.user) === null || _h === void 0 ? void 0 : _h.verifiedName) ||
                            '';
                    this.wa.profileUrl = ((_k = (_j = this.wa.sock) === null || _j === void 0 ? void 0 : _j.user) === null || _k === void 0 ? void 0 : _k.imgUrl) || '';
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
                    await this.wa.sock.groupFetchAllParticipating();
                }
                if (update.connection == 'close') {
                    this.wa.lastConnectionUpdateDate = Date.now();
                    this.wa.status = BotStatus_1.BotStatus.Offline;
                    const status = ((_o = (_m = (_l = update.lastDisconnect) === null || _l === void 0 ? void 0 : _l.error) === null || _m === void 0 ? void 0 : _m.output) === null || _o === void 0 ? void 0 : _o.statusCode) ||
                        ((_p = update.lastDisconnect) === null || _p === void 0 ? void 0 : _p.error) ||
                        500;
                    if (this.wa.checkConnectionInterval !== null) {
                        clearInterval(this.wa.checkConnectionInterval);
                        this.wa.checkConnectionInterval = null;
                    }
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
            if (!this.wa.config.autoSyncHistory)
                return;
            for (const chat of update.chats || []) {
                try {
                    if (!('unreadCount' in chat) || chat.isDefaultSubgroup === true) {
                        ignoreChats.push(chat.id);
                        continue;
                    }
                    const isGroup = (0, baileys_1.isJidGroup)(chat.id);
                    if (!('pinned' in chat) || isGroup) {
                        if (!isGroup) {
                            ignoreChats.push(chat.id);
                            continue;
                        }
                        if (!('endOfHistoryTransferType' in chat) &&
                            !('isDefaultSubgroup' in chat)) {
                            ignoreChats.push(chat.id);
                            continue;
                        }
                    }
                    if ((((_a = chat.participant) === null || _a === void 0 ? void 0 : _a.length) || 0) > 0) {
                        if (!((_b = chat.participant) === null || _b === void 0 ? void 0 : _b.some((p) => p.userJid == this.wa.id))) {
                            ignoreChats.push(chat.id);
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
                    if (ignoreChats.includes((0, ID_1.fixID)(message.key.remoteJid || '')))
                        continue;
                    const msg = await new ConvertWAMessage_1.default(this.wa, message).get();
                    msg.isOld = true;
                    this.wa.emit('message', msg);
                }
                catch (err) {
                    const msg = new ErrorMessage_1.default((0, ID_1.fixID)(((_c = message === null || message === void 0 ? void 0 : message.key) === null || _c === void 0 ? void 0 : _c.remoteJid) || ''), err && err instanceof Error ? err : new Error(JSON.stringify(err)));
                    msg.isOld = true;
                    this.wa.emit('message', msg);
                }
            }
        });
    }
    configContactsUpdate() {
        this.wa.sock.ev.on('contacts.update', async (updates) => {
            if (!this.wa.config.autoLoadContactInfo)
                return;
            for (const update of updates) {
                try {
                    if ((0, baileys_1.isJidGroup)(update.id)) {
                        await this.wa.readChat({ id: update.id }, update);
                    }
                    else {
                        await this.wa.readUser({ id: update.id }, update);
                    }
                }
                catch (err) {
                    this.wa.emit('error', err);
                }
            }
        });
    }
    configContactsUpsert() {
        this.wa.sock.ev.on('contacts.upsert', async (updates) => {
            if (!this.wa.config.autoLoadContactInfo)
                return;
            for (const update of updates) {
                try {
                    if ((0, baileys_1.isJidGroup)(update.id)) {
                        await this.wa.readChat({ id: update.id }, update);
                    }
                    else {
                        await this.wa.readUser({ id: update.id }, update);
                    }
                }
                catch (err) {
                    this.wa.emit('error', err);
                }
            }
        });
    }
    configGroupsUpdate() {
        this.wa.sock.ev.on('groups.update', async (updates) => {
            if (!this.wa.config.autoLoadGroupInfo)
                return;
            for (const update of updates) {
                try {
                    if (!(update === null || update === void 0 ? void 0 : update.id))
                        continue;
                    const chat = await this.wa.getChat(new Chat_1.default(update.id));
                    if (chat == null) {
                        await this.wa.readChat({ id: update.id }, update, true);
                    }
                    else {
                        await this.wa.readChat({ id: update.id }, update, false);
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
    configCall() {
        this.wa.sock.ev.on('call', async (events) => {
            for (const event of events || []) {
                try {
                    const chat = event.chatId || event.groupJid || event.from || '';
                    let status;
                    switch (event.status) {
                        case 'offer':
                            status = Call_1.CallStatus.Offer;
                            break;
                        case 'ringing':
                            status = Call_1.CallStatus.Ringing;
                            break;
                        case 'reject':
                            status = Call_1.CallStatus.Reject;
                            break;
                        case 'accept':
                            status = Call_1.CallStatus.Accept;
                            break;
                        case 'timeout':
                            status = Call_1.CallStatus.Timeout;
                            break;
                        default:
                            status = Call_1.CallStatus.Ringing;
                            break;
                    }
                    const call = new Call_1.default(event.id, chat, event.from, status, {
                        date: event.date || new Date(),
                        isVideo: !!event.isVideo,
                        offline: !!event.offline,
                        latencyMs: event.latencyMs || 1,
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