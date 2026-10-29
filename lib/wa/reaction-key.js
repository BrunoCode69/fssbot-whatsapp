"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createReactionKey = void 0;
function createReactionKey(chatId, messageId, messageFromMe, userId, botId, isGroup) {
    const fromMe = messageFromMe || !userId || userId === botId;
    return {
        remoteJid: chatId,
        id: messageId || '',
        fromMe,
        participant: isGroup && !fromMe ? userId : undefined,
    };
}
exports.createReactionKey = createReactionKey;
//# sourceMappingURL=reaction-key.js.map