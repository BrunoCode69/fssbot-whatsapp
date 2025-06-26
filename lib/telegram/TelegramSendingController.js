"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const LocationMessage_1 = __importDefault(require("../messages/LocationMessage"));
const ReactionMessage_1 = __importDefault(require("../messages/ReactionMessage"));
const ContactMessage_1 = __importDefault(require("../messages/ContactMessage"));
const StickerMessage_1 = __importDefault(require("../messages/StickerMessage"));
const MediaMessage_1 = __importDefault(require("../messages/MediaMessage"));
const ImageMessage_1 = __importDefault(require("../messages/ImageMessage"));
const AudioMessage_1 = __importDefault(require("../messages/AudioMessage"));
const VideoMessage_1 = __importDefault(require("../messages/VideoMessage"));
const TextMessage_1 = __importDefault(require("../messages/TextMessage"));
const FileMessage_1 = __importDefault(require("../messages/FileMessage"));
const PollMessage_1 = __importDefault(require("../messages/PollMessage"));
const TelegramToRompotConverter_1 = __importDefault(require("./TelegramToRompotConverter"));
const TelegramUtils_1 = require("./TelegramUtils");
class TelegramSendingController {
    constructor(telegram) {
        this.telegram = telegram;
    }
    async send(message) {
        if (TextMessage_1.default.isValid(message)) {
            return await this.sendText(message);
        }
        if (ReactionMessage_1.default.isValid(message)) {
            return await this.sendReaction(message);
        }
        if (ContactMessage_1.default.isValid(message)) {
            return await this.sendContact(message);
        }
        if (LocationMessage_1.default.isValid(message)) {
            return await this.sendLocation(message);
        }
        if (PollMessage_1.default.isValid(message)) {
            return await this.sendPoll(message);
        }
        if (AudioMessage_1.default.isValid(message)) {
            return await this.sendAudio(message);
        }
        if (ImageMessage_1.default.isValid(message)) {
            return await this.sendImage(message);
        }
        if (VideoMessage_1.default.isValid(message)) {
            return await this.sendVideo(message);
        }
        if (StickerMessage_1.default.isValid(message)) {
            return await this.sendSticker(message);
        }
        if (FileMessage_1.default.isValid(message)) {
            return await this.sendFile(message);
        }
        if (MediaMessage_1.default.isValid(message)) {
            return await this.sendMedia(message);
        }
        return await this.sendMessage(message);
    }
    async sendMessage(message) {
        const options = TelegramSendingController.getOptions(message);
        const telegramMessage = await this.telegram.bot.sendMessage(Number(message.chat.id), `${message.text}`, options);
        return await new TelegramToRompotConverter_1.default(telegramMessage).convert();
    }
    async sendText(message) {
        const options = TelegramSendingController.getOptions(message);
        const telegramMessage = await this.telegram.bot.sendMessage(Number(message.chat.id), `${message.text}`, options);
        return await new TelegramToRompotConverter_1.default(telegramMessage).convert();
    }
    async sendReaction(message) {
        const options = TelegramSendingController.getOptions(message);
        const telegramMessage = await this.telegram.bot.sendDice(Number(message.chat.id), options);
        return await new TelegramToRompotConverter_1.default(telegramMessage).convert();
    }
    async sendContact(message) {
        var _a;
        const options = TelegramSendingController.getOptions(message);
        const telegramMessage = await this.telegram.bot.sendContact(Number(message.chat.id), TelegramUtils_1.TelegramUtils.getPhoneNumber(((_a = message.contacts.shift()) === null || _a === void 0 ? void 0 : _a.id) || ''), `${message.text}`, options);
        return await new TelegramToRompotConverter_1.default(telegramMessage).convert();
    }
    async sendLocation(message) {
        const options = TelegramSendingController.getOptions(message);
        const telegramMessage = await this.telegram.bot.sendLocation(Number(message.chat.id), Number(message.latitude || 0), Number(message.longitude || 0), options);
        return await new TelegramToRompotConverter_1.default(telegramMessage).convert();
    }
    async sendPoll(message) {
        const options = TelegramSendingController.getOptions(message);
        const telegramMessage = await this.telegram.bot.sendPoll(Number(message.chat.id), `${message.text}`, message.options.map((option) => `${option.name || ''}`), options);
        return await new TelegramToRompotConverter_1.default(telegramMessage).convert();
    }
    async sendAudio(message) {
        const options = TelegramSendingController.getOptions(message);
        const fileOptions = TelegramSendingController.getFileOptions(message);
        if (message.isPTT) {
            var telegramMessage = await this.telegram.bot.sendVoice(Number(message.chat.id), await message.getStream(), options, fileOptions);
        }
        else {
            var telegramMessage = await this.telegram.bot.sendAudio(Number(message.chat.id), await message.getStream(), options, fileOptions);
        }
        return await new TelegramToRompotConverter_1.default(telegramMessage).convert();
    }
    async sendImage(message) {
        const options = TelegramSendingController.getOptions(message);
        const fileOptions = TelegramSendingController.getFileOptions(message);
        if (message.isGIF) {
            var telegramMessage = await this.telegram.bot.sendAnimation(Number(message.chat.id), await message.getStream(), options);
        }
        else {
            var telegramMessage = await this.telegram.bot.sendPhoto(Number(message.chat.id), await message.getStream(), options, fileOptions);
        }
        return await new TelegramToRompotConverter_1.default(telegramMessage).convert();
    }
    async sendVideo(message) {
        const options = TelegramSendingController.getOptions(message);
        const fileOptions = TelegramSendingController.getFileOptions(message);
        const telegramMessage = await this.telegram.bot.sendVideo(Number(message.chat.id), await message.getStream(), options, fileOptions);
        return await new TelegramToRompotConverter_1.default(telegramMessage).convert();
    }
    async sendSticker(message) {
        const options = TelegramSendingController.getOptions(message);
        const fileOptions = TelegramSendingController.getFileOptions(message);
        const telegramMessage = await this.telegram.bot.sendSticker(Number(message.chat.id), await message.getStream(), options, fileOptions);
        return await new TelegramToRompotConverter_1.default(telegramMessage).convert();
    }
    async sendFile(message) {
        const options = TelegramSendingController.getOptions(message);
        const fileOptions = TelegramSendingController.getFileOptions(message);
        const telegramMessage = await this.telegram.bot.sendDocument(Number(message.chat.id), await message.getStream(), options, fileOptions);
        return await new TelegramToRompotConverter_1.default(telegramMessage).convert();
    }
    async sendMedia(message) {
        const options = TelegramSendingController.getOptions(message);
        const fileOptions = TelegramSendingController.getFileOptions(message);
        const telegramMessage = await this.telegram.bot.sendDocument(Number(message.chat.id), await message.getStream(), options, fileOptions);
        return await new TelegramToRompotConverter_1.default(telegramMessage).convert();
    }
    async sendEditedMessage(message) {
        const options = TelegramSendingController.getOptions(message);
        if (MediaMessage_1.default.isValid(message)) {
            await this.telegram.bot.editMessageCaption(message.text, options);
        }
        else {
            await this.telegram.bot.editMessageText(message.text, options);
        }
    }
    static getOptions(message, options = {}) {
        options.chat_id = Number(message.chat.id || 0);
        options.message_id = Number(message.id || 0);
        options.caption_entities = message.mentions.reduce((entities, mention) => {
            const result = new RegExp(`@(${mention || ''})`).exec(`${message.text || ''}`);
            const searchedMention = result === null || result === void 0 ? void 0 : result.shift();
            if (searchedMention) {
                entities.push({
                    type: 'mention',
                    offset: (result === null || result === void 0 ? void 0 : result.index) || 0,
                    length: searchedMention.length,
                });
            }
            return entities;
        }, []);
        if (message.mention) {
            options.reply_to_message_id = Number(message.mention.id || 0);
        }
        if (MediaMessage_1.default.isValid(message)) {
            options.caption = `${message.text || ''}`;
            options.title = `${message.name || ''}`;
            if (AudioMessage_1.default.isValid(message)) {
                options.duration = Number(message.duration || 0);
            }
        }
        else if (ReactionMessage_1.default.isValid(message)) {
            options.emoji = `${message.text || ''}`;
        }
        if (message.extra) {
            Object.assign(options, message.extra);
        }
        return options;
    }
    static getFileOptions(message, options = {}) {
        options.filename = `${message.name || ''}`;
        options.contentType = `${message.mimetype || ''}`;
        return options;
    }
}
exports.default = TelegramSendingController;
//# sourceMappingURL=TelegramSendingController.js.map