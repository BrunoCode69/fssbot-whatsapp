"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPollVoteChange = exports.getPollCreatorJid = exports.getPollVoterId = exports.getPollCreationContent = void 0;
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
function getPollVoterId(message, botId) {
    var _a;
    if ((_a = message === null || message === void 0 ? void 0 : message.key) === null || _a === void 0 ? void 0 : _a.fromMe)
        return botId;
    const key = (message === null || message === void 0 ? void 0 : message.key) || {};
    return String(key.participantAlt
        || (message === null || message === void 0 ? void 0 : message.participantAlt)
        || key.participant
        || (message === null || message === void 0 ? void 0 : message.participant)
        || key.remoteJidAlt
        || (message === null || message === void 0 ? void 0 : message.remoteJidAlt)
        || key.remoteJid
        || '');
}
exports.getPollVoterId = getPollVoterId;
function getPollCreatorJid(message, botId) {
    var _a;
    if ((_a = message === null || message === void 0 ? void 0 : message.key) === null || _a === void 0 ? void 0 : _a.fromMe)
        return botId;
    const key = (message === null || message === void 0 ? void 0 : message.key) || {};
    return String(key.participantAlt
        || (message === null || message === void 0 ? void 0 : message.participantAlt)
        || key.participant
        || (message === null || message === void 0 ? void 0 : message.participant)
        || key.remoteJidAlt
        || (message === null || message === void 0 ? void 0 : message.remoteJidAlt)
        || key.remoteJid
        || '');
}
exports.getPollCreatorJid = getPollCreatorJid;
function getPollVoteChange(previousVotes, currentVotes) {
    const addedOption = currentVotes.find((option) => !previousVotes.includes(option));
    if (addedOption)
        return { action: 'add', option: addedOption };
    const removedOption = previousVotes.find((option) => !currentVotes.includes(option));
    if (removedOption)
        return { action: 'remove', option: removedOption };
    return undefined;
}
exports.getPollVoteChange = getPollVoteChange;
//# sourceMappingURL=poll-content.js.map