import type TelegramBotAPI from 'node-telegram-bot-api';
import ButtonMessage from '../messages/ButtonMessage';

export function createInlineKeyboard(message: ButtonMessage): TelegramBotAPI.InlineKeyboardMarkup {
  return {
    inline_keyboard: message.buttons.map((button) => {
      if (button.type === 'reply') {
        return [{ text: button.text, callback_data: button.content }];
      }
      if (button.type === 'url') {
        return [{ text: button.text, url: button.content }];
      }
      throw new Error(`O botão do tipo "${button.type}" não é suportado pelo Telegram. Use botões de resposta ou URL.`);
    }),
  };
}

export function createButtonSendOptions(message: ButtonMessage): TelegramBotAPI.SendMessageOptions {
  return { reply_markup: createInlineKeyboard(message) };
}