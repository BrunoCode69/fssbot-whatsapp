"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createReactionMessageData = void 0;
function createReactionMessageData(base, content) {
    var _a;
    return {
        ...base,
        type: 'reaction',
        text: (content === null || content === void 0 ? void 0 : content.text) || '',
        id: ((_a = content === null || content === void 0 ? void 0 : content.key) === null || _a === void 0 ? void 0 : _a.id) || '',
    };
}
exports.createReactionMessageData = createReactionMessageData;
//# sourceMappingURL=reaction-message-data.js.map