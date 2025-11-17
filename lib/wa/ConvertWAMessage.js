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
        var _a, _b, _c;
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
        this.message.isUnofficial = this.message.plataform == Message_1.MessagePlataform.Unknown;
        this.message.fromMe = !!this.waMessage.key.fromMe;
        this.message.id = this.message.id || this.waMessage.key.id || "";
        this.message.chat = new Chat_1.default((0, ID_1.fixID)(((_c = waMessage === null || waMessage === void 0 ? void 0 : waMessage.key) === null || _c === void 0 ? void 0 : _c.remoteJid) || this.bot.id));
        this.message.chat.type = (0, baileys_1.isJidGroup)(this.message.chat.id) ? ChatType_1.default.Group : ChatType_1.default.PV;
        this.message.status = ConvertWAMessage.convertMessageStatus(ConvertWAMessage.isMessageUpdate(waMessage) ? waMessage.update.status : waMessage.status);
        this.message.user = new User_1.default((0, ID_1.fixID)(waMessage.key.fromMe ? this.bot.id : waMessage.key.participant || waMessage.participant || waMessage.key.remoteJid || ""));
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
        if (contentType === "locationMessage") {
            this.convertLocationMessage(messageContent[contentType]);
        }
        if (contentType === "contactMessage" || contentType == "contactsArrayMessage") {
            this.convertContactMessage(messageContent[contentType]);
        }
        if (contentType === "reactionMessage") {
            this.convertReactionMessage(messageContent[contentType]);
        }
        if (contentType === "pollCreationMessage") {
            await this.convertPollCreationMessage(messageContent[contentType]);
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
        var _a, _b;
        if (context.mentionedJid) {
            for (const jid of context.mentionedJid) {
                this.message.mentions.push(jid);
            }
        }
        if (context.quotedMessage) {
            const message = {
                key: {
                    remoteJid: (0, ID_1.fixID)(((_b = (_a = this.waMessage) === null || _a === void 0 ? void 0 : _a.key) === null || _b === void 0 ? void 0 : _b.remoteJid) || this.bot.id),
                    participant: context.participant,
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
        if ((content === null || content === void 0 ? void 0 : content.type) == 0) {
            this.waMessage.key = { ...this.waMessage.key, ...content.key };
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
        this.message = ReactionMessage_1.default.fromJSON({ ...this.message, text: content.text, id: content.key.id });
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
        var _a;
        const pollCreation = await this.bot.getPollMessage(this.waMessage.key.id || "");
        const pollMessage = PollMessage_1.default.fromJSON({ ...this.message, type: Message_1.MessageType.Poll, text: content.name });
        if (!!pollCreation && (pollCreation === null || pollCreation === void 0 ? void 0 : pollCreation.options) && ((_a = pollCreation === null || pollCreation === void 0 ? void 0 : pollCreation.options) === null || _a === void 0 ? void 0 : _a.length) > 0) {
            pollMessage.options = pollCreation.options;
        }
        else {
            for (const opt of content.options) {
                pollMessage.addOption(opt.optionName || "");
            }
        }
        this.message = pollMessage;
    }
    /**
     * * Converte uma mensagem de enquete atualizada
     * @param content
     */
    async convertPollUpdateMessage(content) {
        var _a;
        const pollCreation = await this.bot.getPollMessage(this.waMessage.key.id || "");
        const pollUpdate = PollUpdateMessage_1.default.fromJSON({ ...this.message, type: Message_1.MessageType.PollUpdate, text: pollCreation.text });
        const userId = (0, ID_1.fixID)(this.waMessage.key.fromMe ? this.bot.id : this.waMessage.key.participant || this.waMessage.participant || this.waMessage.key.remoteJid || "");
        if (pollCreation) {
            const poll = (0, baileys_1.decryptPollVote)(content.vote, {
                pollCreatorJid: pollCreation.user.id,
                pollMsgId: ((_a = content === null || content === void 0 ? void 0 : content.pollCreationMessageKey) === null || _a === void 0 ? void 0 : _a.id) || "",
                pollEncKey: pollCreation.secretKey,
                voterJid: userId,
            });
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
            let vote = null;
            const avaibleVotes = Object.keys(votesAlias);
            for (const name of avaibleVotes) {
                if (nowVotes.length > oldVotes.length) {
                    if (oldVotes.includes(name) || !nowVotes.includes(name))
                        continue;
                    vote = votesAlias[name];
                    pollUpdate.action = PollMessage_1.PollAction.Add;
                    break;
                }
                else {
                    if (nowVotes.includes(name) || !oldVotes.includes(name))
                        continue;
                    vote = votesAlias[name];
                    pollUpdate.action = PollMessage_1.PollAction.Remove;
                    break;
                }
            }
            pollUpdate.selected = (vote === null || vote === void 0 ? void 0 : vote.id) || "";
            pollUpdate.text = (vote === null || vote === void 0 ? void 0 : vote.name) || "";
            pollCreation.setUserVotes(userId, nowVotes);
            await this.bot.savePollMessage(pollCreation);
        }
        this.message = pollUpdate;
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
        // buttonMSG.setType(buttonMessage.headerType || buttonMessage.hydratedHeaderType || 1)
        if (buttonMessage.buttons) {
            buttonMSG.type = Message_1.MessageType.Button;
            (_a = buttonMessage.buttons) === null || _a === void 0 ? void 0 : _a.map((button) => {
                var _a;
                buttonMSG.addReply(((_a = button === null || button === void 0 ? void 0 : button.buttonText) === null || _a === void 0 ? void 0 : _a.displayText) || "", button.buttonId || String(Date.now()));
            });
        }
        if (buttonMessage.hydratedButtons) {
            buttonMSG.type = Message_1.MessageType.TemplateButton;
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
        listMSG.listType = listMessage.listType || ListMessage_1.ListType.UNKNOWN;
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
     * * Converte uma mensagem de interativa
     * @param content
     */
    convertInteractiveMessage(content) {
        const interactiveMessage = content.interactiveMessage;
        if (!interactiveMessage)
            return;
        // TODO: Implementar a conversão de mensagem interativa
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