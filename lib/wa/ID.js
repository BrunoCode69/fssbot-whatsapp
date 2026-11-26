"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isLidJid = isLidJid;
exports.isPnJid = isPnJid;
exports.isUserJid = isUserJid;
exports.isGroupJid = isGroupJid;
exports.isNewsletterJid = isNewsletterJid;
exports.isBroadcastJid = isBroadcastJid;
exports.normalizeJid = normalizeJid;
exports.extractLID = extractLID;
exports.getLIDFromMessage = getLIDFromMessage;
exports.registerKeyMappings = registerKeyMappings;
exports.extractAndMapLID = extractAndMapLID;
exports.fixID = fixID;
exports.getPhoneNumber = getPhoneNumber;
exports.getID = getID;
const zapo_js_1 = require("zapo-js");
/**
 * Regras de identificação usadas pelo Rompot no WhatsApp:
 *
 * - Uma mesma pessoa tem dois JIDs: o PN (`5511999999999@s.whatsapp.net`) e o LID (`123456789@lid`).
 * - O Rompot usa **um único ID canônico** por pessoa: o PN quando o número é conhecido,
 *   e o LID apenas quando o WhatsApp não revela o número (ex.: grupos com número oculto).
 * - Sufixos de dispositivo (`:3`) e o domínio legado `@c.us` são sempre removidos.
 */
/** O ID é um LID (`@lid` ou `@hosted.lid`). */
function isLidJid(id) {
    if (!id || typeof id !== 'string')
        return false;
    return id.endsWith('@lid') || id.endsWith('@hosted.lid') || (0, zapo_js_1.isLidJid)(id);
}
/** O ID é um PN, ou seja, baseado em número de telefone (`@s.whatsapp.net` ou `@hosted`). */
function isPnJid(id) {
    if (!id || typeof id !== 'string')
        return false;
    const bare = normalizeJid(id);
    return bare.endsWith('@s.whatsapp.net') || bare.endsWith('@hosted');
}
/** O ID representa uma pessoa (PN ou LID), e não um grupo, canal ou lista. */
function isUserJid(id) {
    return isLidJid(id) || isPnJid(id);
}
/** O ID é de um grupo (`@g.us`). */
function isGroupJid(id) {
    if (!id || typeof id !== 'string')
        return false;
    return id.endsWith('@g.us') || (0, zapo_js_1.isGroupJid)(id);
}
/** O ID é de um canal (`@newsletter`). */
function isNewsletterJid(id) {
    if (!id || typeof id !== 'string')
        return false;
    return id.endsWith('@newsletter') || (0, zapo_js_1.isNewsletterJid)(id);
}
/** O ID é de uma lista de transmissão ou do status (`@broadcast`). */
function isBroadcastJid(id) {
    if (!id || typeof id !== 'string')
        return false;
    return id.endsWith('@broadcast') || (0, zapo_js_1.isBroadcastJid)(id);
}
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
    // Remove o sufixo de dispositivo e converte @c.us para @s.whatsapp.net
    const cleaned = value.replace(/@c\.us$/, '@s.whatsapp.net');
    try {
        const normalized = (0, zapo_js_1.toUserJid)(cleaned);
        if (normalized)
            return normalized;
    }
    catch {
        // fallback se toUserJid falhar
    }
    // Fallback regex: remove :device da parte do usuário
    return cleaned.replace(/:[^@]+@/, '@');
}
/**
 * Extrai o LID de um identificador, se for um LID.
 * @returns LID normalizado ou null.
 */
function extractLID(id) {
    const normalized = normalizeJid(id);
    return isLidJid(normalized) ? normalized : null;
}
/**
 * Extrai o LID de uma chave de mensagem, considerando participant (grupos) e remoteJid,
 * além dos campos alternativos `participantAlt` e `remoteJidAlt`.
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
/**
 * Registra os pares PN ↔ LID de uma mensagem e retorna o ID do chat (normalizado)
 * e o LID do chat, quando houver.
 */
function extractAndMapLID(message, lidMapper) {
    const key = message?.key || {};
    registerKeyMappings({
        remoteJid: key.remoteJid,
        remoteJidAlt: key.remoteJidAlt || message?.remoteJidAlt,
        participant: key.participant || message?.participant,
        participantAlt: key.participantAlt || message?.participantAlt,
    }, lidMapper);
    const id = normalizeJid(key.remoteJid || '');
    const lid = isLidJid(id) ? id : undefined;
    return { id, lid };
}
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
    return normalizeJid(id) || id?.replace(/:(.*)@/, '@') || '';
}
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
/**
 * Converte um número em um identificador JID
 * @param id - Número de telefone
 * @returns JID no formato número@s.whatsapp.net
 */
function getID(id) {
    id = String(`${id}`).trim();
    if (!id.includes('@'))
        return normalizeJid(id) || `${id}@s.whatsapp.net`;
    return normalizeJid(id) || id;
}
//# sourceMappingURL=ID.js.map