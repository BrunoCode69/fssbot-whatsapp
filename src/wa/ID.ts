/**
 * Extrai o LID (Local ID) de um identificador, se disponível
 * LIDs têm formato: número:sequência@lid
 * @param id - Identificador a ser verificado
 * @returns LID se encontrado, null caso contrário
 */
export function extractLID(id: string): string | null {
  if (!id || typeof id !== 'string') return null;

  // Formato LID: "123456789:10@lid"
  if (id.includes('@lid')) {
    return id;
  }

  return null;
}

/**
 * Extrai LID de uma chave de mensagem WAMessage
 * Considera participant (para grupos) e remoteJid
 * @param key - Chave da mensagem com remoteJid e/ou participant
 * @returns LID se encontrado, null caso contrário
 */
export function getLIDFromMessage(key: { remoteJid?: string; participant?: string }): string | null {
  if (!key) return null;

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

/**
 * Normaliza um identificador, priorizando LID sobre JID
 * Remove formato antigo :número@ e retorna identificador limpo
 * @param id - Identificador principal (pode ser JID ou LID)
 * @param lid - LID alternativo (opcional, de remoteJidAlt por exemplo)
 * @returns Identificador normalizado (preferencialmente LID)
 */
export function fixID(id: string, lid?: string): string {
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

/**
 * Extrai o número de telefone de um identificador (JID ou LID)
 * @param id - Identificador (JID ou LID)
 * @returns Número de telefone sem formatação
 */
export function getPhoneNumber(id: string): string {
  return id?.replace(/\D+/g, "") || "0";
}

/**
 * Converte um número em um identificador JID
 * @param id - Número de telefone
 * @returns JID no formato número@s.whatsapp.net
 */
export function getID(id: string): string {
  id = String(`${id}`);

  if (!id.includes("@")) id = `${id}@s.whatsapp.net`;

  return id.trim();
}
