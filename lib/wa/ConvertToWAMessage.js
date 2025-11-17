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
     * * Refatora a mensagem
     * @param message
     */
    async refactory(message = this.message) {
        this.waMessage = await this.refactoryMessage(message);
        this.chatId = message.chat.id;
        if (message.mention && !this.isMention) {
            const { chatId, waMessage } = await new ConvertToWAMessage(this.bot, message.mention, true).refactory(message.mention);
            const userJid = message.mention.user.id
                ? message.mention.user.id
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
        if (!!message.user.id && (0, baileys_1.isJidGroup)(message.chat.id)) {
            msg.participant = message.user.id;
        }
        if (message.mentions) {
            msg.mentions = [];
            for (const jid of message.mentions) {
                msg.mentions.push(jid);
            }
            for (const mention of msg.text.split(/@(.*?)/)) {
                const mentionNumber = `${(0, ID_1.getPhoneNumber)(mention.split(/\s+/)[0])}`;
                if (!mentionNumber ||
                    mentionNumber.length < 9 ||
                    mentionNumber.length > 15)
                    continue;
                const jid = (0, ID_1.getID)(mentionNumber);
                if (msg.mentions.includes(jid))
                    continue;
                msg.mentions.push(jid);
            }
        }
        if (message.fromMe)
            msg.fromMe = message.fromMe;
        if (message.id)
            msg.id = message.id;
        if (message.isEdited) {
            msg.edit = {
                remoteJid: message.chat.id || '',
                id: message.id || '',
                fromMe: message.fromMe || message.user.id == this.bot.id,
                participant: (0, baileys_1.isJidGroup)(message.chat.id)
                    ? message.user.id || this.bot.id
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
            const vcard = 'BEGIN:VCARD\n' +
                'VERSION:3.0\n' +
                `FN:${''}\n` +
                (user.description ? `ORG:${user.description};\n` : '') +
                `TEL;type=CELL;type=VOICE;waid=${user.id}: ${user.id}\n` +
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
        this.waMessage = {
            react: {
                key: {
                    remoteJid: message.chat.id,
                    id: message.id || '',
                    fromMe: message.fromMe || !message.user.id
                        ? true
                        : message.user.id == this.bot.id,
                    participant: (0, baileys_1.isJidGroup)(message.chat.id)
                        ? message.user.id || this.bot.id
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
            },
        };
    }
    /**
     * * Refatora uma mensagem de botão
     * @param message
     */
    refactoryButtonMessage(message) {
        this.waMessage.text = message.text;
        this.waMessage.footer = message.footer;
        this.waMessage.viewOnce = true;
        if (message.type == Message_1.MessageType.TemplateButton) {
            this.waMessage.templateButtons = message.buttons.map((button) => {
                if (button.type == 'reply')
                    return {
                        index: button.index,
                        quickReplyButton: { displayText: button.text, id: button.content },
                    };
                if (button.type == 'call')
                    return {
                        index: button.index,
                        callButton: {
                            displayText: button.text,
                            phoneNumber: button.content,
                        },
                    };
                if (button.type == 'url')
                    return {
                        index: button.index,
                        urlButton: { displayText: button.text, url: button.content },
                    };
            });
        }
        else {
            this.waMessage.buttons = message.buttons.map((button) => {
                return {
                    buttonId: button.content,
                    buttonText: { displayText: button.text },
                    type: 1,
                };
            });
        }
    }
    /**
     * * Refatora uma mensagem de lista
     * @param message
     */
    async refactoryListMessage(message) {
        var _a, _b, _c, _d;
        if (message.interactiveMode) {
            this.isRelay = true;
            const listMessage = {
                name: 'single_select',
                buttonParamsJson: JSON.stringify({
                    title: message.button,
                    sections: message.list.map((list) => {
                        return {
                            title: list.title,
                            ...(list.label ? { label: list.label } : {}),
                            rows: list.items.map((item) => {
                                return {
                                    header: item.header ? item.header : item.title,
                                    title: item.header ? item.title : '',
                                    description: item.description,
                                    id: item.id,
                                };
                            }),
                        };
                    }),
                }),
            };
            const waMessage = (0, baileys_1.generateWAMessageFromContent)(this.chatId, {
                viewOnceMessage: {
                    message: {
                        messageContextInfo: {
                            deviceListMetadata: {},
                            deviceListMetadataVersion: 2,
                        },
                        interactiveMessage: {
                            body: {
                                text: message.text,
                            },
                            footer: {
                                text: message.footer,
                            },
                            header: {
                                title: message.title,
                                subtitle: message.subtitle,
                                hasMediaAttachment: false,
                            },
                            nativeFlowMessage: {
                                buttons: [listMessage],
                            },
                        },
                    },
                },
            }, { userJid: this.bot.id });
            this.waMessage = waMessage.message;
            return;
        }
        this.waMessage.buttonText = message.button;
        this.waMessage.description = message.text;
        this.waMessage.footer = message.footer;
        this.waMessage.title = message.title;
        this.waMessage.listType = message.listType;
        this.waMessage.viewOnce = false;
        this.isRelay = true;
        this.waMessage.sections = message.list.map((list) => {
            return {
                title: list.title,
                rows: list.items.map((item) => {
                    return {
                        title: item.title,
                        description: item.description,
                        rowId: item.id,
                    };
                }),
            };
        });
        if (this.isRelay) {
            this.waMessage = await (0, baileys_1.generateWAMessageContent)(this.waMessage, {
                upload: () => ({}),
            });
            if ((_c = (_b = (_a = this.waMessage) === null || _a === void 0 ? void 0 : _a.viewOnceMessage) === null || _b === void 0 ? void 0 : _b.message) === null || _c === void 0 ? void 0 : _c.listMessage) {
                this.waMessage.viewOnceMessage.message.listMessage.listType =
                    message.listType;
            }
            if ((_d = this.waMessage) === null || _d === void 0 ? void 0 : _d.listMessage) {
                this.waMessage.listMessage.listType = message.listType;
            }
        }
    }
    /**
     * * Refatora uma mensagem de lista
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