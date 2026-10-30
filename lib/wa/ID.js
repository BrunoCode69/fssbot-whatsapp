"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getID = exports.getPhoneNumber = exports.fixID = exports.extractAndMapLID = exports.registerKeyMappings = exports.getLIDFromMessage = exports.extractLID = exports.normalizeJid = exports.isBroadcastJid = exports.isNewsletterJid = exports.isGroupJid = exports.isUserJid = exports.isPnJid = exports.isLidJid = void 0;
const baileys_1 = require("baileys");
/**
 * Regras de identificação usadas pelo Rompot no WhatsApp (Baileys 7+):
 *
 * - Uma mesma pessoa tem dois JIDs: o PN (`5511999999999@s.whatsapp.net`) e o LID (`123456789@lid`).
 * - O Rompot usa **um único ID canônico** por pessoa: o PN quando o número é conhecido,
 *   e o LID apenas quando o WhatsApp não revela o número (ex.: grupos com número oculto).
 * - Sufixos de dispositivo (`:3`) e o domínio legado `@c.us` são sempre removidos.
 */
/** O ID é um LID (`@lid` ou `@hosted.lid`). */
function isLidJid(id) {
    return !!id && !!((0, baileys_1.isLidUser)(id) || (0, baileys_1.isHostedLidUser)(id));
}
exports.isLidJid = isLidJid;
/** O ID é um PN, ou seja, baseado em número de telefone (`@s.whatsapp.net` ou `@hosted`). */
function isPnJid(id) {
    return !!id && !!((0, baileys_1.isPnUser)(id) || (0, baileys_1.isHostedPnUser)(id));
}
exports.isPnJid = isPnJid;
/** O ID representa uma pessoa (PN ou LID), e não um grupo, canal ou lista. */
function isUserJid(id) {
    return isLidJid(id) || isPnJid(id);
}
exports.isUserJid = isUserJid;
/** O ID é de um grupo (`@g.us`). */
function isGroupJid(id) {
    return !!id && !!(0, baileys_1.isJidGroup)(id);
}
exports.isGroupJid = isGroupJid;
/** O ID é de um canal (`@newsletter`). */
function isNewsletterJid(id) {
    return !!id && !!(0, baileys_1.isJidNewsletter)(id);
}
exports.isNewsletterJid = isNewsletterJid;
/** O ID é de uma lista de transmissão ou do status (`@broadcast`). */
function isBroadcastJid(id) {
    return !!id && !!(0, baileys_1.isJidBroadcast)(id);
}
exports.isBroadcastJid = isBroadcastJid;
/**
 * Normaliza qualquer identificador para um JID sem dispositivo.
 * Aceita número puro (`+55 (11) 99999-9999`), PN, LID, grupo e o domínio legado `@c.us`.
 * @returns JID normalizado ou string vazia se o valor não for válido.
 */
function normalizeJid(id) {
    if (!id || typeof id !== 'string')
        return '';
    const value = id.trim();
    if (!value)
        return '';
    if (!value.includes('@')) {
        const digits = value.replace(/[\s()+\-.]/g, '');
        if (!/^\d{5,20}$/.test(digits))
            return '';
        return `${digits}@s.whatsapp.net`;
    }
    try {
        return (0, baileys_1.jidNormalizedUser)(value) || '';
    }
    catch (_a) {
        return '';
    }
}
exports.normalizeJid = normalizeJid;
/**
 * Extrai o LID de um identificador, se for um LID.
 * @returns LID normalizado ou null.
 */
function extractLID(id) {
    const normalized = normalizeJid(id);
    return isLidJid(normalized) ? normalized : null;
}
exports.extractLID = extractLID;
/**
 * Extrai o LID de uma chave de mensagem, considerando participant (grupos) e remoteJid,
 * além dos campos alternativos `participantAlt` e `remoteJidAlt` do Baileys 7.
 */
function getLIDFromMessage(key) {
    if (!key)
        return null;
    for (const value of [key.participant, key.participantAlt, key.remoteJid, key.remoteJidAlt]) {
        if (value && isLidJid(value))
            return normalizeJid(value);
    }
    return null;
}
exports.getLIDFromMessage = getLIDFromMessage;
/**
 * Registra no mapper os pares PN ↔ LID presentes numa chave de mensagem
 * (`remoteJid`/`remoteJidAlt` e `participant`/`participantAlt`).
 * @returns `true` se algum par novo foi aprendido.
 */
function registerKeyMappings(key, lidMapper) {
    if (!key || !lidMapper)
        return false;
    const a = lidMapper.register(key.remoteJid, key.remoteJidAlt);
    const b = lidMapper.register(key.participant, key.participantAlt);
    return a || b;
}
exports.registerKeyMappings = registerKeyMappings;
/**
 * Registra os pares PN ↔ LID de uma mensagem e retorna o ID do chat (normalizado)
 * e o LID do chat, quando houver.
 */
function extractAndMapLID(message, lidMapper) {
    const key = (message === null || message === void 0 ? void 0 : message.key) || {};
    registerKeyMappings({
        remoteJid: key.remoteJid,
        remoteJidAlt: key.remoteJidAlt || (message === null || message === void 0 ? void 0 : message.remoteJidAlt),
        participant: key.participant || (message === null || message === void 0 ? void 0 : message.participant),
        participantAlt: key.participantAlt || (message === null || message === void 0 ? void 0 : message.participantAlt),
    }, lidMapper);
    const id = normalizeJid(key.remoteJid || '');
    const lid = isLidJid(id) ? id : undefined;
    return { id, lid };
}
exports.extractAndMapLID = extractAndMapLID;
/**
 * Normaliza um identificador (remove dispositivo e `@c.us`).
 * Mantido por compatibilidade. Para obter o ID canônico de uma pessoa use
 * `WhatsAppBot.resolveId` ou `LIDMapper.canonical`.
 * @param id - Identificador principal (JID ou LID)
 * @param lid - LID alternativo (opcional)
 */
function fixID(id, lid) {
    if (lid && isLidJid(lid))
        return normalizeJid(lid);
    return normalizeJid(id) || (id === null || id === void 0 ? void 0 : id.replace(/:(.*)@/, '@')) || '';
}
exports.fixID = fixID;
/**
 * Extrai o número de telefone de um identificador.
 * Só retorna dígitos para PN ou número puro: o número de um LID é opaco e não é telefone.
 * @param id - Identificador (PN, LID ou número)
 * @returns Número de telefone sem formatação, ou string vazia.
 */
function getPhoneNumber(id) {
    if (!id || typeof id !== 'string')
        return '';
    if (!id.includes('@')) {
        const digits = id.replace(/\D+/g, '');
        return digits.length >= 5 ? digits : '';
    }
    const normalized = normalizeJid(id);
    if (!isPnJid(normalized))
        return '';
    return normalized.split('@')[0].replace(/\D+/g, '');
}
exports.getPhoneNumber = getPhoneNumber;
/**
 * Converte um número em um identificador JID
 * @param id - Número de telefone
 * @returns JID no formato número@s.whatsapp.net
 */
function getID(id) {
    id = String(`${id}`).trim();
    if (!id.includes('@'))
        return normalizeJid(id) || `${id}@s.whatsapp.net`;
    return id;
}
exports.getID = getID;
//# sourceMappingURL=ID.js.map