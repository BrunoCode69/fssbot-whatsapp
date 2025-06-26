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
    convertAudio(): void;
    convertVoice(): void;
    convertDocument(): void;
    convertSticker(): void;
    convertContact(): void;
    convertDice(): void;
    convertLocation(): void;
    convertVenue(): void;
    convertPoll(): void;
}
