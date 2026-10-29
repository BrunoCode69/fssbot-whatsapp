"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPollCreationContent = void 0;
function getPollCreationContent(messageContent) {
    var _a, _b, _c, _d, _e, _f;
    return (messageContent === null || messageContent === void 0 ? void 0 : messageContent.pollCreationMessage)
        || (messageContent === null || messageContent === void 0 ? void 0 : messageContent.pollCreationMessageV2)
        || (messageContent === null || messageContent === void 0 ? void 0 : messageContent.pollCreationMessageV3)
        || (messageContent === null || messageContent === void 0 ? void 0 : messageContent.pollCreationMessageV5)
        || ((_b = (_a = messageContent === null || messageContent === void 0 ? void 0 : messageContent.pollCreationMessageV4) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.pollCreationMessage)
        || ((_d = (_c = messageContent === null || messageContent === void 0 ? void 0 : messageContent.pollCreationMessageV4) === null || _c === void 0 ? void 0 : _c.message) === null || _d === void 0 ? void 0 : _d.pollCreationMessageV2)
        || ((_f = (_e = messageContent === null || messageContent === void 0 ? void 0 : messageContent.pollCreationMessageV4) === null || _e === void 0 ? void 0 : _e.message) === null || _f === void 0 ? void 0 : _f.pollCreationMessageV3);
}
exports.getPollCreationContent = getPollCreationContent;
//# sourceMappingURL=poll-content.js.map