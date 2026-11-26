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
exports.normalizeWhatsAppAudioMimetype = normalizeWhatsAppAudioMimetype;
const ListMessage_1 = __importDefault(require("../messages/ListMessage"));
const LocationMessage_1 = __importDefault(require("../messages/LocationMessage"));
const ReactionMessage_1 = __importDefault(require("../messages/ReactionMessage"));
const ContactMessage_1 = __importDefault(require("../messages/ContactMessage"));
const StickerMessage_1 = __importDefault(require("../messages/StickerMessage"));
const ButtonMessage_1 = __importStar(require("../messages/ButtonMessage"));
const MediaMessage_1 = __importDefault(require("../messages/MediaMessage"));
const ImageMessage_1 = __importDefault(require("../messages/ImageMessage"));
const AudioMessage_1 = __importDefault(require("../messages/AudioMessage"));
const VideoMessage_1 = __importDefault(require("../messages/VideoMessage"));
const PollMessage_1 = __importDefault(require("../messages/PollMessage"));
const Libs_1 = require("../utils/Libs");
const MediaUtils_1 = require("../utils/MediaUtils");
const ID_1 = require("./ID");
const reaction_key_1 = require("./reaction-key");
const interactive_list_payload_1 = require("./interactive-list-payload");
/**
 * Normaliza o mimetype de `AudioMessage` antes de enviar pelo ZapoJS/WhatsApp,
 * garantindo que contêineres MP4/M4A marcados por engano como `video/*` ou genéricos
 * não quebrem a entrega do `audioMessage` no WhatsApp.
 */
function normalizeWhatsAppAudioMimetype(mimetype, isPTT = false) {
    const raw = String(mimetype || '').trim();
    const base = raw.split(';')[0].trim().toLowerCase();
    if (!base || base === 'application/octet-stream') {
        return isPTT ? 'audio/ogg; codecs=opus' : 'audio/mp4';
    }
    if (base === 'video/mp4' || base === 'video/x-m4v' || base === 'video/3gpp') {
        return 'audio/mp4';
    }
    if (base === 'video/webm') {
        return 'audio/webm';
    }
    if (base === 'audio/ogg' && isPTT) {
        return 'audio/ogg; codecs=opus';
    }
    return raw;
}
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
        if (!jid || typeof jid !== 'string')
            return undefined;
        try {
            if (this.bot && typeof this.bot.resolveId === 'function') {
                return (await this.bot.resolveId(jid)) || undefined;
            }
            return (0, ID_1.normalizeJid)(jid) || undefined;
        }
        catch (error) {
            this.bot?.logger?.error?.('Error normalizing JID', { jid, error });
            return (0, ID_1.normalizeJid)(jid) || undefined;
        }
    }
    /**
     * * Refatora a mensagem para o formato ZapoJS
     */
    async refactory(message = this.message) {
        this.waMessage = await this.refactoryMessage(message);
        const chatId = await this.resolveJid(message.chat?.id);
        if (!chatId) {
            throw new Error(`Invalid chat ID: ${message.chat?.id}`);
        }
        this.chatId = chatId;
        if (message.mention && !this.isMention) {
            this.options.quote = await this.createQuoted(message.mention);
        }
        if (MediaMessage_1.default.isValid(message)) {
            await this.refactoryMediaMessage(message);
        }
        else if (LocationMessage_1.default.isValid(message)) {
            this.refactoryLocationMessage(message);
        }
        else if (ReactionMessage_1.default.isValid(message)) {
            await this.refactoryReactionMessage(message);
        }
        else if (ContactMessage_1.default.isValid(message)) {
            this.refactoryContactMessage(message);
        }
        else if (ButtonMessage_1.default.isValid(message)) {
            this.refactoryButtonMessage(message);
        }
        else if (ListMessage_1.default.isValid(message)) {
            await this.refactoryListMessage(message);
        }
        else if (PollMessage_1.default.isValid(message)) {
            this.refactoryPollMessage(message);
        }
        return this;
    }
    /**
     * Monta a mensagem citada (quote) para o envio.
     */
    async createQuoted(mention) {
        const rawKey = mention.extra?.key;
        if (rawKey?.id && rawKey.remoteJid) {
            return {
                remoteJid: rawKey.remoteJid,
                id: rawKey.id,
                fromMe: !!rawKey.fromMe,
                participant: rawKey.participant || undefined,
            };
        }
        const remoteJid = (await this.resolveJid(mention.chat?.id)) || this.chatId;
        const participant = (await this.resolveJid(mention.user?.id)) || undefined;
        const fromMe = !!mention.fromMe || (this.bot?.id ? participant === this.bot.id : false);
        return {
            remoteJid,
            id: mention.id || '',
            fromMe,
            participant: (0, ID_1.isGroupJid)(remoteJid) && !fromMe ? participant : undefined,
        };
    }
    /**
     * Refatora texto, menções e campos base da mensagem
     */
    async refactoryMessage(message) {
        const text = message.text || '';
        const normalizedChatId = await this.resolveJid(message.chat?.id);
        const normalizedUserId = await this.resolveJid(message.user?.id);
        const mentions = [];
        if (message.mentions) {
            for (const jid of message.mentions) {
                const normalizedJid = await this.resolveJid(jid);
                if (normalizedJid && !mentions.includes(normalizedJid)) {
                    mentions.push(normalizedJid);
                }
            }
            for (const mention of `${text}`.split(/@(.*?)/)) {
                const mentionNumber = `${mention.split(/\s+/)[0] || ''}`.replace(/\D+/g, '');
                if (!mentionNumber || mentionNumber.length < 9 || mentionNumber.length > 15) {
                    continue;
                }
                const jid = await this.resolveJid((0, ID_1.getID)(mentionNumber));
                if (jid && !mentions.includes(jid)) {
                    mentions.push(jid);
                }
            }
        }
        if (mentions.length) {
            this.options.mentions = mentions;
            this.options.contextInfo = {
                ...(this.options.contextInfo || {}),
                mentionedJid: mentions,
            };
        }
        if (message.isEdited) {
            const key = this.bot && typeof this.bot.getMessageKey === 'function'
                ? await this.bot.getMessageKey(message)
                : null;
            return {
                type: 'text',
                text,
                editKey: {
                    remoteJid: key?.remoteJid || normalizedChatId || '',
                    id: message.id || '',
                    fromMe: key ? !!key.fromMe : message.fromMe || normalizedUserId === this.bot?.id,
                    participant: key?.participant || undefined,
                },
            };
        }
        return {
            type: 'text',
            text,
        };
    }
    /**
     * Refatora mensagens de mídia (imagem, vídeo, áudio, documento, figurinha)
     */
    /**
     * Conteúdo da mídia para o Zapo: caminho de arquivo local é repassado como string (o Zapo
     * lê em stream, sem carregar tudo em memória); os demais casos viram Buffer.
     */
    async getMediaInput(message) {
        if (this.isMention)
            return Buffer.from('');
        if ((0, MediaUtils_1.isLocalFilePath)(message.file))
            return message.file;
        return await message.getStream();
    }
    /** Metadados opcionais (só quando conhecidos) para o envio. */
    static getMediaFields(message, duration) {
        const fields = {};
        if (message.width > 0 && message.height > 0) {
            fields.width = message.width;
            fields.height = message.height;
        }
        if (duration > 0)
            fields.seconds = Math.round(duration);
        return fields;
    }
    async refactoryMediaMessage(message) {
        if (StickerMessage_1.default.isValid(message)) {
            await this.refactoryStickerMessage(message);
            return;
        }
        const media = await this.getMediaInput(message);
        if (AudioMessage_1.default.isValid(message)) {
            // `ptt` = mensagem de voz.
            this.waMessage = {
                type: 'audio',
                media,
                ptt: !!message.isPTT,
                mimetype: normalizeWhatsAppAudioMimetype(message.mimetype, !!message.isPTT),
                ...ConvertToWAMessage.getMediaFields(message, message.duration),
            };
        }
        else if (ImageMessage_1.default.isValid(message) &&
            message.isGIF &&
            `${message.mimetype || ''}`.startsWith('video/')) {
            // GIF vindo como vídeo (ex.: animação do Telegram): vídeo com reprodução de GIF.
            this.waMessage = {
                type: 'video',
                media,
                caption: this.message.text || undefined,
                gifPlayback: true,
                viewOnce: !!message.viewOnce,
                mimetype: message.mimetype,
                ...ConvertToWAMessage.getMediaFields(message),
            };
        }
        else if (ImageMessage_1.default.isValid(message)) {
            this.waMessage = {
                type: 'image',
                media,
                caption: this.message.text || undefined,
                viewOnce: !!message.viewOnce,
                mimetype: message.mimetype || 'image/jpeg',
                ...ConvertToWAMessage.getMediaFields(message),
            };
        }
        else if (VideoMessage_1.default.isValid(message) && message.isPTV) {
            // Vídeo redondo: tipo próprio do Zapo (`ptvMessage`), sem legenda.
            this.waMessage = {
                type: 'ptv',
                media,
                mimetype: message.mimetype || 'video/mp4',
                ...ConvertToWAMessage.getMediaFields(message, message.duration),
            };
        }
        else if (VideoMessage_1.default.isValid(message)) {
            this.waMessage = {
                type: 'video',
                media,
                caption: this.message.text || undefined,
                gifPlayback: !!message.isGIF,
                viewOnce: !!message.viewOnce,
                mimetype: message.mimetype || 'video/mp4',
                ...ConvertToWAMessage.getMediaFields(message, message.duration),
            };
        }
        else {
            const mimetype = message.mimetype || 'application/octet-stream';
            this.waMessage = {
                type: 'document',
                media,
                fileName: message.name || (0, MediaUtils_1.getDefaultMediaFileName)(mimetype),
                mimetype,
                caption: this.message.text || undefined,
            };
        }
    }
    async refactoryStickerMessage(message) {
        const waSticker = this.isMention ? undefined : await (0, Libs_1.getWaSticker)();
        // Sem wa-sticker o arquivo local vai como caminho (stream), sem ler em memória.
        if (!waSticker) {
            this.waMessage = {
                type: 'sticker',
                media: await this.getMediaInput(message),
            };
            return;
        }
        const stickerFile = await message.getSticker();
        try {
            const sticker = new waSticker.default(stickerFile, {
                pack: message.pack,
                author: message.author,
                categories: message.categories,
                id: message.stickerId,
                type: waSticker.StickerTypes.FULL,
                quality: 100,
            });
            const built = await sticker.toMessage();
            if (built?.stickerMessage) {
                this.waMessage = {
                    stickerMessage: built.stickerMessage,
                };
                return;
            }
        }
        catch (err) {
            this.bot?.emit('error', err);
        }
        this.waMessage = {
            type: 'sticker',
            media: stickerFile,
        };
    }
    refactoryLocationMessage(message) {
        this.waMessage = {
            locationMessage: {
                degreesLatitude: message.latitude,
                degreesLongitude: message.longitude,
                name: message.name || undefined,
                address: message.address || undefined,
                url: message.url || undefined,
            },
            location: {
                latitude: message.latitude,
                longitude: message.longitude,
                name: message.name || undefined,
                address: message.address || undefined,
                url: message.url || undefined,
            },
        };
    }
    refactoryContactMessage(message) {
        const contacts = [];
        for (const user of message.contacts || []) {
            const rawId = user.id || '';
            const normalizedUserId = this.bot?.canonicalId
                ? this.bot.canonicalId(rawId)
                : (0, ID_1.normalizeJid)(rawId);
            const phoneNumber = (0, ID_1.getPhoneNumber)(normalizedUserId || rawId);
            const displayName = user.name || message.text || rawId;
            const vcard = 'BEGIN:VCARD\n' +
                'VERSION:3.0\n' +
                `FN:${displayName}\n` +
                (user.description ? `ORG:${user.description};\n` : '') +
                (phoneNumber ? `TEL;type=CELL;type=VOICE;waid=${phoneNumber}: ${phoneNumber}\n` : '') +
                'END:VCARD';
            contacts.push({ displayName, vcard });
        }
        if (contacts.length === 1) {
            this.waMessage = {
                contactMessage: contacts[0],
                contacts: {
                    displayName: message.text,
                    contacts,
                },
            };
        }
        else {
            this.waMessage = {
                contactsArrayMessage: {
                    displayName: message.text,
                    contacts,
                },
                contacts: {
                    displayName: message.text,
                    contacts,
                },
            };
        }
        delete this.waMessage.text;
    }
    async refactoryReactionMessage(message) {
        const rawKey = message.extra?.key;
        const normalizedChatId = await this.resolveJid(message.chat?.id);
        const normalizedUserId = await this.resolveJid(message.user?.id);
        const normalizedBotId = this.bot?.id;
        const reactionKey = rawKey?.id && rawKey.id === message.id && rawKey.remoteJid
            ? {
                remoteJid: rawKey.remoteJid,
                id: rawKey.id,
                fromMe: !!rawKey.fromMe,
                participant: rawKey.fromMe ? undefined : rawKey.participant || undefined,
            }
            : (0, reaction_key_1.createReactionKey)(normalizedChatId || message.chat?.id || '', message.id, message.fromMe, normalizedUserId, normalizedBotId, !!normalizedChatId && (0, ID_1.isGroupJid)(normalizedChatId));
        this.waMessage = {
            type: 'reaction',
            emoji: message.text || '',
            target: reactionKey,
            react: {
                key: reactionKey,
                text: message.text || '',
            },
        };
    }
    refactoryPollMessage(message) {
        this.waMessage = {
            type: 'poll',
            name: message.text || '',
            options: (message.options || []).map((opt) => opt.name),
            selectableCount: Number(message.extra?.selectableCount || 1),
            poll: {
                name: message.text || '',
                values: (message.options || []).map((opt) => opt.name),
                selectableCount: Number(message.extra?.selectableCount || 1),
            },
        };
    }
    refactoryButtonMessage(message) {
        if (!message.buttons || message.buttons.length === 0) {
            throw new Error('ButtonMessage deve ter pelo menos um botão');
        }
        if (message.buttons.length > 3) {
            throw new Error('ButtonMessage suporta no máximo 3 botões');
        }
        const buttons = message.buttons.map((button, index) => {
            const type = button.type || 'reply';
            if (type === 'url' || type === ButtonMessage_1.ButtonType.Url) {
                return {
                    name: 'cta_url',
                    buttonParamsJson: JSON.stringify({
                        display_text: button.text,
                        url: button.content,
                        merchant_url: button.content,
                    }),
                };
            }
            if (type === 'call' || type === ButtonMessage_1.ButtonType.Call) {
                return {
                    name: 'cta_call',
                    buttonParamsJson: JSON.stringify({
                        display_text: button.text,
                        phone_number: button.content,
                    }),
                };
            }
            if (type === 'copy' || type === ButtonMessage_1.ButtonType.Copy) {
                return {
                    name: 'cta_copy',
                    buttonParamsJson: JSON.stringify({
                        display_text: button.text,
                        copy_code: button.content,
                    }),
                };
            }
            return {
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({
                    display_text: button.text,
                    id: button.content || `btn_${index}`,
                }),
            };
        });
        this.waMessage = {
            __useBaileysHelper: true,
            text: message.text || '',
            footer: message.footer || undefined,
            interactiveButtons: buttons,
        };
    }
    async refactoryListMessage(message) {
        if (!message.list || message.list.length === 0) {
            throw new Error('Lista deve ter pelo menos uma seção');
        }
        const hasItems = message.list.some((list) => list.items && list.items.length > 0);
        if (!hasItems) {
            throw new Error('Lista deve ter pelo menos um item');
        }
        this.waMessage = (0, interactive_list_payload_1.createInteractiveListPayload)(message);
    }
    static convertToWaMessageStatus(status) {
        return status;
    }
}
exports.default = ConvertToWAMessage;
//# sourceMappingURL=ConvertToWAMessage.js.map