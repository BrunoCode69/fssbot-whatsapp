import TelegramBotAPI from 'node-telegram-bot-api';
import { Readable } from 'stream';
import LocationMessage from '../messages/LocationMessage';
import ReactionMessage from '../messages/ReactionMessage';
import ContactMessage from '../messages/ContactMessage';
import StickerMessage from '../messages/StickerMessage';
import MediaMessage from '../messages/MediaMessage';
import ImageMessage from '../messages/ImageMessage';
import AudioMessage from '../messages/AudioMessage';
import VideoMessage from '../messages/VideoMessage';
import TextMessage from '../messages/TextMessage';
import FileMessage from '../messages/FileMessage';
import PollMessage from '../messages/PollMessage';
import ButtonMessage from '../messages/ButtonMessage';
import ListMessage from '../messages/ListMessage';
import Message from '../messages/Message';
import type TelegramBot from './TelegramBot';
export default class TelegramSendingController {
    telegram: TelegramBot;
    constructor(telegram: TelegramBot);
    send(message: Message): Promise<Message>;
    sendMessage(message: Message): Promise<Message>;
    sendText(message: TextMessage): Promise<Message>;
    sendButtonMessage(message: ButtonMessage): Promise<Message>;
    sendList(message: ListMessage): Promise<Message>;
    sendReaction(message: ReactionMessage): Promise<Message>;
    sendContact(message: ContactMessage): Promise<Message>;
    sendLocation(message: LocationMessage): Promise<Message>;
    sendPoll(message: PollMessage): Promise<Message>;
    /**
     * Conteúdo do arquivo para envio: caminho de arquivo local vira stream de leitura
     * (sem carregar tudo em memória); os demais casos viram Buffer.
     */
    static getFileInput(message: MediaMessage): Promise<Buffer | Readable>;
    sendAudio(message: AudioMessage): Promise<Message>;
    sendImage(message: ImageMessage): Promise<Message>;
    sendVideo(message: VideoMessage): Promise<Message>;
    sendSticker(message: StickerMessage): Promise<Message>;
    sendFile(message: FileMessage): Promise<Message>;
    sendMedia(message: MediaMessage): Promise<Message>;
    sendEditedMessage(message: Message): Promise<void>;
    static getOptions(message: Message, options?: TelegramBotAPI.SendBasicOptions & TelegramBotAPI.SendAudioOptions & TelegramBotAPI.SendVoiceOptions & TelegramBotAPI.SendAnimationOptions & TelegramBotAPI.SendVideoOptions & TelegramBotAPI.SendDocumentOptions & TelegramBotAPI.SendContactOptions & TelegramBotAPI.SendLocationOptions & TelegramBotAPI.SendPollOptions & TelegramBotAPI.SendDiceOptions & TelegramBotAPI.EditMessageTextOptions): TelegramBotAPI.SendBasicOptions & TelegramBotAPI.SendAudioOptions & TelegramBotAPI.SendVoiceOptions & TelegramBotAPI.SendAnimationOptions & TelegramBotAPI.SendVideoOptions & TelegramBotAPI.SendDocumentOptions & TelegramBotAPI.SendContactOptions & TelegramBotAPI.SendLocationOptions & TelegramBotAPI.SendPollOptions & TelegramBotAPI.SendDiceOptions & TelegramBotAPI.EditMessageTextOptions;
    /** Opções do vídeo redondo: as mesmas do envio, sem legenda nem título. */
    static getVideoNoteOptions(options: Record<string, any>): TelegramBotAPI.SendVideoNoteOptions;
    static getFileOptions(message: MediaMessage, options?: TelegramBotAPI.FileOptions): TelegramBotAPI.FileOptions;
}
