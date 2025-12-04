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
const CustomMessage_1 = __importDefault(require("../messages/CustomMessage"));
const Libs_1 = require("../utils/Libs");
const ID_1 = require("./ID");
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
     * Normaliza um JID usando o método do WhatsAppBot
     */
    safeNormalizeJid(jid) {
        var _a, _b;
        if (!jid || typeof jid !== 'string')
            return undefined;
        try {
            if (jid.includes('@')) {
                return (0, baileys_1.jidNormalizedUser)(jid);
            }
            if (/^\d+$/.test(jid)) {
                return (0, baileys_1.jidNormalizedUser)(`${jid}@s.whatsapp.net`);
            }
            return undefined;
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
        // Normaliza o chatId
        const normalizedChatId = this.safeNormalizeJid(message.chat.id);
        if (!normalizedChatId) {
            throw new Error(`Invalid chat ID: ${message.chat.id}`);
        }
        this.chatId = normalizedChatId;
        if (message.mention && !this.isMention) {
            const { chatId, waMessage } = await new ConvertToWAMessage(this.bot, message.mention, true).refactory(message.mention);
            const userJid = message.mention.user.id
                ? this.safeNormalizeJid(message.mention.user.id) || (0, ID_1.fixID)(this.bot.id)
                : (0, ID_1.fixID)(this.bot.id);
            this.options.quoted = await (0, baileys_1.generateWAMessage)(chatId || this.chatId, waMessage, {
                userJid,
                upload() {
                    return {};
                },
            });
            this.options.quoted.key.fromMe = userJid == this.bot.id;
            this.options.quoted.key.id =
                message.mention.id || this.options.quoted.key.id;
            if (this.chatId.includes('@g')) {
                this.options.quoted.key.participant = userJid;
            }
        }
        if (MediaMessage_1.default.isValid(message))
            await this.refactoryMediaMessage(message);
        if (LocationMessage_1.default.isValid(message))
            this.refactoryLocationMessage(message);
        if (ReactionMessage_1.default.isValid(message))
            this.refactoryReactionMessage(message);
        if (ContactMessage_1.default.isValid(message))
            this.refactoryContactMessage(message);
        if (ButtonMessage_1.default.isValid(message))
            this.refactoryButtonMessage(message);
        if (ListMessage_1.default.isValid(message))
            await this.refactoryListMessage(message);
        if (PollMessage_1.default.isValid(message))
            this.refactoryPollMessage(message);
        if (CustomMessage_1.default.isValid(message))
            this.refactoryCustomMessage(message);
        return this;
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
        const normalizedChatId = this.safeNormalizeJid(message.chat.id);
        const normalizedUserId = this.safeNormalizeJid(message.user.id);
        if (normalizedUserId && normalizedChatId && (0, baileys_1.isJidGroup)(normalizedChatId)) {
            msg.participant = normalizedUserId;
        }
        if (message.mentions) {
            msg.mentions = [];
            for (const jid of message.mentions) {
                const normalizedJid = this.safeNormalizeJid(jid);
                if (normalizedJid) {
                    msg.mentions.push(normalizedJid);
                }
            }
            for (const mention of msg.text.split(/@(.*?)/)) {
                const mentionNumber = `${(0, ID_1.getPhoneNumber)(mention.split(/\s+/)[0])}`;
                if (!mentionNumber ||
                    mentionNumber.length < 9 ||
                    mentionNumber.length > 15)
                    continue;
                const jid = this.safeNormalizeJid((0, ID_1.getID)(mentionNumber));
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
            const normalizedEditChatId = this.safeNormalizeJid(message.chat.id);
            const normalizedEditUserId = this.safeNormalizeJid(message.user.id);
            msg.edit = {
                remoteJid: normalizedEditChatId || '',
                id: message.id || '',
                fromMe: message.fromMe || normalizedEditUserId == this.bot.id,
                participant: normalizedEditChatId && (0, baileys_1.isJidGroup)(normalizedEditChatId)
                    ? normalizedEditUserId || this.bot.id
                    : undefined,
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
            const normalizedUserId = this.safeNormalizeJid(user.id);
            if (!normalizedUserId)
                continue;
            const vcard = 'BEGIN:VCARD\n' +
                'VERSION:3.0\n' +
                `FN:${''}\n` +
                (user.description ? `ORG:${user.description};\n` : '') +
                `TEL;type=CELL;type=VOICE;waid=${normalizedUserId}: ${normalizedUserId}\n` +
                'END:VCARD';
            if (message.contacts.length < 2) {
                this.waMessage.contacts.contacts.push({ vcard });
                return;
            }
            this.waMessage.contacts.contacts.push({
                displayName: '',
                vcard,
            });
        }
        delete this.waMessage.text;
    }
    /**
     * * Refatora uma mensagem de reação
     * @param message
     */
    refactoryReactionMessage(message) {
        const normalizedChatId = this.safeNormalizeJid(message.chat.id);
        const normalizedUserId = this.safeNormalizeJid(message.user.id);
        this.waMessage = {
            react: {
                key: {
                    remoteJid: normalizedChatId || message.chat.id,
                    id: message.id || '',
                    fromMe: message.fromMe || !normalizedUserId
                        ? true
                        : normalizedUserId == this.bot.id,
                    participant: normalizedChatId && (0, baileys_1.isJidGroup)(normalizedChatId)
                        ? normalizedUserId || this.bot.id
                        : undefined,
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
        this.waMessage = {
            poll: {
                name: message.text,
                values: message.options.map((opt) => opt.name),
                selectableCount: message.multipleAnswers ? message.options.length : 1,
            },
        };
    }
    /**
     * * Refatora uma mensagem de botão
     * OPÇÃO 1: Formato simples (NÃO FUNCIONA mais no Baileys 7.x)
     * OPÇÃO 2: Usar baileys_helper (FUNCIONA, mas apenas no Mobile)
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
        // =========================================
        // OPÇÃO: Usar baileys_helper (recomendado)
        // =========================================
        // Marca para usar baileys_helper
        this.isRelay = true;
        // Converte botões para formato baileys_helper
        const interactiveButtons = message.buttons.map((button) => {
            if (button.type === 'reply') {
                return {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                        display_text: button.text,
                        id: button.content,
                    }),
                };
            }
            else if (button.type === 'url') {
                return {
                    name: 'cta_url',
                    buttonParamsJson: JSON.stringify({
                        display_text: button.text,
                        url: button.content,
                        merchant_url: button.content,
                    }),
                };
            }
            else if (button.type === 'call') {
                return {
                    name: 'cta_call',
                    buttonParamsJson: JSON.stringify({
                        display_text: button.text,
                        phone_number: button.content,
                    }),
                };
            }
            // Fallback para quick_reply se tipo desconhecido
            return {
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({
                    display_text: button.text,
                    id: button.content,
                }),
            };
        });
        // Usa baileys_helper (flag especial)
        this.waMessage = {
            __useBaileysHelper: true,
            text: message.text || '',
            footer: message.footer || undefined,
            interactiveButtons: interactiveButtons,
        };
    }
    /**
     * * Refatora uma mensagem de lista
     * OPÇÃO 1: Formato simples compatível com Web e Mobile ✅ (RECOMENDADO)
     * OPÇÃO 2: Formato interativo com baileys_helper (apenas Mobile)
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
        // =========================================
        // DECISÃO: Qual formato usar?
        // =========================================
        // Se interactiveMode está habilitado, usa baileys_helper (APENAS MOBILE)
        if (message.interactiveMode) {
            this.isRelay = true;
            // Converte para formato baileys_helper
            const listButton = {
                name: 'single_select',
                buttonParamsJson: JSON.stringify({
                    title: message.button || 'Ver Opções',
                    sections: message.list.map((list) => {
                        return {
                            title: list.title,
                            highlight_label: list.label || undefined,
                            rows: list.items.map((item) => {
                                return {
                                    header: item.header || undefined,
                                    title: item.title,
                                    description: item.description || undefined,
                                    id: item.id,
                                };
                            }),
                        };
                    }),
                }),
            };
            // Usa baileys_helper (flag especial)
            this.waMessage = {
                __useBaileysHelper: true,
                text: message.text || '',
                title: message.title || undefined,
                footer: message.footer || undefined,
                interactiveButtons: [listButton],
            };
            return;
        }
        // =========================================
        // Formato SIMPLES (compatível Web + Mobile) ✅
        // =========================================
        this.waMessage = {
            text: message.text || '',
            footer: message.footer || undefined,
            title: message.title || undefined,
            buttonText: message.button || 'Ver Opções',
            sections: message.list.map((list) => {
                return {
                    title: list.title,
                    rows: list.items.map((item) => {
                        return {
                            title: item.title,
                            description: item.description || undefined,
                            rowId: item.id,
                        };
                    }),
                };
            }),
        };
        // Não precisa de relay para o formato simples
        this.isRelay = false;
    }
    /**
     * * Refatora uma mensagem customizada
     * @param message
     */
    async refactoryCustomMessage(message) {
        delete this.waMessage['text'];
        Object.assign(this.waMessage, message.content);
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