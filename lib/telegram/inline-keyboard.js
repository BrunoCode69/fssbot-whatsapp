"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createInlineKeyboard = createInlineKeyboard;
exports.createButtonSendOptions = createButtonSendOptions;
function createInlineKeyboard(message) {
    return {
        inline_keyboard: message.buttons.map((button) => {
            if (button.type === 'reply') {
                return [{ text: button.text, callback_data: button.content }];
            }
            if (button.type === 'url') {
                return [{ text: button.text, url: button.content }];
            }
            if (button.type === 'copy') {
                return [{ text: button.text, copy_text: { text: button.content } }];
            }
            throw new Error(`O botão do tipo "${button.type}" não é suportado pelo Telegram. Use botões de resposta, URL ou cópia.`);
        }),
    };
}
function createButtonSendOptions(message) {
    return { reply_markup: JSON.stringify(createInlineKeyboard(message)) };
}
//# sourceMappingURL=inline-keyboard.js.map