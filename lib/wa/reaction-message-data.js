"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createReactionMessageData = createReactionMessageData;
function createReactionMessageData(base, content) {
    return {
        ...base,
        type: 'reaction',
        text: content?.text || '',
        id: content?.key?.id || '',
    };
}
//# sourceMappingURL=reaction-message-data.js.map