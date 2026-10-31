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
const crypto_digest_sync_1 = __importDefault(require("crypto-digest-sync"));
const long_1 = __importDefault(require("long"));
const Message_1 = __importStar(require("../messages/Message"));
const PollMessage_1 = __importStar(require("../messages/PollMessage"));
const ListMessage_1 = __importStar(require("../messages/ListMessage"));
const MediaMessage_1 = __importDefault(require("../messages/MediaMessage"));
const PollUpdateMessage_1 = __importDefault(require("../messages/PollUpdateMessage"));
const LocationMessage_1 = __importDefault(require("../messages/LocationMessage"));
const ReactionMessage_1 = __importDefault(require("../messages/ReactionMessage"));
const ContactMessage_1 = __importDefault(require("../messages/ContactMessage"));
const StickerMessage_1 = __importDefault(require("../messages/StickerMessage"));
const ButtonMessage_1 = __importDefault(require("../messages/ButtonMessage"));
const ImageMessage_1 = __importDefault(require("../messages/ImageMessage"));
const AudioMessage_1 = __importDefault(require("../messages/AudioMessage"));
const VideoMessage_1 = __importDefault(require("../messages/VideoMessage"));
const EmptyMessage_1 = __importDefault(require("../messages/EmptyMessage"));
const ErrorMessage_1 = __importDefault(require("../messages/ErrorMessage"));
const TextMessage_1 = __importDefault(require("../messages/TextMessage"));
const FileMessage_1 = __importDefault(require("../messages/FileMessage"));
const WAMessage_1 = require("./WAMessage");
const Libs_1 = require("../utils/Libs");
const ChatType_1 = __importDefault(require("../modules/chat/ChatType"));
const User_1 = __importDefault(require("../modules/user/User"));
const Chat_1 = __importDefault(require("../modules/chat/Chat"));
const ID_1 = require("./ID");
const list_selection_1 = require("./list-selection");
const reaction_message_data_1 = require("./reaction-message-data");
const poll_content_1 = require("./poll-content");
class ConvertWAMessage {
    constructor(bot, waMessage, type) {
        this.waMessage = { key: {} };
        this.message = new Message_1.default();
        this.bot = bot;
        this.set(waMessage, type);
    }
    /**
     * * Define a mensagem a ser convertida
     * @param waMessage
     * @param type
     */
    set(waMessage = this.waMessage, type) {
        this.waMessage = waMessage;
        this.type = type;
    }
    /**
     * * Retorna a mensagem convertida
     */
    async get() {
        await this.convertMessage(this.waMessage, this.type);
        return this.message;
    }
    /**
     * * Converte a mensagem
     * @param waMessage
     * @param type
     */
    async convertMessage(waMessage, type = "notify") {
        var _a, _b;
        if (!waMessage) {
            this.message = EmptyMessage_1.default.fromJSON({ ...this.message, type: Message_1.MessageType.Empty });
            return;
        }
        if (waMessage.message) {
            await this.convertContentMessage((0, baileys_1.normalizeMessageContent)(waMessage.message));
            if (long_1.default.isLong(this.waMessage.messageTimestamp)) {
                this.message.timestamp = (this.waMessage.messageTimestamp.toNumber() || 0) * 1000 || Date.now();
            }
            else {
                this.message.timestamp = (this.waMessage.messageTimestamp || 0) * 1000 || Date.now();
            }
        }
        if (waMessage.messageStubType == baileys_1.proto.WebMessageInfo.StubType.CIPHERTEXT) {
            this.message = ErrorMessage_1.default.fromJSON({
                ...this.message,
                type: Message_1.MessageType.Error,
                text: WAMessage_1.WAMessageError.FAILED_TO_DECRYPT,
                error: new Error(((_a = waMessage.messageStubParameters) === null || _a === void 0 ? void 0 : _a.shift()) || WAMessage_1.WAMessageError.FAILED_TO_DECRYPT),
            });
        }
        switch ((0, baileys_1.getDevice)(((_b = waMessage === null || waMessage === void 0 ? void 0 : waMessage.key) === null || _b === void 0 ? void 0 : _b.id) || "")) {
            case "android":
                this.message.plataform = Message_1.MessagePlataform.Android;
                break;
            case "ios":
                this.message.plataform = Message_1.MessagePlataform.Ios;
                break;
            case "web":
                this.message.plataform = Message_1.MessagePlataform.Web;
                break;
            case "desktop":
                this.message.plataform = Message_1.MessagePlataform.Desktop;
                break;
            // TODO: Add baileys plataform
            default:
                this.message.plataform = Message_1.MessagePlataform.Unknown;
                break;
        }
        const key = waMessage.key || {};
        const rawParticipant = key.participant || waMessage.participant || undefined;
        this.message.isUnofficial = this.message.plataform == Message_1.MessagePlataform.Unknown;
        this.message.fromMe = !!key.fromMe;
        this.message.id = this.message.id || key.id || "";
        // Registra os pares PN ↔ LID que o WhatsApp enviou junto com a mensagem
        this.bot.extractAndMapLID(waMessage);
        // Chave original: usada para responder, reagir, apagar e marcar como lida sem alterar LID/PN
        this.message.extra.key = {
            remoteJid: key.remoteJid || undefined,
            id: key.id || undefined,
            fromMe: !!key.fromMe,
            participant: rawParticipant,
        };
        // ID único do chat: grupo como veio; conversa privada pelo número quando conhecido
        const chatId = await this.bot.resolveId(key.remoteJid || "");
        this.message.chat = new Chat_1.default(chatId);
        this.message.chat.type = (0, ID_1.isGroupJid)(chatId) ? ChatType_1.default.Group : ChatType_1.default.PV;
        if (this.message.chat.type == ChatType_1.default.PV) {
            this.message.chat.phoneNumber = (0, ID_1.getPhoneNumber)(chatId) || undefined;
            this.message.chat.lid = this.bot.lidMapper.getLID(chatId) || undefined;
        }
        this.message.status = ConvertWAMessage.convertMessageStatus(ConvertWAMessage.isMessageUpdate(waMessage) ? waMessage.update.status : waMessage.status);
        // ID único do autor: participant em grupos, remoteJid em conversa privada
        const userId = key.fromMe ? this.bot.id : await this.bot.resolveId(rawParticipant || key.remoteJid || "");
        const user = new User_1.default(userId);
        if ((0, ID_1.isUserJid)(userId)) {
            user.phoneNumber = (0, ID_1.getPhoneNumber)(userId) || undefined;
            user.lid = (key.fromMe ? this.bot.lid : this.bot.lidMapper.getLID(userId)) || undefined;
        }
        if (!key.fromMe && waMessage.pushName) {
            user.name = waMessage.pushName;
        }
        this.message.user = user;
    }
    /**
     * * Converte o conteudo da mensagem
     * @param messageContent
     * @returns
     */
    async convertContentMessage(messageContent) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
        if (!messageContent) {
            this.message = EmptyMessage_1.default.fromJSON({ ...this.message, type: Message_1.MessageType.Empty });
            return;
        }
        if (((_a = messageContent === null || messageContent === void 0 ? void 0 : messageContent.viewOnceMessage) === null || _a === void 0 ? void 0 : _a.message) || ((_b = messageContent === null || messageContent === void 0 ? void 0 : messageContent.viewOnceMessageV2) === null || _b === void 0 ? void 0 : _b.message) || ((_c = messageContent === null || messageContent === void 0 ? void 0 : messageContent.viewOnceMessageV2Extension) === null || _c === void 0 ? void 0 : _c.message)) {
            messageContent = ((_d = messageContent === null || messageContent === void 0 ? void 0 : messageContent.viewOnceMessage) === null || _d === void 0 ? void 0 : _d.message) || ((_e = messageContent === null || messageContent === void 0 ? void 0 : messageContent.viewOnceMessageV2) === null || _e === void 0 ? void 0 : _e.message) || ((_f = messageContent === null || messageContent === void 0 ? void 0 : messageContent.viewOnceMessageV2Extension) === null || _f === void 0 ? void 0 : _f.message);
            this.message.isViewOnce = true;
        }
        if (messageContent === null || messageContent === void 0 ? void 0 : messageContent.editedMessage) {
            this.message.id = ((_k = (_j = (_h = (_g = messageContent === null || messageContent === void 0 ? void 0 : messageContent.editedMessage) === null || _g === void 0 ? void 0 : _g.message) === null || _h === void 0 ? void 0 : _h.protocolMessage) === null || _j === void 0 ? void 0 : _j.key) === null || _k === void 0 ? void 0 : _k.id) || "";
            this.message.isEdited = true;
            messageContent = (_o = (_m = (_l = messageContent === null || messageContent === void 0 ? void 0 : messageContent.editedMessage) === null || _l === void 0 ? void 0 : _l.message) === null || _m === void 0 ? void 0 : _m.protocolMessage) === null || _o === void 0 ? void 0 : _o.editedMessage;
        }
        const contentType = (0, baileys_1.getContentType)(messageContent);
        if (!contentType) {
            this.message = EmptyMessage_1.default.fromJSON({ ...this.message, type: Message_1.MessageType.Empty });
            return;
        }
        if (contentType == "conversation") {
            this.convertConversationMessage(messageContent[contentType]);
        }
        if (contentType == "extendedTextMessage") {
            this.convertExtendedTextMessage(messageContent[contentType]);
        }
        if (contentType == "protocolMessage") {
            await this.convertProtocolMessage(messageContent[contentType]);
        }
        if (contentType == "imageMessage" || contentType == "videoMessage" || contentType == "audioMessage" || contentType == "stickerMessage" || contentType == "documentMessage") {
            await this.convertMediaMessage(messageContent[contentType], contentType);
        }
        if (contentType === "buttonsMessage" || contentType === "templateMessage") {
            this.convertButtonMessage(messageContent);
        }
        if (contentType === "listMessage") {
            this.convertListMessage(messageContent);
        }
        if (contentType === "interactiveMessage") {
            this.convertInteractiveMessage(messageContent);
        }
        if (contentType === "interactiveResponseMessage") {
            this.convertInteractiveResponseMessage(messageContent[contentType]);
        }
        if (contentType === "locationMessage") {
            this.convertLocationMessage(messageContent[contentType]);
        }
        if (contentType === "contactMessage" || contentType == "contactsArrayMessage") {
            this.convertContactMessage(messageContent[contentType]);
        }
        if (contentType === "reactionMessage") {
            this.convertReactionMessage(messageContent[contentType]);
        }
        const pollCreationContent = (0, poll_content_1.getPollCreationContent)(messageContent);
        if (pollCreationContent) {
            await this.convertPollCreationMessage(pollCreationContent);
        }
        if (contentType == "pollUpdateMessage") {
            await this.convertPollUpdateMessage(messageContent[contentType]);
        }
        const content = messageContent[contentType];
        this.message.text = this.message.text || content.text || content.caption || content.buttonText || ((_p = content.hydratedTemplate) === null || _p === void 0 ? void 0 : _p.hydratedContentText) || content.displayName || content.contentText || "";
        this.message.selected = ((_q = content === null || content === void 0 ? void 0 : content.singleSelectReply) === null || _q === void 0 ? void 0 : _q.selectedRowId) || (content === null || content === void 0 ? void 0 : content.selectedId) || "";
        if (content.contextInfo) {
            await this.convertContextMessage(content.contextInfo);
        }
    }
    /**
     * * Converte o contexto da mensagem
     * @param context
     * @returns
     */
    async convertContextMessage(context) {
        var _a;
        if (context.mentionedJid) {
            for (const jid of context.mentionedJid) {
                const mentionId = await this.bot.resolveId(jid);
                if (mentionId && !this.message.mentions.includes(mentionId)) {
                    this.message.mentions.push(mentionId);
                }
            }
        }
        if (context.quotedMessage) {
            const remoteJid = context.remoteJid || ((_a = this.waMessage.key) === null || _a === void 0 ? void 0 : _a.remoteJid) || "";
            const quotedFromMe = !!context.participant && this.bot.canonicalId(context.participant) == this.bot.id;
            const message = {
                key: {
                    remoteJid,
                    participant: (0, ID_1.isGroupJid)((0, ID_1.normalizeJid)(remoteJid)) ? context.participant : undefined,
                    fromMe: quotedFromMe,
                    id: context.stanzaId,
                },
                message: context.quotedMessage,
            };
            this.message.mention = await new ConvertWAMessage(this.bot, message).get();
        }
    }
    /**
     * * Converte mensagem de conversa
     * @param content
     */
    convertConversationMessage(content) {
        this.message = TextMessage_1.default.fromJSON({ ...this.message, type: Message_1.MessageType.Text, text: content });
    }
    /**
     * * Converte mensagem de texto
     * @param content
     */
    convertExtendedTextMessage(content) {
        this.message = TextMessage_1.default.fromJSON({ ...this.message, type: Message_1.MessageType.Text, text: content });
    }
    /**
     * * Converte mensagem de protocolo
     * @param content
     */
    async convertProtocolMessage(content) {
        var _a, _b;
        if ((content === null || content === void 0 ? void 0 : content.type) == 0) {
            // A chave do protocolo vem da perspectiva de quem apagou: só o ID identifica a mensagem apagada
            this.waMessage.key = { ...this.waMessage.key, id: ((_a = content.key) === null || _a === void 0 ? void 0 : _a.id) || this.waMessage.key.id };
            this.message.id = ((_b = content.key) === null || _b === void 0 ? void 0 : _b.id) || this.message.id;
            this.message.isDeleted = true;
        }
        else if ((content === null || content === void 0 ? void 0 : content.type) == 14) {
            await this.convertEditedMessage(content);
        }
        else {
            this.message = EmptyMessage_1.default.fromJSON({ ...this.message, type: Message_1.MessageType.Empty });
        }
    }
    /**
     * * Converte mensagem de localização
     * @param content
     */
    convertLocationMessage(content) {
        this.message = LocationMessage_1.default.fromJSON({ ...this.message, type: Message_1.MessageType.Location, latitude: content.degreesLatitude, longitude: content.degreesLongitude });
    }
    /**
     * * Converte mensagem com contatos
     * @param content
     */
    convertContactMessage(content) {
        const msg = ContactMessage_1.default.fromJSON({ ...this.message, type: Message_1.MessageType.Contact, text: content.displayName });
        const getContact = (vcard) => {
            const user = new User_1.default("");
            if (typeof vcard == "object") {
                vcard = vcard.vcard;
            }
            const name = vcard.slice(vcard.indexOf("FN:"));
            user.name = name.slice(3, name.indexOf("\n"));
            const id = vcard.slice(vcard.indexOf("waid=") + 5);
            user.id = id.slice(0, id.indexOf(":")) + "@s.whatsapp.net";
            return user;
        };
        if (content.contacts) {
            content.contacts = content.contacts.map((vcard) => getContact(vcard));
        }
        if (content.vcard) {
            msg.contacts = [getContact(content.vcard)];
        }
        this.message = msg;
    }
    /**
     * * Converte mensagem de midia
     * @param content
     * @param contentType
     */
    async convertMediaMessage(content, contentType) {
        var msg = MediaMessage_1.default.fromJSON({ ...this.message, type: Message_1.MessageType.Media });
        const file = { stream: this.waMessage };
        if (contentType == "documentMessage") {
            msg = FileMessage_1.default.fromJSON({ ...msg, type: Message_1.MessageType.File, file });
        }
        if (contentType == "imageMessage") {
            msg = ImageMessage_1.default.fromJSON({ ...msg, type: Message_1.MessageType.Image, file });
        }
        if (contentType == "videoMessage") {
            msg = VideoMessage_1.default.fromJSON({ ...msg, type: Message_1.MessageType.Video, file });
        }
        if (contentType == "audioMessage") {
            msg = AudioMessage_1.default.fromJSON({ ...msg, type: Message_1.MessageType.Audio, file, isPTT: !!content.ptt, duration: content.seconds || 0 });
        }
        if (contentType == "stickerMessage") {
            msg = StickerMessage_1.default.fromJSON({ ...msg, type: Message_1.MessageType.Sticker, file });
            try {
                const waSticker = await (0, Libs_1.getWaSticker)();
                if (waSticker) {
                    await waSticker
                        .extractMetadata(await this.bot.downloadStreamMessage(file))
                        .then((data) => {
                        if (StickerMessage_1.default.isValid(msg)) {
                            msg.author = data["sticker-pack-publisher"] || "";
                            msg.stickerId = data["sticker-pack-id"] || "";
                            msg.pack = data["sticker-pack-name"] || "";
                        }
                    })
                        .catch((err) => {
                        this.bot.emit("error", err);
                    });
                }
            }
            catch (err) {
                this.bot.emit("error", err);
            }
        }
        msg.isGIF = !!content.gifPlayback;
        msg.name = content.fileName || msg.name;
        msg.mimetype = content.mimetype || msg.mimetype;
        this.message = msg;
    }
    /**
     * * Converte uma mensagem de reação
     * @param content
     */
    convertReactionMessage(content) {
        this.message = ReactionMessage_1.default.fromJSON((0, reaction_message_data_1.createReactionMessageData)(this.message, content));
    }
    /**
     * * Converte uma mensagem editada
     * @param content
     */
    async convertEditedMessage(content) {
        var _a;
        await this.convertContentMessage(content === null || content === void 0 ? void 0 : content.editedMessage);
        this.message.id = ((_a = content === null || content === void 0 ? void 0 : content.key) === null || _a === void 0 ? void 0 : _a.id) || "";
        this.message.isEdited = true;
    }
    /**
     * * Converte uma mensagem de enquete
     * @param content
     */
    async convertPollCreationMessage(content) {
        var _a, _b;
        const pollId = this.waMessage.key.id || '';
        const pollCreation = await this.bot.getPollMessage(pollId);
        const pollMessage = PollMessage_1.default.fromJSON({ ...this.message, type: Message_1.MessageType.Poll, text: content.name });
        if (!!pollCreation && (pollCreation === null || pollCreation === void 0 ? void 0 : pollCreation.options) && ((_a = pollCreation === null || pollCreation === void 0 ? void 0 : pollCreation.options) === null || _a === void 0 ? void 0 : _a.length) > 0) {
            pollMessage.options = pollCreation.options;
        }
        else {
            for (const opt of content.options) {
                pollMessage.addOption(opt.optionName || "");
            }
        }
        pollMessage.extra.pollCreatorJid = (0, poll_content_1.getPollCreatorJid)(this.waMessage, this.bot.id);
        this.message = pollMessage;
        console.info('[Rompot poll] creation converted', {
            pollId,
            protocolVariant: Object.keys((0, baileys_1.normalizeMessageContent)(this.waMessage.message) || {}).find((key) => /^pollCreationMessage/.test(key)),
            pollCreatorJid: pollMessage.extra.pollCreatorJid,
            optionCount: pollMessage.options.length,
            optionNames: pollMessage.options.map((option) => option.name),
            secretKeyLength: (_b = pollMessage.secretKey) === null || _b === void 0 ? void 0 : _b.length,
        });
    }
    /**
     * * Converte uma mensagem de enquete atualizada
     * @param content
     */
    async convertPollUpdateMessage(content) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
        const pollMessageId = ((_a = content === null || content === void 0 ? void 0 : content.pollCreationMessageKey) === null || _a === void 0 ? void 0 : _a.id) || this.waMessage.key.id || "";
        const pollCreation = await this.bot.getPollMessage(pollMessageId);
        const pollUpdate = PollUpdateMessage_1.default.fromJSON({ ...this.message, type: Message_1.MessageType.PollUpdate, text: (pollCreation === null || pollCreation === void 0 ? void 0 : pollCreation.text) || '' });
        pollUpdate.extra.pollCreationMessageId = pollMessageId;
        const userId = (0, poll_content_1.getPollVoterId)(this.waMessage, this.bot.id);
        const pollCreatorJid = (0, poll_content_1.normalizePollJid)(((_b = pollCreation === null || pollCreation === void 0 ? void 0 : pollCreation.extra) === null || _b === void 0 ? void 0 : _b.pollCreatorJid)
            || ((pollCreation === null || pollCreation === void 0 ? void 0 : pollCreation.fromMe) ? this.bot.id : ((_c = pollCreation === null || pollCreation === void 0 ? void 0 : pollCreation.user) === null || _c === void 0 ? void 0 : _c.id) || ''));
        // Candidatos sem dispositivo, em PN e LID: em conversas no modo LID o celular pode usar o LID
        const creatorIsBot = !!(pollCreation === null || pollCreation === void 0 ? void 0 : pollCreation.fromMe) || this.bot.lidMapper.isSameUser(pollCreatorJid, this.bot.id);
        const creatorCandidates = (0, poll_content_1.getPollJidCandidates)(...(creatorIsBot ? [this.bot.id, this.bot.lid] : []), pollCreatorJid, ...this.bot.lidMapper.aliases(pollCreatorJid));
        const voterKey = this.waMessage.key || {};
        const voterCandidates = (0, poll_content_1.getPollJidCandidates)(userId, voterKey.participant || this.waMessage.participant || voterKey.remoteJid, ...this.bot.lidMapper.aliases(userId));
        console.info('[Rompot poll] vote update received', {
            eventMessageId: this.waMessage.key.id,
            pollMessageId,
            pollFound: PollMessage_1.default.isValid(pollCreation) && pollCreation.type === Message_1.MessageType.Poll,
            pollCreatorJid,
            pollOptionCount: ((_d = pollCreation === null || pollCreation === void 0 ? void 0 : pollCreation.options) === null || _d === void 0 ? void 0 : _d.length) || 0,
            secretKeyLength: ((_e = pollCreation === null || pollCreation === void 0 ? void 0 : pollCreation.secretKey) === null || _e === void 0 ? void 0 : _e.length) || 0,
            voterId: userId,
            votePayloadPresent: Boolean(((_g = (_f = content === null || content === void 0 ? void 0 : content.vote) === null || _f === void 0 ? void 0 : _f.encPayload) === null || _g === void 0 ? void 0 : _g.length) && ((_j = (_h = content === null || content === void 0 ? void 0 : content.vote) === null || _h === void 0 ? void 0 : _h.encIv) === null || _j === void 0 ? void 0 : _j.length)),
        });
        if (pollCreation) {
            let poll;
            try {
                const result = (0, poll_content_1.decryptPollVoteWithCandidates)((creatorJid, voterJid) => {
                    var _a;
                    return (0, baileys_1.decryptPollVote)(content.vote, {
                        pollCreatorJid: creatorJid,
                        pollMsgId: ((_a = content === null || content === void 0 ? void 0 : content.pollCreationMessageKey) === null || _a === void 0 ? void 0 : _a.id) || "",
                        pollEncKey: pollCreation.secretKey,
                        voterJid,
                    });
                }, creatorCandidates, voterCandidates);
                poll = result.vote;
                if (result.creatorJid != creatorCandidates[0] || result.voterJid != voterCandidates[0]) {
                    console.info('[Rompot poll] vote decrypted with alternate identity', {
                        pollMessageId,
                        creatorJid: result.creatorJid,
                        voterJid: result.voterJid,
                    });
                }
            }
            catch (error) {
                console.error('[Rompot poll] vote decryption failed', {
                    pollMessageId,
                    creatorCandidates,
                    voterCandidates,
                    secretKeyLength: ((_k = pollCreation.secretKey) === null || _k === void 0 ? void 0 : _k.length) || 0,
                    error: error instanceof Error ? error.message : String(error),
                });
                throw error;
            }
            const votesAlias = {};
            const hashVotes = poll.selectedOptions.map((opt) => Buffer.from(opt).toString("hex").toUpperCase()).sort();
            const oldVotes = pollCreation.getUserVotes(userId).sort();
            const nowVotes = [];
            for (const opt of pollCreation.options) {
                const hash = Buffer.from((0, crypto_digest_sync_1.default)("SHA-256", new TextEncoder().encode(Buffer.from(opt.name).toString())))
                    .toString("hex")
                    .toUpperCase();
                votesAlias[opt.name] = opt;
                if (hashVotes.includes(hash)) {
                    nowVotes.push(opt.name);
                }
            }
            const voteChange = (0, poll_content_1.getPollVoteChange)(oldVotes, nowVotes);
            const vote = voteChange ? votesAlias[voteChange.option] || null : null;
            if (voteChange) {
                pollUpdate.action = voteChange.action === 'add' ? PollMessage_1.PollAction.Add : PollMessage_1.PollAction.Remove;
            }
            pollUpdate.selected = (vote === null || vote === void 0 ? void 0 : vote.id) || "";
            pollUpdate.text = (vote === null || vote === void 0 ? void 0 : vote.name) || "";
            console.info('[Rompot poll] vote decoded', {
                pollMessageId,
                voterId: userId,
                selectedHashCount: hashVotes.length,
                previousOptions: oldVotes,
                currentOptions: nowVotes,
                action: pollUpdate.action,
                selectedOptionId: pollUpdate.selected,
                selectedOptionName: pollUpdate.text,
            });
            pollCreation.setUserVotes(userId, nowVotes);
            await this.bot.savePollMessage(pollCreation);
        }
        else {
            console.error('[Rompot poll] poll creation record missing', { pollMessageId });
        }
        this.message = pollUpdate;
        console.info('[Rompot poll] vote update converted', {
            type: this.message.type,
            chatId: (_l = this.message.chat) === null || _l === void 0 ? void 0 : _l.id,
            pollMessageId: this.message.extra.pollCreationMessageId,
            action: this.message.action,
            selected: this.message.selected,
            text: this.message.text,
        });
    }
    /**
     * * Converte uma mensagem de botão
     * @param content
     * @returns
     */
    convertButtonMessage(content) {
        var _a, _b;
        let buttonMessage = content.buttonsMessage || content.templateMessage;
        const buttonMSG = ButtonMessage_1.default.fromJSON({ ...this.message, type: Message_1.MessageType.Button });
        if (buttonMessage.hydratedTemplate)
            buttonMessage = buttonMessage.hydratedTemplate;
        buttonMSG.text = buttonMessage.contentText || buttonMessage.hydratedContentText || "";
        buttonMSG.footer = buttonMessage.footerText || buttonMessage.hydratedFooterText || "";
        if (buttonMessage.buttons) {
            (_a = buttonMessage.buttons) === null || _a === void 0 ? void 0 : _a.map((button) => {
                var _a;
                buttonMSG.addReply(((_a = button === null || button === void 0 ? void 0 : button.buttonText) === null || _a === void 0 ? void 0 : _a.displayText) || "", button.buttonId || String(Date.now()));
            });
        }
        if (buttonMessage.hydratedButtons) {
            (_b = buttonMessage.hydratedButtons) === null || _b === void 0 ? void 0 : _b.map((button) => {
                if (button.callButton) {
                    buttonMSG.addCall(button.callButton.displayText || "", button.callButton.phoneNumber || buttonMSG.buttons.length);
                }
                if (button.urlButton) {
                    buttonMSG.addUrl(button.urlButton.displayText || "", button.urlButton.url || "");
                }
                if (button.quickReplyButton) {
                    buttonMSG.addReply(button.quickReplyButton.displayText || "", button.quickReplyButton.id);
                }
            });
        }
        this.message = buttonMSG;
    }
    /**
     * * Converte uma mensagem de lista
     * @param content
     * @returns
     */
    convertListMessage(content) {
        var _a;
        const listMessage = content.listMessage;
        if (!listMessage)
            return;
        const listMSG = ListMessage_1.default.fromJSON({ ...this.message, type: Message_1.MessageType.List });
        listMSG.text = listMessage.description || "";
        listMSG.title = listMessage.title || "";
        listMSG.footer = listMessage.footerText || "";
        listMSG.button = listMessage.buttonText || "";
        // Converte o listType, usando UNKNOWN como padrão
        const listType = listMessage.listType;
        if (listType in ListMessage_1.ListType) {
            listMSG.listType = listType;
        }
        else {
            listMSG.listType = ListMessage_1.ListType.UNKNOWN;
        }
        (_a = listMessage === null || listMessage === void 0 ? void 0 : listMessage.sections) === null || _a === void 0 ? void 0 : _a.map((list) => {
            var _a;
            const index = listMSG.list.length;
            listMSG.addCategory(list.title || "");
            (_a = list.rows) === null || _a === void 0 ? void 0 : _a.map((item) => {
                listMSG.addItem(index, item.title || "", item.description || "", item.rowId || "");
            });
        });
        this.message = listMSG;
    }
    /**
     * * Converte uma mensagem de botão
     * @param content
     * @returns
     */
    convertInteractiveMessage(content) {
        const interactiveMessage = content.interactiveMessage;
        if (!interactiveMessage)
            return;
        // TODO: Implementar a conversão de mensagem interativa
    }
    convertInteractiveResponseMessage(content) {
        var _a, _b, _c;
        const response = content === null || content === void 0 ? void 0 : content.nativeFlowResponseMessage;
        this.message.selected = (0, list_selection_1.extractInteractiveListSelection)(content);
        this.message.text = ((_a = content === null || content === void 0 ? void 0 : content.body) === null || _a === void 0 ? void 0 : _a.text) || '';
        const listMessageId = ((_b = response === null || response === void 0 ? void 0 : response.contextInfo) === null || _b === void 0 ? void 0 : _b.stanzaId) || ((_c = content === null || content === void 0 ? void 0 : content.contextInfo) === null || _c === void 0 ? void 0 : _c.stanzaId);
        if (listMessageId)
            this.message.extra.listMessageId = listMessageId;
    }
    static convertMessageStatus(status) {
        if (status == baileys_1.proto.WebMessageInfo.Status.ERROR)
            return Message_1.MessageStatus.Error;
        if (status == baileys_1.proto.WebMessageInfo.Status.PENDING)
            return Message_1.MessageStatus.Sending;
        if (status == baileys_1.proto.WebMessageInfo.Status.SERVER_ACK)
            return Message_1.MessageStatus.Sended;
        if (status == baileys_1.proto.WebMessageInfo.Status.DELIVERY_ACK)
            return Message_1.MessageStatus.Received;
        if (status == baileys_1.proto.WebMessageInfo.Status.READ)
            return Message_1.MessageStatus.Readed;
        if (status == baileys_1.proto.WebMessageInfo.Status.PLAYED)
            return Message_1.MessageStatus.Played;
        return Message_1.MessageStatus.Sending;
    }
    static isMessageUpdate(waMessage) {
        var _a;
        return !!waMessage && typeof waMessage == "object" && !!(waMessage === null || waMessage === void 0 ? void 0 : waMessage.update) && typeof (waMessage === null || waMessage === void 0 ? void 0 : waMessage.update) == "object" && ((_a = waMessage === null || waMessage === void 0 ? void 0 : waMessage.update) === null || _a === void 0 ? void 0 : _a.status) != undefined;
    }
}
exports.default = ConvertWAMessage;
//# sourceMappingURL=ConvertWAMessage.js.map