"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createButtonSendOptions = exports.createInlineKeyboard = void 0;
function createInlineKeyboard(message) {
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
exports.createInlineKeyboard = createInlineKeyboard;
function createButtonSendOptions(message) {
    return { reply_markup: JSON.stringify(createInlineKeyboard(message)) };
}
exports.createButtonSendOptions = createButtonSendOptions;
//# sourceMappingURL=inline-keyboard.js.map