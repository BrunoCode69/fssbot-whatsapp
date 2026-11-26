"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = require("path");
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
const ButtonMessage_1 = __importDefault(require("../messages/ButtonMessage"));
const ListMessage_1 = __importDefault(require("../messages/ListMessage"));
const Message_1 = require("../messages/Message");
const MediaUtils_1 = require("../utils/MediaUtils");
const TelegramToRompotConverter_1 = __importDefault(require("./TelegramToRompotConverter"));
const TelegramUtils_1 = require("./TelegramUtils");
const inline_keyboard_1 = require("./inline-keyboard");
class TelegramSendingController {
    constructor(telegram) {
        this.telegram = telegram;
    }
    async send(message) {
        if (ButtonMessage_1.default.isValid(message)) {
            console.info('[Telegram buttons] dispatching ButtonMessage', {
                type: message.type,
                chatId: message.chat?.id,
                buttonCount: message.buttons?.length || 0,
                labels: message.buttons?.map((button) => button.text) || [],
            });
            return await this.sendButtonMessage(message);
        }
        if (ListMessage_1.default.isValid(message)) {
            return await this.sendList(message);
        }
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
    async sendButtonMessage(message) {
        if (message.buttons.length === 0) {
            throw new Error('Adicione ao menos um botão antes de enviar a mensagem.');
        }
        const options = (0, inline_keyboard_1.createButtonSendOptions)(message);
        if (message.footer) {
            message.text = `${message.text || ''}\n\n${message.footer}`;
        }
        console.info('[Telegram buttons] sending inline keyboard', {
            chatId: message.chat.id,
            textLength: String(message.text || '').length,
            keyboard: options.reply_markup,
        });
        const telegramMessage = await this.telegram.bot.sendMessage(Number(message.chat.id), `${message.text || ''}`, options);
        return await new TelegramToRompotConverter_1.default(telegramMessage).convert();
    }
    async sendList(message) {
        const inline_keyboard = [];
        for (const category of message.list || []) {
            for (const item of category.items || []) {
                inline_keyboard.push([
                    {
                        text: `${item.title}${item.description ? ` - ${item.description}` : ''}`,
                        callback_data: String(item.id || item.title),
                    },
                ]);
            }
        }
        let text = message.text || '';
        if (message.title) {
            text = `*${message.title}*\n\n${text}`;
        }
        if (message.footer) {
            text = `${text}\n\n_${message.footer}_`;
        }
        const options = {
            ...TelegramSendingController.getOptions(message),
            reply_markup: {
                inline_keyboard,
            },
        };
        const telegramMessage = await this.telegram.bot.sendMessage(Number(message.chat.id), text, options);
        return await new TelegramToRompotConverter_1.default(telegramMessage).convert();
    }
    async sendReaction(message) {
        const options = TelegramSendingController.getOptions(message);
        const telegramMessage = await this.telegram.bot.sendDice(Number(message.chat.id), options);
        return await new TelegramToRompotConverter_1.default(telegramMessage).convert();
    }
    async sendContact(message) {
        const options = TelegramSendingController.getOptions(message);
        const telegramMessage = await this.telegram.bot.sendContact(Number(message.chat.id), TelegramUtils_1.TelegramUtils.getPhoneNumber(message.contacts.shift()?.id || ''), `${message.text}`, options);
        return await new TelegramToRompotConverter_1.default(telegramMessage).convert();
    }
    async sendLocation(message) {
        const options = TelegramSendingController.getOptions(message);
        if (message.name && message.address) {
            const telegramMessage = await this.telegram.bot.sendVenue(Number(message.chat.id), Number(message.latitude || 0), Number(message.longitude || 0), message.name, message.address, options);
            return await new TelegramToRompotConverter_1.default(telegramMessage).convert();
        }
        const telegramMessage = await this.telegram.bot.sendLocation(Number(message.chat.id), Number(message.latitude || 0), Number(message.longitude || 0), options);
        return await new TelegramToRompotConverter_1.default(telegramMessage).convert();
    }
    async sendPoll(message) {
        const options = TelegramSendingController.getOptions(message) || {};
        if (message.extra?.selectableCount && Number(message.extra.selectableCount) > 1) {
            options.allows_multiple_answers = true;
        }
        options.is_anonymous = false;
        const telegramMessage = await this.telegram.bot.sendPoll(Number(message.chat.id), `${message.text}`, message.options.map((option) => `${option.name || ''}`), options);
        return await new TelegramToRompotConverter_1.default(telegramMessage).convert();
    }
    /**
     * Conteúdo do arquivo para envio: caminho de arquivo local vira stream de leitura
     * (sem carregar tudo em memória); os demais casos viram Buffer.
     */
    static async getFileInput(message) {
        if ((0, MediaUtils_1.isLocalFilePath)(message.file))
            return (0, fs_1.createReadStream)(message.file);
        return await message.getStream();
    }
    async sendAudio(message) {
        const options = TelegramSendingController.getOptions(message);
        const fileOptions = TelegramSendingController.getFileOptions(message);
        const file = await TelegramSendingController.getFileInput(message);
        // `isPTT` = mensagem de voz.
        if (message.isPTT) {
            var telegramMessage = await this.telegram.bot.sendVoice(Number(message.chat.id), file, options, fileOptions);
        }
        else {
            var telegramMessage = await this.telegram.bot.sendAudio(Number(message.chat.id), file, options, fileOptions);
        }
        return await new TelegramToRompotConverter_1.default(telegramMessage).convert();
    }
    async sendImage(message) {
        const options = TelegramSendingController.getOptions(message);
        const fileOptions = TelegramSendingController.getFileOptions(message);
        const file = await TelegramSendingController.getFileInput(message);
        if (message.isGIF) {
            var telegramMessage = await this.telegram.bot.sendAnimation(Number(message.chat.id), file, options);
        }
        else {
            var telegramMessage = await this.telegram.bot.sendPhoto(Number(message.chat.id), file, options, fileOptions);
        }
        return await new TelegramToRompotConverter_1.default(telegramMessage).convert();
    }
    async sendVideo(message) {
        const options = TelegramSendingController.getOptions(message);
        const fileOptions = TelegramSendingController.getFileOptions(message);
        const file = await TelegramSendingController.getFileInput(message);
        if (message.isPTV) {
            // Vídeo redondo (video note): sem legenda.
            var telegramMessage = await this.telegram.bot.sendVideoNote(Number(message.chat.id), file, TelegramSendingController.getVideoNoteOptions(options), fileOptions);
        }
        else if (message.isGIF) {
            var telegramMessage = await this.telegram.bot.sendAnimation(Number(message.chat.id), file, options);
        }
        else {
            var telegramMessage = await this.telegram.bot.sendVideo(Number(message.chat.id), file, options, fileOptions);
        }
        return await new TelegramToRompotConverter_1.default(telegramMessage).convert();
    }
    async sendSticker(message) {
        const options = TelegramSendingController.getOptions(message);
        const fileOptions = TelegramSendingController.getFileOptions(message);
        const telegramMessage = await this.telegram.bot.sendSticker(Number(message.chat.id), await TelegramSendingController.getFileInput(message), options, fileOptions);
        return await new TelegramToRompotConverter_1.default(telegramMessage).convert();
    }
    async sendFile(message) {
        const options = TelegramSendingController.getOptions(message);
        const fileOptions = TelegramSendingController.getFileOptions(message);
        const telegramMessage = await this.telegram.bot.sendDocument(Number(message.chat.id), await TelegramSendingController.getFileInput(message), options, fileOptions);
        return await new TelegramToRompotConverter_1.default(telegramMessage).convert();
    }
    async sendMedia(message) {
        const options = TelegramSendingController.getOptions(message);
        const fileOptions = TelegramSendingController.getFileOptions(message);
        const telegramMessage = await this.telegram.bot.sendDocument(Number(message.chat.id), await TelegramSendingController.getFileInput(message), options, fileOptions);
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
            const searchedMention = result?.shift();
            if (searchedMention) {
                entities.push({
                    type: 'mention',
                    offset: result?.index || 0,
                    length: searchedMention.length,
                });
            }
            return entities;
        }, []);
        if (message.mention) {
            options.reply_to_message_id = Number(message.mention.id || 0);
        }
        if (message.extra?.threadId !== undefined && message.extra?.threadId !== null && message.extra?.threadId !== '') {
            options.message_thread_id = Number(message.extra.threadId);
        }
        if (MediaMessage_1.default.isValid(message)) {
            options.caption = `${message.text || ''}`;
            options.title = `${message.name || ''}`;
            if (AudioMessage_1.default.isValid(message)) {
                options.duration = Number(message.duration || 0);
            }
            if (VideoMessage_1.default.isValid(message)) {
                if (message.duration > 0)
                    options.duration = Math.round(message.duration);
                if (message.width > 0 && message.height > 0) {
                    options.width = message.width;
                    options.height = message.height;
                }
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
    /** Opções do vídeo redondo: as mesmas do envio, sem legenda nem título. */
    static getVideoNoteOptions(options) {
        const videoNoteOptions = { ...options };
        delete videoNoteOptions.caption;
        delete videoNoteOptions.caption_entities;
        delete videoNoteOptions.title;
        delete videoNoteOptions.width;
        delete videoNoteOptions.height;
        return videoNoteOptions;
    }
    static getFileOptions(message, options = {}) {
        const isDocument = message.type == Message_1.MessageType.File || message.type == Message_1.MessageType.Media;
        // Documento sem nome: nome do arquivo local ou "document.<ext do mimetype>".
        // Nos demais tipos, sem nome a biblioteca usa o do arquivo local ou detecta pelo conteúdo.
        options.filename = `${message.name ||
            (isDocument
                ? (0, MediaUtils_1.isLocalFilePath)(message.file)
                    ? (0, path_1.basename)(message.file)
                    : (0, MediaUtils_1.getDefaultMediaFileName)(message.mimetype)
                : '')}`;
        options.contentType = `${message.mimetype || ''}`;
        return options;
    }
}
exports.default = TelegramSendingController;
//# sourceMappingURL=TelegramSendingController.js.map