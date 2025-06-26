"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Message_1 = require("../messages/Message");
const LocationMessage_1 = __importDefault(require("../messages/LocationMessage"));
const ReactionMessage_1 = __importDefault(require("../messages/ReactionMessage"));
const ContactMessage_1 = __importDefault(require("../messages/ContactMessage"));
const StickerMessage_1 = __importDefault(require("../messages/StickerMessage"));
const MediaMessage_1 = __importDefault(require("../messages/MediaMessage"));
const ImageMessage_1 = __importDefault(require("../messages/ImageMessage"));
const AudioMessage_1 = __importDefault(require("../messages/AudioMessage"));
const VideoMessage_1 = __importDefault(require("../messages/VideoMessage"));
const EmptyMessage_1 = __importDefault(require("../messages/EmptyMessage"));
const TextMessage_1 = __importDefault(require("../messages/TextMessage"));
const FileMessage_1 = __importDefault(require("../messages/FileMessage"));
const PollMessage_1 = __importDefault(require("../messages/PollMessage"));
const User_1 = __importDefault(require("../modules/user/User"));
const TelegramUtils_1 = require("./TelegramUtils");
class TelegramToRompotConverter {
    constructor(telegramMessage) {
        this.telegramMessage = telegramMessage;
        this.rompotMessage = new EmptyMessage_1.default();
    }
    async convert(received) {
        if (!this.telegramMessage || typeof this.telegramMessage != 'object') {
            return this.rompotMessage;
        }
        this.rompotMessage.chat.id = TelegramUtils_1.TelegramUtils.getId(this.telegramMessage.chat);
        this.rompotMessage.chat.name = TelegramUtils_1.TelegramUtils.getName(this.telegramMessage.chat);
        this.rompotMessage.chat.type = TelegramUtils_1.TelegramUtils.getChatType(this.telegramMessage.chat);
        this.rompotMessage.chat.nickname = TelegramUtils_1.TelegramUtils.getNickname(this.telegramMessage.chat);
        this.rompotMessage.chat.phoneNumber = TelegramUtils_1.TelegramUtils.getPhoneNumber(this.telegramMessage.chat.id);
        this.rompotMessage.user.id = TelegramUtils_1.TelegramUtils.getId(this.telegramMessage.from);
        this.rompotMessage.user.name = TelegramUtils_1.TelegramUtils.getName(this.telegramMessage.from);
        this.rompotMessage.user.nickname = TelegramUtils_1.TelegramUtils.getNickname(this.telegramMessage.from);
        this.rompotMessage.user.phoneNumber = TelegramUtils_1.TelegramUtils.getPhoneNumber(this.telegramMessage.from.id);
        this.rompotMessage.id = `${this.telegramMessage.message_id}`;
        this.rompotMessage.text = `${this.telegramMessage.text || this.telegramMessage.caption || ''}`;
        this.rompotMessage.mentions = TelegramUtils_1.TelegramUtils.getMessageMentions(this.telegramMessage);
        this.rompotMessage.isEdited = !!this.telegramMessage.edit_date;
        if (received) {
            this.rompotMessage.status = Message_1.MessageStatus.Sended;
            this.rompotMessage.timestamp =
                Number(this.telegramMessage.date || 0) * 1000;
            this.rompotMessage.chat.timestamp = this.rompotMessage.timestamp;
        }
        if (this.telegramMessage.reply_to_message) {
            const convertor = new TelegramToRompotConverter(this.telegramMessage.reply_to_message);
            this.rompotMessage.mention = await convertor.convert(received);
        }
        this.convertText();
        this.convertMedia();
        this.convertAnimantion();
        this.convertPhoto();
        this.convertVideo();
        this.convertAudio();
        this.convertVoice();
        this.convertDocument();
        this.convertSticker();
        this.convertContact();
        this.convertDice();
        this.convertLocation();
        this.convertVenue();
        this.convertPoll();
        return this.rompotMessage;
    }
    convertText() {
        if (!('text' in this.telegramMessage))
            return;
        this.rompotMessage = TextMessage_1.default.fromJSON({
            ...this.rompotMessage,
            type: Message_1.MessageType.Text,
            text: TelegramUtils_1.TelegramUtils.getText(this.telegramMessage),
        });
    }
    convertMedia() {
        if (!('caption' in this.telegramMessage))
            return;
        this.rompotMessage = MediaMessage_1.default.fromJSON({
            ...this.rompotMessage,
            type: Message_1.MessageType.Media,
            text: TelegramUtils_1.TelegramUtils.getText(this.telegramMessage),
        });
    }
    convertAnimantion() {
        if (!this.telegramMessage.animation)
            return;
        this.rompotMessage = ImageMessage_1.default.fromJSON({
            ...this.rompotMessage,
            isGIF: true,
            type: Message_1.MessageType.Image,
            mimeType: this.telegramMessage.animation.mime_type,
            name: this.telegramMessage.animation.file_name,
            file: { stream: this.telegramMessage.animation },
        });
    }
    convertPhoto() {
        if (!this.telegramMessage.photo)
            return;
        this.rompotMessage = ImageMessage_1.default.fromJSON({
            ...this.rompotMessage,
            type: Message_1.MessageType.Image,
            file: {
                stream: this.telegramMessage.photo[this.telegramMessage.photo.length - 1 || 0] || {},
            },
        });
    }
    convertVideo() {
        if (!this.telegramMessage.video)
            return;
        this.rompotMessage = VideoMessage_1.default.fromJSON({
            ...this.rompotMessage,
            type: Message_1.MessageType.Video,
            mimeType: this.telegramMessage.video.mime_type,
            duration: this.telegramMessage.video.duration,
            file: { stream: this.telegramMessage.video },
        });
    }
    convertAudio() {
        if (!this.telegramMessage.audio)
            return;
        this.rompotMessage = AudioMessage_1.default.fromJSON({
            ...this.rompotMessage,
            type: Message_1.MessageType.Audio,
            mimeType: this.telegramMessage.audio.mime_type,
            duration: this.telegramMessage.audio.duration,
            name: this.telegramMessage.audio.title,
            file: { stream: this.telegramMessage.audio },
        });
    }
    convertVoice() {
        if (!this.telegramMessage.voice)
            return;
        this.rompotMessage = AudioMessage_1.default.fromJSON({
            ...this.rompotMessage,
            isPTT: true,
            type: Message_1.MessageType.Audio,
            mimeType: this.telegramMessage.voice.mime_type,
            duration: this.telegramMessage.voice.duration,
            file: { stream: this.telegramMessage.voice },
        });
    }
    convertDocument() {
        if (!this.telegramMessage.document)
            return;
        this.rompotMessage = FileMessage_1.default.fromJSON({
            ...this.rompotMessage,
            type: Message_1.MessageType.File,
            mimeType: this.telegramMessage.document.mime_type,
            name: this.telegramMessage.document.file_name,
            file: { stream: this.telegramMessage.document },
        });
    }
    convertSticker() {
        if (!this.telegramMessage.sticker)
            return;
        this.rompotMessage = StickerMessage_1.default.fromJSON({
            ...this.rompotMessage,
            type: Message_1.MessageType.Sticker,
            isGIF: !!(this.telegramMessage.sticker.is_animated ||
                this.telegramMessage.sticker.is_video),
            categories: this.telegramMessage.sticker.emoji
                ? [this.telegramMessage.sticker.emoji]
                : [],
            author: `${this.telegramMessage.sticker.set_name || ''}`,
            stickerId: `${this.telegramMessage.sticker.custom_emoji_id || ''}`,
            file: { stream: this.telegramMessage.sticker },
        });
    }
    convertContact() {
        if (!this.telegramMessage.contact)
            return;
        this.rompotMessage = ContactMessage_1.default.fromJSON({
            ...this.rompotMessage,
            type: Message_1.MessageType.Contact,
            users: [
                new User_1.default(TelegramUtils_1.TelegramUtils.getId(this.telegramMessage.contact), TelegramUtils_1.TelegramUtils.getName(this.telegramMessage.contact)),
            ],
        });
    }
    convertDice() {
        if (!this.telegramMessage.dice)
            return;
        this.rompotMessage = ReactionMessage_1.default.fromJSON({
            ...this.rompotMessage,
            type: Message_1.MessageType.Reaction,
            text: this.telegramMessage.dice.emoji,
        });
    }
    convertLocation() {
        if (!this.telegramMessage.location)
            return;
        this.rompotMessage = LocationMessage_1.default.fromJSON({
            ...this.rompotMessage,
            type: Message_1.MessageType.Location,
            latitude: this.telegramMessage.location.latitude,
            longitude: this.telegramMessage.location.longitude,
        });
    }
    convertVenue() {
        if (!this.telegramMessage.venue)
            return;
        this.rompotMessage = LocationMessage_1.default.fromJSON({
            ...this.rompotMessage,
            type: Message_1.MessageType.Location,
            latitude: this.telegramMessage.venue.location.latitude,
            longitude: this.telegramMessage.venue.location.longitude,
        });
    }
    convertPoll() {
        if (!this.telegramMessage.poll)
            return;
        this.rompotMessage = PollMessage_1.default.fromJSON({
            ...this.rompotMessage,
            type: Message_1.MessageType.Poll,
            text: this.telegramMessage.poll.question,
            options: this.telegramMessage.poll.options.map((option) => {
                return { id: option.text, name: option.text };
            }),
        });
    }
}
exports.default = TelegramToRompotConverter;
//# sourceMappingURL=TelegramToRompotConverter.js.map