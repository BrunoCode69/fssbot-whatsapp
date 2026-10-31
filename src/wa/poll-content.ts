import { jidNormalizedUser } from 'baileys';

export function getPollCreationContent(messageContent: any): any | undefined {
  return messageContent?.pollCreationMessage
    || messageContent?.pollCreationMessageV2
    || messageContent?.pollCreationMessageV3
    || messageContent?.pollCreationMessageV5
    || messageContent?.pollCreationMessageV4?.message?.pollCreationMessage
    || messageContent?.pollCreationMessageV4?.message?.pollCreationMessageV2
    || messageContent?.pollCreationMessageV4?.message?.pollCreationMessageV3;
}

/**
 * Remove o sufixo de dispositivo (`:4`) de um JID.
 * A chave do voto é derivada do JID do usuário, sem dispositivo (igual ao `getKeyAuthor` do Baileys).
 */
export function normalizePollJid(jid?: string | null): string {
  if (!jid) return '';

  try {
    return jidNormalizedUser(String(jid)) || String(jid);
  } catch {
    return String(jid);
  }
}

/** Mesma precedência do `getKeyAuthor` do Baileys: PN alternativo primeiro, depois o ID do envio. */
export function getPollVoterId(message: any, botId: string): string {
  if (message?.key?.fromMe) return normalizePollJid(botId);
  const key = message?.key || {};
  return normalizePollJid(
    key.participantAlt
      || message?.participantAlt
      || key.remoteJidAlt
      || message?.remoteJidAlt
      || key.participant
      || message?.participant
      || key.remoteJid
      || '',
  );
}

export function getPollCreatorJid(message: any, botId: string): string {
  if (message?.key?.fromMe) return normalizePollJid(botId);
  const key = message?.key || {};
  return normalizePollJid(
    key.participantAlt
      || message?.participantAlt
      || key.remoteJidAlt
      || message?.remoteJidAlt
      || key.participant
      || message?.participant
      || key.remoteJid
      || '',
  );
}

/** Lista única de JIDs normalizados, na ordem recebida (vazios descartados). */
export function getPollJidCandidates(...ids: Array<string | null | undefined>): string[] {
  return [...new Set(ids.map((id) => normalizePollJid(id)).filter(Boolean))];
}

/**
 * Tenta descriptografar o voto com cada combinação de criador e votante (PN e LID).
 * O AES-GCM só aceita a combinação usada pelo celular de quem votou, então a primeira que
 * passar é a correta.
 */
export function decryptPollVoteWithCandidates<T>(
  decrypt: (creatorJid: string, voterJid: string) => T,
  creatorCandidates: string[],
  voterCandidates: string[],
): { vote: T; creatorJid: string; voterJid: string } {
  let lastError: unknown = new Error('Poll vote has no creator or voter candidates');

  for (const creatorJid of creatorCandidates) {
    for (const voterJid of voterCandidates) {
      try {
        return { vote: decrypt(creatorJid, voterJid), creatorJid, voterJid };
      } catch (error) {
        lastError = error;
      }
    }
  }

  throw lastError;
}

export function getPollVoteChange(previousVotes: string[], currentVotes: string[]): { action: 'add' | 'remove'; option: string } | undefined {
  const addedOption = currentVotes.find((option) => !previousVotes.includes(option));
  if (addedOption) return { action: 'add', option: addedOption };

  const removedOption = previousVotes.find((option) => !currentVotes.includes(option));
  if (removedOption) return { action: 'remove', option: removedOption };

  return undefined;
}
