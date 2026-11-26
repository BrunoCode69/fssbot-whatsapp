"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createReactionKey = createReactionKey;
function createReactionKey(chatId, messageId, messageFromMe, userId, botId, isGroup) {
    const fromMe = messageFromMe || !userId || userId === botId;
    return {
        remoteJid: chatId,
        id: messageId || '',
        fromMe,
        participant: isGroup && !fromMe ? userId : undefined,
    };
}
//# sourceMappingURL=reaction-key.js.map