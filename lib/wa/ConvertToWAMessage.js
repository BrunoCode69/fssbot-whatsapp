"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const baileys_1 = require("baileys");
const Message_1 = require("../messages/Message");
const ListMessage_1 = __importDefault(require("../messages/ListMessage"));
const LocationMessage_1 = __importDefault(require("../messages/LocationMessage"));
const ReactionMessage_1 = __importDefault(require("../messages/ReactionMessage"));
const ContactMessage_1 = __importDefault(require("../messages/ContactMessage"));
const StickerMessage_1 = __importDefault(require("../messages/StickerMessage"));
const ButtonMessage_1 = __importDefault(require("../messages/ButtonMessage"));
const MediaMessage_1 = __importDefault(require("../messages/MediaMessage"));
const ImageMessage_1 = __importDefault(require("../messages/ImageMessage"));
const AudioMessage_1 = __importDefault(require("../messages/AudioMessage"));
const VideoMessage_1 = __importDefault(require("../messages/VideoMessage"));
const PollMessage_1 = __importDefault(require("../messages/PollMessage"));
const Libs_1 = require("../utils/Libs");
const ID_1 = require("./ID");
const reaction_key_1 = require("./reaction-key");
const interactive_list_payload_1 = require("./interactive-list-payload");
class ConvertToWAMessage {
    constructor(bot, message, isMention = false) {
        this.chatId = '';
        this.waMessage = {};
        this.options = {};
        this.isRelay = false;
        this.message = message;
        this.bot = bot;
        this.isMention = !!isMention;
    }
    /**
     * Resolve um ID para o ID canônico usado no envio (PN quando conhecido, senão LID).
     */
    async resolveJid(jid) {
        var _a, _b;
        if (!jid || typeof jid !== 'string')
            return undefined;
        try {
            return (await this.bot.resolveId(jid)) || undefined;
        }
        catch (error) {
            (_b = (_a = this.bot.logger) === null || _a === void 0 ? void 0 : _a.error) === null || _b === void 0 ? void 0 : _b.call(_a, 'Error normalizing JID:', jid, error);
            return undefined;
        }
    }
    /**
     * * Refatora a mensagem
     * @param message
     */
    async refactory(message = this.message) {
        this.waMessage = await this.refactoryMessage(message);
        // Envia sempre para o ID canônico; o Baileys escolhe a sessão LID/PN internamente
        const chatId = await this.resolveJid(message.chat.id);
        if (!chatId) {
            throw new Error(`Invalid chat ID: ${message.chat.id}`);
        }
        this.chatId = chatId;
        if (message.mention && !this.isMention) {
            this.options.quoted = await this.createQuoted(message.mention);
        }
        if (MediaMessage_1.default.isValid(message))
            await this.refactoryMediaMessage(message);
        if (LocationMessage_1.default.isValid(message))
            this.refactoryLocationMessage(message);
        if (ReactionMessage_1.default.isValid(message))
            await this.refactoryReactionMessage(message);
        if (ContactMessage_1.default.isValid(message))
            this.refactoryContactMessage(message);
        if (ButtonMessage_1.default.isValid(message))
            this.refactoryButtonMessage(message);
        if (ListMessage_1.default.isValid(message))
            await this.refactoryListMessage(message);
        if (PollMessage_1.default.isValid(message))
            this.refactoryPollMessage(message);
        return this;
    }
    /**
     * Monta a mensagem citada. Usa a mensagem original do cache quando existe
     * (conteúdo e chave exatos); senão gera uma cópia a partir dos dados do Rompot.
     */
    async createQuoted(mention) {
        var _a, _b, _c, _d;
        const cached = this.bot.getCachedWAMessage(((_b = (_a = mention.extra) === null || _a === void 0 ? void 0 : _a.key) === null || _b === void 0 ? void 0 : _b.id) || mention.id);
        if ((_c = cached === null || cached === void 0 ? void 0 : cached.key) === null || _c === void 0 ? void 0 : _c.id)
            return cached;
        const { waMessage } = await new ConvertToWAMessage(this.bot, mention, true).refactory(mention);
        const key = await this.bot.getMessageKey(mention);
        const userJid = (await this.resolveJid((_d = mention.user) === null || _d === void 0 ? void 0 : _d.id)) || this.bot.id;
        const quoted = await (0, baileys_1.generateWAMessage)((key === null || key === void 0 ? void 0 : key.remoteJid) || this.chatId, waMessage, {
            userJid,
            upload() {
                return {};
            },
        });
        quoted.key.fromMe = key ? !!key.fromMe : userJid == this.bot.id;
        quoted.key.id = mention.id || quoted.key.id;
        quoted.key.remoteJid = (key === null || key === void 0 ? void 0 : key.remoteJid) || this.chatId;
        if ((0, ID_1.isGroupJid)(this.chatId) && !quoted.key.fromMe) {
            quoted.key.participant = (key === null || key === void 0 ? void 0 : key.participant) || userJid;
        }
        return quoted;
    }
    /**
     * * Refatora outras informações da mensagem
     * @param message
     * @returns
     */
    async refactoryMessage(message) {
        var _a;
        const msg = {};
        msg.text = message.text;
        const normalizedChatId = await this.resolveJid(message.chat.id);
        const normalizedUserId = await this.resolveJid(message.user.id);
        if (normalizedUserId && normalizedChatId && (0, ID_1.isGroupJid)(normalizedChatId)) {
            msg.participant = normalizedUserId;
        }
        if (message.mentions) {
            msg.mentions = [];
            for (const jid of message.mentions) {
                const normalizedJid = await this.resolveJid(jid);
                if (normalizedJid && !msg.mentions.includes(normalizedJid)) {
                    msg.mentions.push(normalizedJid);
                }
            }
            for (const mention of `${msg.text || ''}`.split(/@(.*?)/)) {
                const mentionNumber = `${mention.split(/\s+/)[0] || ''}`.replace(/\D+/g, '');
                if (!mentionNumber ||
                    mentionNumber.length < 9 ||
                    mentionNumber.length > 15)
                    continue;
                const jid = await this.resolveJid((0, ID_1.getID)(mentionNumber));
                if (!jid || msg.mentions.includes(jid))
                    continue;
                msg.mentions.push(jid);
            }
        }
        if (message.fromMe)
            msg.fromMe = message.fromMe;
        if (message.id)
            msg.id = message.id;
        if (message.isEdited) {
            const key = await this.bot.getMessageKey(message);
            msg.edit = {
                remoteJid: (key === null || key === void 0 ? void 0 : key.remoteJid) || normalizedChatId || '',
                id: message.id || '',
                fromMe: key ? !!key.fromMe : message.fromMe || normalizedUserId == this.bot.id,
                participant: (key === null || key === void 0 ? void 0 : key.participant) || undefined,
                toJSON: () => this,
            };
        }
        if ((_a = message.extra) === null || _a === void 0 ? void 0 : _a.isRelay) {
            this.isRelay = true;
        }
        return msg;
    }
    /**
     * * Refatora uma mensagem de midia
     * @param message
     */
    async refactoryMediaMessage(message) {
        let stream;
        if (!this.isMention) {
            stream = await message.getStream();
        }
        else {
            // Create fake stream
            stream = Buffer.from('');
        }
        // Convert audio message
        if (AudioMessage_1.default.isValid(message)) {
            this.waMessage.audio = stream;
            this.waMessage.ptt = !!message.isPTT;
            // Convert image message
        }
        else if (ImageMessage_1.default.isValid(message)) {
            this.waMessage.image = stream;
            // Convert video message
        }
        else if (VideoMessage_1.default.isValid(message)) {
            this.waMessage.video = stream;
            // Convert sticker message
        }
        else if (StickerMessage_1.default.isValid(message)) {
            await this.refatoryStickerMessage(message);
            // Convert default media message (includes file)
        }
        else {
            this.waMessage.document = stream;
        }
        this.waMessage.gifPlayback = !!(message === null || message === void 0 ? void 0 : message.isGIF);
        this.waMessage.caption = this.waMessage.text;
        this.waMessage.mimetype = message.mimetype;
        this.waMessage.fileName = message.name;
        delete this.waMessage.text;
    }
    async refatoryStickerMessage(message) {
        const stickerFile = await message.getSticker();
        this.waMessage = { ...this.waMessage, sticker: stickerFile };
        try {
            const waSticker = await (0, Libs_1.getWaSticker)();
            if (waSticker) {
                const sticker = new waSticker.default(stickerFile, {
                    pack: message.pack,
                    author: message.author,
                    categories: message.categories,
                    id: message.stickerId,
                    type: waSticker.StickerTypes.FULL,
                    quality: 100,
                });
                this.waMessage = { ...this.waMessage, ...(await sticker.toMessage()) };
            }
        }
        catch (err) {
            this.bot.emit('error', err);
        }
    }
    refactoryLocationMessage(message) {
        this.waMessage.location = {
            degreesLatitude: message.latitude,
            degreesLongitude: message.longitude,
        };
        delete this.waMessage.text;
    }
    refactoryContactMessage(message) {
        this.waMessage.contacts = {
            displayName: message.text,
            contacts: [],
        };
        for (const user of message.contacts) {
            const normalizedUserId = this.bot.canonicalId(user.id);
            if (!normalizedUserId)
                continue;
            const phoneNumber = (0, ID_1.getPhoneNumber)(normalizedUserId);
            if (!phoneNumber)
                continue;
            const displayName = user.name || message.text || user.id;
            const vcard = 'BEGIN:VCARD\n' +
                'VERSION:3.0\n' +
                `FN:${displayName}\n` +
                (user.description ? `ORG:${user.description};\n` : '') +
                `TEL;type=CELL;type=VOICE;waid=${phoneNumber}: ${phoneNumber}\n` +
                'END:VCARD';
            this.waMessage.contacts.contacts.push({
                displayName,
                vcard,
            });
        }
        delete this.waMessage.text;
    }
    /**
     * * Refatora uma mensagem de reação
     * @param message
     */
    async refactoryReactionMessage(message) {
        var _a;
        const rawKey = (_a = message.extra) === null || _a === void 0 ? void 0 : _a.key;
        const normalizedChatId = await this.resolveJid(message.chat.id);
        const normalizedUserId = await this.resolveJid(message.user.id);
        const normalizedBotId = this.bot.id;
        // Com a chave original, a reação aponta exatamente para a mensagem recebida
        const reactionKey = (rawKey === null || rawKey === void 0 ? void 0 : rawKey.id) && rawKey.id == message.id && rawKey.remoteJid
            ? {
                remoteJid: rawKey.remoteJid,
                id: rawKey.id,
                fromMe: !!rawKey.fromMe,
                participant: rawKey.fromMe ? undefined : rawKey.participant || undefined,
            }
            : (0, reaction_key_1.createReactionKey)(normalizedChatId || message.chat.id, message.id, message.fromMe, normalizedUserId, normalizedBotId, !!normalizedChatId && (0, ID_1.isGroupJid)(normalizedChatId));
        this.waMessage = {
            react: {
                key: {
                    ...reactionKey,
                    toJSON: () => this,
                },
                text: message.text,
            },
        };
    }
    /**
     * * Refatora uma mensagem de enquete
     * @param message
     */
    refactoryPollMessage(message) {
        var _a;
        this.waMessage = {
            poll: {
                name: message.text,
                values: message.options.map((opt) => opt.name),
                selectableCount: Number(((_a = message.extra) === null || _a === void 0 ? void 0 : _a.selectableCount) || 1),
            },
        };
    }
    /**
     * * Refatora uma mensagem de botão com formato simples
     * Converte para formato compatível com baileys
     * @param message
     */
    refactoryButtonMessage(message) {
        // Valida se há botões
        if (!message.buttons || message.buttons.length === 0) {
            throw new Error('ButtonMessage deve ter pelo menos um botão');
        }
        // Máximo de 3 botões
        if (message.buttons.length > 3) {
            throw new Error('ButtonMessage suporta no máximo 3 botões');
        }
        // Converte botões para formato baileys_helper
        const buttons = message.buttons.map((button, index) => ({
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({
                display_text: button.text,
                id: button.content || `btn_${index}`,
            }),
        }));
        // Marca para usar baileys_helper e gera formato interativo
        this.waMessage = {
            __useBaileysHelper: true,
            text: message.text || '',
            footer: message.footer || undefined,
            interactiveButtons: buttons,
        };
        this.isRelay = false;
    }
    /**
     * * Refatora uma mensagem de lista
      * Converte para o formato interativo single-select do helper WhatsApp
     * @param message
     */
    async refactoryListMessage(message) {
        // Valida se há pelo menos uma seção com itens
        if (!message.list || message.list.length === 0) {
            throw new Error('Lista deve ter pelo menos uma seção');
        }
        const hasItems = message.list.some((list) => list.items && list.items.length > 0);
        if (!hasItems) {
            throw new Error('Lista deve ter pelo menos um item');
        }
        this.waMessage = (0, interactive_list_payload_1.createInteractiveListPayload)(message);
        this.isRelay = false;
    }
    static convertToWaMessageStatus(status) {
        if (status == Message_1.MessageStatus.Error)
            return baileys_1.proto.WebMessageInfo.Status.ERROR;
        if (status == Message_1.MessageStatus.Sending)
            return baileys_1.proto.WebMessageInfo.Status.PENDING;
        if (status == Message_1.MessageStatus.Sended)
            return baileys_1.proto.WebMessageInfo.Status.SERVER_ACK;
        if (status == Message_1.MessageStatus.Received)
            return baileys_1.proto.WebMessageInfo.Status.DELIVERY_ACK;
        if (status == Message_1.MessageStatus.Readed)
            return baileys_1.proto.WebMessageInfo.Status.READ;
        if (status == Message_1.MessageStatus.Played)
            return baileys_1.proto.WebMessageInfo.Status.PLAYED;
        return baileys_1.proto.WebMessageInfo.Status.PENDING;
    }
}
exports.default = ConvertToWAMessage;
//# sourceMappingURL=ConvertToWAMessage.js.map