"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPollVoteChange = exports.decryptPollVoteWithCandidates = exports.getPollJidCandidates = exports.getPollCreatorJid = exports.getPollVoterId = exports.normalizePollJid = exports.getPollCreationContent = void 0;
const baileys_1 = require("baileys");
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
/**
 * Remove o sufixo de dispositivo (`:4`) de um JID.
 * A chave do voto é derivada do JID do usuário, sem dispositivo (igual ao `getKeyAuthor` do Baileys).
 */
function normalizePollJid(jid) {
    if (!jid)
        return '';
    try {
        return (0, baileys_1.jidNormalizedUser)(String(jid)) || String(jid);
    }
    catch (_a) {
        return String(jid);
    }
}
exports.normalizePollJid = normalizePollJid;
/** Mesma precedência do `getKeyAuthor` do Baileys: PN alternativo primeiro, depois o ID do envio. */
function getPollVoterId(message, botId) {
    var _a;
    if ((_a = message === null || message === void 0 ? void 0 : message.key) === null || _a === void 0 ? void 0 : _a.fromMe)
        return normalizePollJid(botId);
    const key = (message === null || message === void 0 ? void 0 : message.key) || {};
    return normalizePollJid(key.participantAlt
        || (message === null || message === void 0 ? void 0 : message.participantAlt)
        || key.remoteJidAlt
        || (message === null || message === void 0 ? void 0 : message.remoteJidAlt)
        || key.participant
        || (message === null || message === void 0 ? void 0 : message.participant)
        || key.remoteJid
        || '');
}
exports.getPollVoterId = getPollVoterId;
function getPollCreatorJid(message, botId) {
    var _a;
    if ((_a = message === null || message === void 0 ? void 0 : message.key) === null || _a === void 0 ? void 0 : _a.fromMe)
        return normalizePollJid(botId);
    const key = (message === null || message === void 0 ? void 0 : message.key) || {};
    return normalizePollJid(key.participantAlt
        || (message === null || message === void 0 ? void 0 : message.participantAlt)
        || key.remoteJidAlt
        || (message === null || message === void 0 ? void 0 : message.remoteJidAlt)
        || key.participant
        || (message === null || message === void 0 ? void 0 : message.participant)
        || key.remoteJid
        || '');
}
exports.getPollCreatorJid = getPollCreatorJid;
/** Lista única de JIDs normalizados, na ordem recebida (vazios descartados). */
function getPollJidCandidates(...ids) {
    return [...new Set(ids.map((id) => normalizePollJid(id)).filter(Boolean))];
}
exports.getPollJidCandidates = getPollJidCandidates;
/**
 * Tenta descriptografar o voto com cada combinação de criador e votante (PN e LID).
 * O AES-GCM só aceita a combinação usada pelo celular de quem votou, então a primeira que
 * passar é a correta.
 */
function decryptPollVoteWithCandidates(decrypt, creatorCandidates, voterCandidates) {
    let lastError = new Error('Poll vote has no creator or voter candidates');
    for (const creatorJid of creatorCandidates) {
        for (const voterJid of voterCandidates) {
            try {
                return { vote: decrypt(creatorJid, voterJid), creatorJid, voterJid };
            }
            catch (error) {
                lastError = error;
            }
        }
    }
    throw lastError;
}
exports.decryptPollVoteWithCandidates = decryptPollVoteWithCandidates;
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