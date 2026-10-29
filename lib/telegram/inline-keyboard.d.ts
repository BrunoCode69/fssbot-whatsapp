import type TelegramBotAPI from 'node-telegram-bot-api';
import ButtonMessage from '../messages/ButtonMessage';
export declare function createInlineKeyboard(message: ButtonMessage): TelegramBotAPI.InlineKeyboardMarkup;
export declare function createButtonSendOptions(message: ButtonMessage): TelegramBotAPI.SendMessageOptions;
