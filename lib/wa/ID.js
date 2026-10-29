"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getID = exports.getPhoneNumber = exports.fixID = exports.extractAndMapLID = exports.getLIDFromMessage = exports.extractLID = void 0;
/**
 * Extrai o LID (Local ID) de um identificador, se disponível
 * LIDs têm formato: número:sequência@lid
 * @param id - Identificador a ser verificado
 * @returns LID se encontrado, null caso contrário
 */
function extractLID(id) {
    if (!id || typeof id !== 'string')
        return null;
    // Formato LID: "123456789:10@lid"
    if (id.includes('@lid')) {
        return id;
    }
    return null;
}
exports.extractLID = extractLID;
/**
 * Extrai LID de uma chave de mensagem WAMessage
 * Considera participant (para grupos) e remoteJid
 * @param key - Chave da mensagem com remoteJid e/ou participant
 * @returns LID se encontrado, null caso contrário
 */
function getLIDFromMessage(key) {
    if (!key)
        return null;
    // Verifica participant primeiro (mensagens de grupo)
    if (key.participant && key.participant.includes('@lid')) {
        return key.participant;
    }
    // Verifica remoteJid
    if (key.remoteJid && key.remoteJid.includes('@lid')) {
        return key.remoteJid;
    }
    return null;
}
exports.getLIDFromMessage = getLIDFromMessage;
function extractAndMapLID(message, lidMapper) {
    const key = (message === null || message === void 0 ? void 0 : message.key) || {};
    const remoteJid = key.remoteJid || '';
    const remoteJidAlt = key.remoteJidAlt || (message === null || message === void 0 ? void 0 : message.remoteJidAlt) || '';
    const participant = key.participant || (message === null || message === void 0 ? void 0 : message.participant) || '';
    const participantAlt = key.participantAlt || (message === null || message === void 0 ? void 0 : message.participantAlt) || '';
    const registerAlternateIds = (first, second) => {
        const lid = first.includes('@lid') ? first : second.includes('@lid') ? second : '';
        const jid = lid === first ? second : first;
        if (lid && jid && !jid.includes('@lid'))
            lidMapper.register(lid, jid);
    };
    registerAlternateIds(remoteJid, remoteJidAlt);
    registerAlternateIds(participant, participantAlt);
    const lid = remoteJid.includes('@lid') ? remoteJid : undefined;
    return { id: remoteJid, lid };
}
exports.extractAndMapLID = extractAndMapLID;
/**
 * Normaliza um identificador, priorizando LID sobre JID
 * Remove formato antigo :número@ e retorna identificador limpo
 * @param id - Identificador principal (pode ser JID ou LID)
 * @param lid - LID alternativo (opcional, de remoteJidAlt por exemplo)
 * @returns Identificador normalizado (preferencialmente LID)
 */
function fixID(id, lid) {
    // Se temos LID explícito, usa ele
    if (lid && lid.includes('@lid')) {
        return lid;
    }
    // Se o ID já é um LID, retorna ele
    if (id && id.includes('@lid')) {
        return id;
    }
    // Remove formato antigo :número@ e retorna JID limpo
    return id.replace(/:(.*)@/, "@");
}
exports.fixID = fixID;
/**
 * Extrai o número de telefone de um identificador (JID ou LID)
 * @param id - Identificador (JID ou LID)
 * @returns Número de telefone sem formatação
 */
function getPhoneNumber(id) {
    return (id === null || id === void 0 ? void 0 : id.replace(/\D+/g, "")) || "0";
}
exports.getPhoneNumber = getPhoneNumber;
/**
 * Converte um número em um identificador JID
 * @param id - Número de telefone
 * @returns JID no formato número@s.whatsapp.net
 */
function getID(id) {
    id = String(`${id}`);
    if (!id.includes("@"))
        id = `${id}@s.whatsapp.net`;
    return id.trim();
}
exports.getID = getID;
//# sourceMappingURL=ID.js.map