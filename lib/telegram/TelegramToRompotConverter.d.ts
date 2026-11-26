import TelegramBotAPI from 'node-telegram-bot-api';
import Message from '../messages/Message';
export default class TelegramToRompotConverter {
    telegramMessage: TelegramBotAPI.Message;
    rompotMessage: Message;
    constructor(telegramMessage: TelegramBotAPI.Message);
    convert(received?: boolean): Promise<Message>;
    convertText(): void;
    convertMedia(): void;
    convertAnimantion(): void;
    convertPhoto(): void;
    convertVideo(): void;
    convertVideoNote(): void;
    convertAudio(): void;
    convertVoice(): void;
    convertDocument(): void;
    convertSticker(): void;
    /**
     * Metadados comuns de um arquivo do Telegram (`mime_type`, `file_name`, `file_size`,
     * `width`, `height`) já nos nomes de campo do Rompot.
     */
    static getMediaInfo(file: any, defaultMimetype: string): {
        mimetype: string;
        name: string;
        size: number;
        width: number;
        height: number;
    };
    convertContact(): void;
    convertDice(): void;
    convertLocation(): void;
    convertVenue(): void;
    convertPoll(): void;
}
