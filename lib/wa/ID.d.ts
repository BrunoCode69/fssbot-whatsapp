import type { LIDMapper } from './LIDMapper';
/**
 * Regras de identificação usadas pelo Rompot no WhatsApp (Baileys 7+):
 *
 * - Uma mesma pessoa tem dois JIDs: o PN (`5511999999999@s.whatsapp.net`) e o LID (`123456789@lid`).
 * - O Rompot usa **um único ID canônico** por pessoa: o PN quando o número é conhecido,
 *   e o LID apenas quando o WhatsApp não revela o número (ex.: grupos com número oculto).
 * - Sufixos de dispositivo (`:3`) e o domínio legado `@c.us` são sempre removidos.
 */
/** O ID é um LID (`@lid` ou `@hosted.lid`). */
export declare function isLidJid(id?: string | null): boolean;
/** O ID é um PN, ou seja, baseado em número de telefone (`@s.whatsapp.net` ou `@hosted`). */
export declare function isPnJid(id?: string | null): boolean;
/** O ID representa uma pessoa (PN ou LID), e não um grupo, canal ou lista. */
export declare function isUserJid(id?: string | null): boolean;
/** O ID é de um grupo (`@g.us`). */
export declare function isGroupJid(id?: string | null): boolean;
/** O ID é de um canal (`@newsletter`). */
export declare function isNewsletterJid(id?: string | null): boolean;
/** O ID é de uma lista de transmissão ou do status (`@broadcast`). */
export declare function isBroadcastJid(id?: string | null): boolean;
/**
 * Normaliza qualquer identificador para um JID sem dispositivo.
 * Aceita número puro (`+55 (11) 99999-9999`), PN, LID, grupo e o domínio legado `@c.us`.
 * @returns JID normalizado ou string vazia se o valor não for válido.
 */
export declare function normalizeJid(id?: string | null): string;
/**
 * Extrai o LID de um identificador, se for um LID.
 * @returns LID normalizado ou null.
 */
export declare function extractLID(id: string): string | null;
/**
 * Extrai o LID de uma chave de mensagem, considerando participant (grupos) e remoteJid,
 * além dos campos alternativos `participantAlt` e `remoteJidAlt` do Baileys 7.
 */
export declare function getLIDFromMessage(key: {
    remoteJid?: string | null;
    remoteJidAlt?: string | null;
    participant?: string | null;
    participantAlt?: string | null;
}): string | null;
/**
 * Registra no mapper os pares PN ↔ LID presentes numa chave de mensagem
 * (`remoteJid`/`remoteJidAlt` e `participant`/`participantAlt`).
 * @returns `true` se algum par novo foi aprendido.
 */
export declare function registerKeyMappings(key: any, lidMapper: LIDMapper): boolean;
/**
 * Registra os pares PN ↔ LID de uma mensagem e retorna o ID do chat (normalizado)
 * e o LID do chat, quando houver.
 */
export declare function extractAndMapLID(message: any, lidMapper: LIDMapper): {
    id: string;
    lid?: string;
};
/**
 * Normaliza um identificador (remove dispositivo e `@c.us`).
 * Mantido por compatibilidade. Para obter o ID canônico de uma pessoa use
 * `WhatsAppBot.resolveId` ou `LIDMapper.canonical`.
 * @param id - Identificador principal (JID ou LID)
 * @param lid - LID alternativo (opcional)
 */
export declare function fixID(id: string, lid?: string): string;
/**
 * Extrai o número de telefone de um identificador.
 * Só retorna dígitos para PN ou número puro: o número de um LID é opaco e não é telefone.
 * @param id - Identificador (PN, LID ou número)
 * @returns Número de telefone sem formatação, ou string vazia.
 */
export declare function getPhoneNumber(id: string): string;
/**
 * Converte um número em um identificador JID
 * @param id - Número de telefone
 * @returns JID no formato número@s.whatsapp.net
 */
export declare function getID(id: string): string;
