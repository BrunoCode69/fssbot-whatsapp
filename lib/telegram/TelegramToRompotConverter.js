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
const MediaUtils_1 = require("../utils/MediaUtils");
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
        this.rompotMessage.extra.telegramAnonymousAdmin =
            TelegramUtils_1.TelegramUtils.isAnonymousGroupAdminMessage(this.telegramMessage);
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
        this.convertVideoNote();
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
        const animation = this.telegramMessage.animation;
        this.rompotMessage = ImageMessage_1.default.fromJSON({
            ...this.rompotMessage,
            isGIF: true,
            type: Message_1.MessageType.Image,
            ...TelegramToRompotConverter.getMediaInfo(animation, 'video/mp4'),
            file: { stream: animation },
        });
    }
    convertPhoto() {
        if (!this.telegramMessage.photo)
            return;
        const photo = this.telegramMessage.photo[this.telegramMessage.photo.length - 1 || 0] ||
            {};
        this.rompotMessage = ImageMessage_1.default.fromJSON({
            ...this.rompotMessage,
            type: Message_1.MessageType.Image,
            // O Telegram recomprime fotos sempre em JPEG.
            ...TelegramToRompotConverter.getMediaInfo(photo, 'image/jpeg'),
            file: { stream: photo },
        });
    }
    convertVideo() {
        if (!this.telegramMessage.video)
            return;
        const video = this.telegramMessage.video;
        this.rompotMessage = VideoMessage_1.default.fromJSON({
            ...this.rompotMessage,
            type: Message_1.MessageType.Video,
            ...TelegramToRompotConverter.getMediaInfo(video, 'video/mp4'),
            duration: (0, MediaUtils_1.toMediaNumber)(video.duration),
            file: { stream: video },
        });
    }
    convertVideoNote() {
        if (!this.telegramMessage.video_note)
            return;
        const videoNote = this.telegramMessage.video_note;
        // Vídeo redondo: quadrado com lado `length`.
        const side = (0, MediaUtils_1.toMediaNumber)(videoNote.length);
        this.rompotMessage = VideoMessage_1.default.fromJSON({
            ...this.rompotMessage,
            type: Message_1.MessageType.Video,
            isPTV: true,
            ...TelegramToRompotConverter.getMediaInfo(videoNote, 'video/mp4'),
            width: side,
            height: side,
            duration: (0, MediaUtils_1.toMediaNumber)(videoNote.duration),
            file: { stream: videoNote },
        });
    }
    convertAudio() {
        if (!this.telegramMessage.audio)
            return;
        const audio = this.telegramMessage.audio;
        const info = TelegramToRompotConverter.getMediaInfo(audio, 'audio/mpeg');
        this.rompotMessage = AudioMessage_1.default.fromJSON({
            ...this.rompotMessage,
            type: Message_1.MessageType.Audio,
            ...info,
            name: info.name || `${audio.title || ''}`,
            duration: (0, MediaUtils_1.toMediaNumber)(audio.duration),
            file: { stream: audio },
        });
    }
    convertVoice() {
        if (!this.telegramMessage.voice)
            return;
        const voice = this.telegramMessage.voice;
        this.rompotMessage = AudioMessage_1.default.fromJSON({
            ...this.rompotMessage,
            isPTT: true,
            type: Message_1.MessageType.Audio,
            ...TelegramToRompotConverter.getMediaInfo(voice, 'audio/ogg'),
            duration: (0, MediaUtils_1.toMediaNumber)(voice.duration),
            file: { stream: voice },
        });
    }
    convertDocument() {
        if (!this.telegramMessage.document)
            return;
        // GIFs chegam com `animation` e também `document`; prevalece a animação.
        if (this.telegramMessage.animation)
            return;
        const document = this.telegramMessage.document;
        this.rompotMessage = FileMessage_1.default.fromJSON({
            ...this.rompotMessage,
            type: Message_1.MessageType.File,
            ...TelegramToRompotConverter.getMediaInfo(document, 'application/octet-stream'),
            file: { stream: document },
        });
    }
    convertSticker() {
        if (!this.telegramMessage.sticker)
            return;
        const sticker = this.telegramMessage.sticker;
        const mimetype = sticker.is_video
            ? 'video/webm'
            : sticker.is_animated
                ? 'application/x-tgsticker'
                : 'image/webp';
        this.rompotMessage = StickerMessage_1.default.fromJSON({
            ...this.rompotMessage,
            type: Message_1.MessageType.Sticker,
            ...TelegramToRompotConverter.getMediaInfo(sticker, mimetype),
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
    /**
     * Metadados comuns de um arquivo do Telegram (`mime_type`, `file_name`, `file_size`,
     * `width`, `height`) já nos nomes de campo do Rompot.
     */
    static getMediaInfo(file, defaultMimetype) {
        return {
            mimetype: `${file?.mime_type || defaultMimetype}`,
            name: `${file?.file_name || ''}`,
            size: (0, MediaUtils_1.toMediaNumber)(file?.file_size),
            width: (0, MediaUtils_1.toMediaNumber)(file?.width),
            height: (0, MediaUtils_1.toMediaNumber)(file?.height),
        };
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