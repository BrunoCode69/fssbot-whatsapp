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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
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
const TextMessage_1 = __importDefault(require("../messages/TextMessage"));
const FileMessage_1 = __importDefault(require("../messages/FileMessage"));
const Libs_1 = require("../utils/Libs");
const MediaUtils_1 = require("../utils/MediaUtils");
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
    set(waMessage = this.waMessage, type) {
        this.waMessage = waMessage;
        this.type = type;
    }
    async get() {
        await this.convertMessage(this.waMessage, this.type);
        return this.message;
    }
    async convertMessage(waMessage, type = 'notify') {
        if (!waMessage) {
            this.message = EmptyMessage_1.default.fromJSON({ ...this.message, type: Message_1.MessageType.Empty });
            return;
        }
        // Se for um addon descriptografado pelo ZapoJS (reaction, poll_vote, message_edit)
        if (waMessage.kind && waMessage.decrypted) {
            await this.convertAddonMessage(waMessage);
            return;
        }
        if (waMessage.message) {
            await this.convertContentMessage(waMessage.message);
            if (waMessage.timestampSeconds) {
                this.message.timestamp = Number(waMessage.timestampSeconds) * 1000;
            }
            else if (long_1.default.isLong(waMessage.messageTimestamp)) {
                this.message.timestamp = (waMessage.messageTimestamp.toNumber() || 0) * 1000 || Date.now();
            }
            else if (waMessage.messageTimestamp) {
                this.message.timestamp = (Number(waMessage.messageTimestamp) || 0) * 1000 || Date.now();
            }
            else {
                this.message.timestamp = Date.now();
            }
        }
        const key = waMessage.key || {};
        const rawParticipant = key.participant || waMessage.participant || undefined;
        this.message.plataform = Message_1.MessagePlataform.Web;
        this.message.isUnofficial = false;
        this.message.fromMe = !!key.fromMe;
        this.message.id = this.message.id || key.id || '';
        // Mapeia LID/PN recebido
        if (this.bot && typeof this.bot.extractAndMapLID === 'function') {
            this.bot.extractAndMapLID(waMessage);
        }
        // Chave original para respostas/reações
        this.message.extra.key = {
            remoteJid: key.remoteJid || undefined,
            id: key.id || undefined,
            fromMe: !!key.fromMe,
            participant: rawParticipant,
        };
        const resolve = async (id) => {
            if (!id)
                return '';
            if (this.bot && typeof this.bot.resolveId === 'function') {
                return (await this.bot.resolveId(id)) || (0, ID_1.normalizeJid)(id);
            }
            return (0, ID_1.normalizeJid)(id);
        };
        const chatId = await resolve(key.remoteJid || '');
        this.message.chat = new Chat_1.default(chatId);
        this.message.chat.type = (0, ID_1.isGroupJid)(chatId) ? ChatType_1.default.Group : ChatType_1.default.PV;
        if (this.message.chat.type === ChatType_1.default.PV) {
            this.message.chat.phoneNumber = (0, ID_1.getPhoneNumber)(chatId) || undefined;
            this.message.chat.lid = this.bot?.lidMapper?.getLID(chatId) || undefined;
        }
        this.message.status = ConvertWAMessage.convertMessageStatus(ConvertWAMessage.isMessageUpdate(waMessage)
            ? waMessage.update.status
            : waMessage.status);
        const userId = key.fromMe
            ? this.bot?.id || ''
            : await resolve(rawParticipant || key.remoteJid || '');
        const user = new User_1.default(userId);
        if ((0, ID_1.isUserJid)(userId)) {
            user.phoneNumber = (0, ID_1.getPhoneNumber)(userId) || undefined;
            user.lid =
                (key.fromMe ? this.bot?.lid : this.bot?.lidMapper?.getLID(userId)) || undefined;
        }
        const pushName = waMessage.pushName || waMessage.verifiedBizName;
        if (!key.fromMe && pushName) {
            user.name = pushName;
        }
        this.message.user = user;
    }
    /**
     * Converte addons nativos do ZapoJS (reações, votos de enquete, edições)
     */
    async convertAddonMessage(addon) {
        const key = addon.key || {};
        const resolve = async (id) => {
            if (!id)
                return '';
            if (this.bot && typeof this.bot.resolveId === 'function') {
                return (await this.bot.resolveId(id)) || (0, ID_1.normalizeJid)(id);
            }
            return (0, ID_1.normalizeJid)(id);
        };
        const chatId = await resolve(key.remoteJid || '');
        const userId = key.fromMe
            ? this.bot?.id || ''
            : await resolve(key.participant || key.remoteJid || '');
        const chat = new Chat_1.default(chatId, (0, ID_1.isGroupJid)(chatId) ? ChatType_1.default.Group : ChatType_1.default.PV);
        const user = new User_1.default(userId);
        user.phoneNumber = (0, ID_1.getPhoneNumber)(userId) || undefined;
        user.lid = this.bot?.lidMapper?.getLID(userId) || undefined;
        if (addon.pushName)
            user.name = addon.pushName;
        const baseMessage = {
            id: key.id || addon.targetMessageId || '',
            chat,
            user,
            fromMe: !!key.fromMe,
            timestamp: addon.timestampSeconds ? Number(addon.timestampSeconds) * 1000 : Date.now(),
            extra: {
                key: {
                    remoteJid: key.remoteJid,
                    id: key.id,
                    fromMe: !!key.fromMe,
                    participant: key.participant,
                },
            },
        };
        if (addon.kind === 'reaction') {
            const emoji = addon.decrypted?.reaction?.text || '';
            const reaction = ReactionMessage_1.default.fromJSON({
                ...baseMessage,
                type: Message_1.MessageType.Reaction,
                text: emoji,
                id: addon.targetMessageId || addon.decrypted?.reaction?.key?.id || key.id,
            });
            reaction.extra.targetMessageId = addon.targetMessageId;
            this.message = reaction;
            return;
        }
        if (addon.kind === 'poll_vote') {
            const pollMessageId = addon.targetMessageId || key.id || '';
            const pollCreation = this.bot
                ? await this.bot.getPollMessage(pollMessageId)
                : null;
            const pollUpdate = PollUpdateMessage_1.default.fromJSON({
                ...baseMessage,
                type: Message_1.MessageType.PollUpdate,
                text: pollCreation?.text || '',
                id: key.id || pollMessageId,
            });
            pollUpdate.extra.pollCreationMessageId = pollMessageId;
            const selectedOptionNames = addon.decrypted?.selectedOptionNames || [];
            if (pollCreation) {
                const oldVotes = pollCreation.getUserVotes(userId);
                const voteChange = (0, poll_content_1.getPollVoteChange)(oldVotes, selectedOptionNames);
                if (voteChange) {
                    pollUpdate.action =
                        voteChange.action === 'add' ? PollMessage_1.PollAction.Add : PollMessage_1.PollAction.Remove;
                    pollUpdate.text = voteChange.option;
                    const matchedOpt = pollCreation.options.find((o) => o.name === voteChange.option);
                    pollUpdate.selected = matchedOpt?.id || voteChange.option;
                }
                pollCreation.setUserVotes(userId, selectedOptionNames);
                if (this.bot) {
                    await this.bot.savePollMessage(pollCreation);
                }
            }
            else {
                if (selectedOptionNames.length) {
                    pollUpdate.action = PollMessage_1.PollAction.Add;
                    pollUpdate.text = selectedOptionNames[0];
                    pollUpdate.selected = selectedOptionNames[0];
                }
            }
            this.message = pollUpdate;
            return;
        }
        if (addon.kind === 'message_edit') {
            const editedProto = addon.decrypted?.message;
            if (editedProto) {
                await this.convertContentMessage(editedProto);
            }
            this.message.id = addon.targetMessageId || key.id || '';
            this.message.isEdited = true;
            this.message.chat = chat;
            this.message.user = user;
            return;
        }
    }
    /**
     * Desembrulha os contêineres comuns (temporária, visualização única, documento com legenda),
     * inclusive combinados, até 5 níveis. Marca `isViewOnce` quando passa por visualização única.
     */
    unwrapContainers(messageContent) {
        let current = messageContent;
        for (let depth = 0; depth < 5 && current; depth++) {
            const viewOnce = current.viewOnceMessage?.message ||
                current.viewOnceMessageV2?.message ||
                current.viewOnceMessageV2Extension?.message;
            if (viewOnce) {
                this.message.isViewOnce = true;
                current = viewOnce;
                continue;
            }
            const inner = current.ephemeralMessage?.message ||
                current.documentWithCaptionMessage?.message;
            if (!inner)
                break;
            current = inner;
        }
        return current;
    }
    async convertContentMessage(messageContent) {
        if (!messageContent) {
            this.message = EmptyMessage_1.default.fromJSON({ ...this.message, type: Message_1.MessageType.Empty });
            return;
        }
        // Contêineres (temporária, visualização única, documento com legenda)
        messageContent = this.unwrapContainers(messageContent);
        // Edited message unwrap
        if (messageContent?.editedMessage) {
            this.message.id =
                messageContent?.editedMessage?.message?.protocolMessage?.key?.id || '';
            this.message.isEdited = true;
            messageContent = this.unwrapContainers(messageContent?.editedMessage?.message?.protocolMessage?.editedMessage);
        }
        if (!messageContent) {
            this.message = EmptyMessage_1.default.fromJSON({ ...this.message, type: Message_1.MessageType.Empty });
            return;
        }
        const contentType = Object.keys(messageContent).find((key) => {
            const val = messageContent[key];
            return val !== null && val !== undefined && key !== 'messageContextInfo';
        });
        if (!contentType) {
            this.message = EmptyMessage_1.default.fromJSON({ ...this.message, type: Message_1.MessageType.Empty });
            return;
        }
        if (contentType === 'conversation') {
            this.convertConversationMessage(messageContent.conversation);
        }
        else if (contentType === 'extendedTextMessage') {
            this.convertExtendedTextMessage(messageContent.extendedTextMessage);
        }
        else if (contentType === 'protocolMessage') {
            await this.convertProtocolMessage(messageContent.protocolMessage);
        }
        else if (contentType === 'imageMessage' ||
            contentType === 'videoMessage' ||
            contentType === 'audioMessage' ||
            contentType === 'stickerMessage' ||
            contentType === 'documentMessage' ||
            contentType === 'ptvMessage') {
            await this.convertMediaMessage(messageContent[contentType], contentType);
        }
        else if (contentType === 'buttonsMessage' || contentType === 'templateMessage') {
            this.convertButtonMessage(messageContent);
        }
        else if (contentType === 'listMessage') {
            this.convertListMessage(messageContent);
        }
        else if (contentType === 'interactiveMessage') {
            this.convertInteractiveMessage(messageContent);
        }
        else if (contentType === 'interactiveResponseMessage') {
            this.convertInteractiveResponseMessage(messageContent[contentType]);
        }
        else if (contentType === 'locationMessage') {
            this.convertLocationMessage(messageContent.locationMessage);
        }
        else if (contentType === 'contactMessage' ||
            contentType === 'contactsArrayMessage') {
            this.convertContactMessage(messageContent[contentType]);
        }
        else if (contentType === 'reactionMessage') {
            this.convertReactionMessage(messageContent.reactionMessage);
        }
        const pollCreationContent = (0, poll_content_1.getPollCreationContent)(messageContent);
        if (pollCreationContent) {
            await this.convertPollCreationMessage(pollCreationContent);
        }
        if (contentType === 'pollUpdateMessage') {
            await this.convertPollUpdateMessage(messageContent.pollUpdateMessage);
        }
        const content = messageContent[contentType];
        if (content) {
            this.message.text =
                this.message.text ||
                    content.text ||
                    content.caption ||
                    content.buttonText ||
                    content.hydratedTemplate?.hydratedContentText ||
                    content.displayName ||
                    content.contentText ||
                    '';
            this.message.selected =
                this.message.selected ||
                    content?.singleSelectReply?.selectedRowId ||
                    content?.selectedId ||
                    content?.selectedButtonId ||
                    '';
            if (content.contextInfo) {
                await this.convertContextMessage(content.contextInfo);
            }
        }
    }
    async convertContextMessage(context) {
        if (context.mentionedJid) {
            for (const jid of context.mentionedJid) {
                const mentionId = this.bot && typeof this.bot.resolveId === 'function'
                    ? await this.bot.resolveId(jid)
                    : (0, ID_1.normalizeJid)(jid);
                if (mentionId && !this.message.mentions.includes(mentionId)) {
                    this.message.mentions.push(mentionId);
                }
            }
        }
        if (context.quotedMessage) {
            const remoteJid = context.remoteJid || this.waMessage.key?.remoteJid || '';
            const quotedFromMe = !!context.participant &&
                this.bot?.canonicalId?.(context.participant) === this.bot?.id;
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
    convertConversationMessage(content) {
        this.message = TextMessage_1.default.fromJSON({
            ...this.message,
            type: Message_1.MessageType.Text,
            text: content,
        });
    }
    convertExtendedTextMessage(content) {
        this.message = TextMessage_1.default.fromJSON({
            ...this.message,
            type: Message_1.MessageType.Text,
            text: typeof content === 'string' ? content : content?.text || '',
        });
    }
    async convertProtocolMessage(content) {
        if (content?.type === 0) {
            this.waMessage.key = {
                ...this.waMessage.key,
                id: content.key?.id || this.waMessage.key?.id,
            };
            this.message.id = content.key?.id || this.message.id;
            this.message.isDeleted = true;
        }
        else if (content?.type === 14) {
            await this.convertEditedMessage(content);
        }
        else {
            this.message = EmptyMessage_1.default.fromJSON({
                ...this.message,
                type: Message_1.MessageType.Empty,
            });
        }
    }
    convertLocationMessage(content) {
        this.message = LocationMessage_1.default.fromJSON({
            ...this.message,
            type: Message_1.MessageType.Location,
            latitude: content.degreesLatitude,
            longitude: content.degreesLongitude,
        });
    }
    convertContactMessage(content) {
        const msg = ContactMessage_1.default.fromJSON({
            ...this.message,
            type: Message_1.MessageType.Contact,
            text: content.displayName,
        });
        const getContact = (vcard) => {
            const user = new User_1.default('');
            if (typeof vcard === 'object') {
                vcard = vcard.vcard;
            }
            const raw = String(vcard || '');
            const fnIdx = raw.indexOf('FN:');
            if (fnIdx !== -1) {
                const afterFn = raw.slice(fnIdx + 3);
                user.name = afterFn.slice(0, afterFn.indexOf('\n')).trim();
            }
            const waidIdx = raw.indexOf('waid=');
            if (waidIdx !== -1) {
                const afterWaid = raw.slice(waidIdx + 5);
                user.id = afterWaid.slice(0, afterWaid.indexOf(':')) + '@s.whatsapp.net';
            }
            return user;
        };
        if (content.contacts && Array.isArray(content.contacts)) {
            msg.contacts = content.contacts.map((vcard) => getContact(vcard));
        }
        else if (content.vcard) {
            msg.contacts = [getContact(content.vcard)];
        }
        this.message = msg;
    }
    async convertMediaMessage(content, contentType) {
        content = content || {};
        let msg = MediaMessage_1.default.fromJSON({ ...this.message, type: Message_1.MessageType.Media });
        const file = { stream: this.waMessage };
        if (contentType === 'documentMessage') {
            msg = FileMessage_1.default.fromJSON({ ...msg, type: Message_1.MessageType.File, file });
        }
        else if (contentType === 'imageMessage') {
            msg = ImageMessage_1.default.fromJSON({ ...msg, type: Message_1.MessageType.Image, file });
        }
        else if (contentType === 'videoMessage' || contentType === 'ptvMessage') {
            msg = VideoMessage_1.default.fromJSON({
                ...msg,
                type: Message_1.MessageType.Video,
                file,
                isPTV: contentType === 'ptvMessage',
                duration: (0, MediaUtils_1.toMediaNumber)(content.seconds),
            });
        }
        else if (contentType === 'audioMessage') {
            msg = AudioMessage_1.default.fromJSON({
                ...msg,
                type: Message_1.MessageType.Audio,
                file,
                isPTT: !!content.ptt,
                duration: (0, MediaUtils_1.toMediaNumber)(content.seconds),
            });
        }
        else if (contentType === 'stickerMessage') {
            msg = StickerMessage_1.default.fromJSON({ ...msg, type: Message_1.MessageType.Sticker, file });
            try {
                const waSticker = await (0, Libs_1.getWaSticker)();
                if (waSticker && this.bot?.downloadStreamMessage) {
                    const buffer = await this.bot.downloadStreamMessage(file);
                    if (buffer && buffer.length) {
                        const data = await waSticker.extractMetadata(buffer);
                        if (StickerMessage_1.default.isValid(msg) && data) {
                            msg.author = data['sticker-pack-publisher'] || '';
                            msg.stickerId = data['sticker-pack-id'] || '';
                            msg.pack = data['sticker-pack-name'] || '';
                        }
                    }
                }
            }
            catch (err) {
                this.bot?.emit('error', err);
            }
        }
        msg.isGIF = !!content.gifPlayback;
        msg.name = content.fileName || msg.name;
        msg.mimetype = content.mimetype || msg.mimetype;
        msg.size = (0, MediaUtils_1.toMediaNumber)(content.fileLength);
        msg.width = (0, MediaUtils_1.toMediaNumber)(content.width);
        msg.height = (0, MediaUtils_1.toMediaNumber)(content.height);
        // Visualização única: contêiner viewOnce* ou a flag `viewOnce` da própria mídia.
        const viewOnce = !!this.message.isViewOnce || !!content.viewOnce;
        msg.viewOnce = viewOnce;
        msg.isViewOnce = viewOnce;
        this.message = msg;
    }
    convertReactionMessage(content) {
        this.message = ReactionMessage_1.default.fromJSON((0, reaction_message_data_1.createReactionMessageData)(this.message, content));
    }
    async convertEditedMessage(content) {
        await this.convertContentMessage(content?.editedMessage);
        this.message.id = content?.key?.id || '';
        this.message.isEdited = true;
    }
    async convertPollCreationMessage(content) {
        const pollId = this.waMessage.key?.id || '';
        const pollCreation = this.bot ? await this.bot.getPollMessage(pollId) : null;
        const pollMessage = PollMessage_1.default.fromJSON({
            ...this.message,
            type: Message_1.MessageType.Poll,
            text: content.name || '',
        });
        if (pollCreation && pollCreation.options && pollCreation.options.length > 0) {
            pollMessage.options = pollCreation.options;
        }
        else if (content.options && Array.isArray(content.options)) {
            for (const opt of content.options) {
                pollMessage.addOption(opt.optionName || opt.name || '');
            }
        }
        pollMessage.extra.pollCreatorJid = (0, poll_content_1.getPollCreatorJid)(this.waMessage, this.bot?.id || '');
        this.message = pollMessage;
    }
    async convertPollUpdateMessage(content) {
        const pollMessageId = content?.pollCreationMessageKey?.id || this.waMessage.key?.id || '';
        const pollCreation = this.bot
            ? await this.bot.getPollMessage(pollMessageId)
            : null;
        const pollUpdate = PollUpdateMessage_1.default.fromJSON({
            ...this.message,
            type: Message_1.MessageType.PollUpdate,
            text: pollCreation?.text || '',
        });
        pollUpdate.extra.pollCreationMessageId = pollMessageId;
        const userId = (0, poll_content_1.getPollVoterId)(this.waMessage, this.bot?.id || '');
        if (pollCreation) {
            const oldVotes = pollCreation.getUserVotes(userId);
            const voteChange = (0, poll_content_1.getPollVoteChange)(oldVotes, []);
            if (voteChange) {
                pollUpdate.action =
                    voteChange.action === 'add' ? PollMessage_1.PollAction.Add : PollMessage_1.PollAction.Remove;
                pollUpdate.text = voteChange.option;
            }
        }
        this.message = pollUpdate;
    }
    convertButtonMessage(content) {
        let buttonMessage = content.buttonsMessage || content.templateMessage;
        const buttonMSG = ButtonMessage_1.default.fromJSON({
            ...this.message,
            type: Message_1.MessageType.Button,
        });
        if (buttonMessage.hydratedTemplate) {
            buttonMessage = buttonMessage.hydratedTemplate;
        }
        buttonMSG.text =
            buttonMessage.contentText || buttonMessage.hydratedContentText || '';
        buttonMSG.footer =
            buttonMessage.footerText || buttonMessage.hydratedFooterText || '';
        if (buttonMessage.buttons) {
            buttonMessage.buttons.forEach((button) => {
                buttonMSG.addReply(button?.buttonText?.displayText || '', button?.buttonId || String(Date.now()));
            });
        }
        if (buttonMessage.hydratedButtons) {
            buttonMessage.hydratedButtons.forEach((button) => {
                if (button.callButton) {
                    buttonMSG.addCall(button.callButton.displayText || '', button.callButton.phoneNumber || buttonMSG.buttons.length);
                }
                if (button.urlButton) {
                    buttonMSG.addUrl(button.urlButton.displayText || '', button.urlButton.url || '');
                }
                if (button.quickReplyButton) {
                    buttonMSG.addReply(button.quickReplyButton.displayText || '', button.quickReplyButton.id);
                }
            });
        }
        this.message = buttonMSG;
    }
    convertListMessage(content) {
        const listMessage = content.listMessage;
        if (!listMessage)
            return;
        const listMSG = ListMessage_1.default.fromJSON({
            ...this.message,
            type: Message_1.MessageType.List,
        });
        listMSG.text = listMessage.description || '';
        listMSG.title = listMessage.title || '';
        listMSG.footer = listMessage.footerText || '';
        listMSG.button = listMessage.buttonText || '';
        const listType = listMessage.listType;
        if (listType in ListMessage_1.ListType) {
            listMSG.listType = listType;
        }
        else {
            listMSG.listType = ListMessage_1.ListType.UNKNOWN;
        }
        listMessage.sections?.forEach((list) => {
            const index = listMSG.list.length;
            listMSG.addCategory(list.title || '');
            list.rows?.forEach((item) => {
                listMSG.addItem(index, item.title || '', item.description || '', item.rowId || '');
            });
        });
        this.message = listMSG;
    }
    convertInteractiveMessage(content) {
        const interactive = content.interactiveMessage;
        if (!interactive)
            return;
        this.message.text =
            interactive.body?.text || interactive.header?.title || '';
        if (interactive.nativeFlowMessage?.buttons) {
            const buttons = interactive.nativeFlowMessage.buttons;
            const buttonMSG = ButtonMessage_1.default.fromJSON({
                ...this.message,
                type: Message_1.MessageType.Button,
            });
            for (const btn of buttons) {
                if (btn.name === 'quick_reply') {
                    try {
                        const params = JSON.parse(btn.buttonParamsJson || '{}');
                        buttonMSG.addReply(params.display_text || '', params.id || '');
                    }
                    catch { }
                }
            }
            if (buttonMSG.buttons.length) {
                this.message = buttonMSG;
            }
        }
    }
    convertInteractiveResponseMessage(content) {
        this.message.selected = (0, list_selection_1.extractInteractiveListSelection)(content);
        this.message.text = content?.body?.text || '';
        const listMessageId = content?.nativeFlowResponseMessage?.contextInfo?.stanzaId ||
            content?.contextInfo?.stanzaId;
        if (listMessageId) {
            this.message.extra.listMessageId = listMessageId;
        }
    }
    static convertMessageStatus(status) {
        if (status === 'ERROR' || status === 0)
            return Message_1.MessageStatus.Error;
        if (status === 'PENDING' || status === 1)
            return Message_1.MessageStatus.Sending;
        if (status === 'SERVER_ACK' || status === 2)
            return Message_1.MessageStatus.Sended;
        if (status === 'DELIVERY_ACK' || status === 3)
            return Message_1.MessageStatus.Received;
        if (status === 'READ' || status === 4)
            return Message_1.MessageStatus.Readed;
        if (status === 'PLAYED' || status === 5)
            return Message_1.MessageStatus.Played;
        return Message_1.MessageStatus.Sending;
    }
    static isMessageUpdate(waMessage) {
        return (!!waMessage &&
            typeof waMessage === 'object' &&
            !!waMessage?.update &&
            typeof waMessage?.update === 'object' &&
            waMessage?.update?.status !== undefined);
    }
}
exports.default = ConvertWAMessage;
//# sourceMappingURL=ConvertWAMessage.js.map