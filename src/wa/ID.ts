import {
  isHostedLidUser,
  isHostedPnUser,
  isJidBroadcast,
  isJidGroup,
  isJidNewsletter,
  isLidUser,
  isPnUser,
  jidNormalizedUser,
} from 'baileys';

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
export function isLidJid(id?: string | null): boolean {
  return !!id && !!(isLidUser(id) || isHostedLidUser(id));
}

/** O ID é um PN, ou seja, baseado em número de telefone (`@s.whatsapp.net` ou `@hosted`). */
export function isPnJid(id?: string | null): boolean {
  return !!id && !!(isPnUser(id) || isHostedPnUser(id));
}

/** O ID representa uma pessoa (PN ou LID), e não um grupo, canal ou lista. */
export function isUserJid(id?: string | null): boolean {
  return isLidJid(id) || isPnJid(id);
}

/** O ID é de um grupo (`@g.us`). */
export function isGroupJid(id?: string | null): boolean {
  return !!id && !!isJidGroup(id);
}

/** O ID é de um canal (`@newsletter`). */
export function isNewsletterJid(id?: string | null): boolean {
  return !!id && !!isJidNewsletter(id);
}

/** O ID é de uma lista de transmissão ou do status (`@broadcast`). */
export function isBroadcastJid(id?: string | null): boolean {
  return !!id && !!isJidBroadcast(id);
}

/**
 * Normaliza qualquer identificador para um JID sem dispositivo.
 * Aceita número puro (`+55 (11) 99999-9999`), PN, LID, grupo e o domínio legado `@c.us`.
 * @returns JID normalizado ou string vazia se o valor não for válido.
 */
export function normalizeJid(id?: string | null): string {
  if (!id || typeof id !== 'string') return '';

  const value = id.trim();
  if (!value) return '';

  if (!value.includes('@')) {
    const digits = value.replace(/[\s()+\-.]/g, '');
    if (!/^\d{5,20}$/.test(digits)) return '';

    return `${digits}@s.whatsapp.net`;
  }

  try {
    return jidNormalizedUser(value) || '';
  } catch {
    return '';
  }
}

/**
 * Extrai o LID de um identificador, se for um LID.
 * @returns LID normalizado ou null.
 */
export function extractLID(id: string): string | null {
  const normalized = normalizeJid(id);

  return isLidJid(normalized) ? normalized : null;
}

/**
 * Extrai o LID de uma chave de mensagem, considerando participant (grupos) e remoteJid,
 * além dos campos alternativos `participantAlt` e `remoteJidAlt` do Baileys 7.
 */
export function getLIDFromMessage(key: {
  remoteJid?: string | null;
  remoteJidAlt?: string | null;
  participant?: string | null;
  participantAlt?: string | null;
}): string | null {
  if (!key) return null;

  for (const value of [key.participant, key.participantAlt, key.remoteJid, key.remoteJidAlt]) {
    if (value && isLidJid(value)) return normalizeJid(value);
  }

  return null;
}

/**
 * Registra no mapper os pares PN ↔ LID presentes numa chave de mensagem
 * (`remoteJid`/`remoteJidAlt` e `participant`/`participantAlt`).
 * @returns `true` se algum par novo foi aprendido.
 */
export function registerKeyMappings(key: any, lidMapper: LIDMapper): boolean {
  if (!key || !lidMapper) return false;

  const a = lidMapper.register(key.remoteJid, key.remoteJidAlt);
  const b = lidMapper.register(key.participant, key.participantAlt);

  return a || b;
}

/**
 * Registra os pares PN ↔ LID de uma mensagem e retorna o ID do chat (normalizado)
 * e o LID do chat, quando houver.
 */
export function extractAndMapLID(message: any, lidMapper: LIDMapper): { id: string; lid?: string } {
  const key = message?.key || {};

  registerKeyMappings(
    {
      remoteJid: key.remoteJid,
      remoteJidAlt: key.remoteJidAlt || message?.remoteJidAlt,
      participant: key.participant || message?.participant,
      participantAlt: key.participantAlt || message?.participantAlt,
    },
    lidMapper,
  );

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
export function fixID(id: string, lid?: string): string {
  if (lid && isLidJid(lid)) return normalizeJid(lid);

  return normalizeJid(id) || id?.replace(/:(.*)@/, '@') || '';
}

/**
 * Extrai o número de telefone de um identificador.
 * Só retorna dígitos para PN ou número puro: o número de um LID é opaco e não é telefone.
 * @param id - Identificador (PN, LID ou número)
 * @returns Número de telefone sem formatação, ou string vazia.
 */
export function getPhoneNumber(id: string): string {
  if (!id || typeof id !== 'string') return '';

  if (!id.includes('@')) {
    const digits = id.replace(/\D+/g, '');

    return digits.length >= 5 ? digits : '';
  }

  const normalized = normalizeJid(id);
  if (!isPnJid(normalized)) return '';

  return normalized.split('@')[0].replace(/\D+/g, '');
}

/**
 * Converte um número em um identificador JID
 * @param id - Número de telefone
 * @returns JID no formato número@s.whatsapp.net
 */
export function getID(id: string): string {
  id = String(`${id}`).trim();

  if (!id.includes('@')) return normalizeJid(id) || `${id}@s.whatsapp.net`;

  return id;
}
