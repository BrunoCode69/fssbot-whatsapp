"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPollCreationContent = getPollCreationContent;
exports.normalizePollJid = normalizePollJid;
exports.getPollVoterId = getPollVoterId;
exports.getPollCreatorJid = getPollCreatorJid;
exports.getPollJidCandidates = getPollJidCandidates;
exports.decryptPollVoteWithCandidates = decryptPollVoteWithCandidates;
exports.getPollVoteChange = getPollVoteChange;
const ID_1 = require("./ID");
function getPollCreationContent(messageContent) {
    return (messageContent?.pollCreationMessage ||
        messageContent?.pollCreationMessageV2 ||
        messageContent?.pollCreationMessageV3 ||
        messageContent?.pollCreationMessageV5 ||
        messageContent?.pollCreationMessageV6 ||
        messageContent?.pollCreationMessageV4?.message?.pollCreationMessage ||
        messageContent?.pollCreationMessageV4?.message?.pollCreationMessageV2 ||
        messageContent?.pollCreationMessageV4?.message?.pollCreationMessageV3);
}
/**
 * Remove o sufixo de dispositivo (`:4`) de um JID.
 * A chave do voto é derivada do JID do usuário, sem dispositivo.
 */
function normalizePollJid(jid) {
    if (!jid)
        return '';
    try {
        return (0, ID_1.normalizeJid)(String(jid)) || String(jid);
    }
    catch {
        return String(jid);
    }
}
/** Mesma precedência do `getKeyAuthor`: PN alternativo primeiro, depois o ID do envio. */
function getPollVoterId(message, botId) {
    if (message?.key?.fromMe)
        return normalizePollJid(botId);
    const key = message?.key || {};
    return normalizePollJid(key.participantAlt ||
        message?.participantAlt ||
        key.remoteJidAlt ||
        message?.remoteJidAlt ||
        key.participant ||
        message?.participant ||
        key.remoteJid ||
        '');
}
function getPollCreatorJid(message, botId) {
    if (message?.key?.fromMe)
        return normalizePollJid(botId);
    const key = message?.key || {};
    return normalizePollJid(key.participantAlt ||
        message?.participantAlt ||
        key.remoteJidAlt ||
        message?.remoteJidAlt ||
        key.participant ||
        message?.participant ||
        key.remoteJid ||
        '');
}
/** Lista única de JIDs normalizados, na ordem recebida (vazios descartados). */
function getPollJidCandidates(...ids) {
    return [...new Set(ids.map((id) => normalizePollJid(id)).filter(Boolean))];
}
/**
 * Tenta descriptografar o voto com cada combinação de criador e votante (PN e LID).
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
function getPollVoteChange(previousVotes, currentVotes) {
    const addedOption = currentVotes.find((option) => !previousVotes.includes(option));
    if (addedOption)
        return { action: 'add', option: addedOption };
    const removedOption = previousVotes.find((option) => !currentVotes.includes(option));
    if (removedOption)
        return { action: 'remove', option: removedOption };
    return undefined;
}
//# sourceMappingURL=poll-content.js.map