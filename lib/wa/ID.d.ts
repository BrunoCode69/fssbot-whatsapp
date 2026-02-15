/**
 * Extrai o LID (Local ID) de um identificador, se disponível
 * LIDs têm formato: número:sequência@lid
 * @param id - Identificador a ser verificado
 * @returns LID se encontrado, null caso contrário
 */
export declare function extractLID(id: string): string | null;
/**
 * Extrai LID de uma chave de mensagem WAMessage
 * Considera participant (para grupos) e remoteJid
 * @param key - Chave da mensagem com remoteJid e/ou participant
 * @returns LID se encontrado, null caso contrário
 */
export declare function getLIDFromMessage(key: {
    remoteJid?: string;
    participant?: string;
}): string | null;
/**
 * Normaliza um identificador, priorizando LID sobre JID
 * Remove formato antigo :número@ e retorna identificador limpo
 * @param id - Identificador principal (pode ser JID ou LID)
 * @param lid - LID alternativo (opcional, de remoteJidAlt por exemplo)
 * @returns Identificador normalizado (preferencialmente LID)
 */
export declare function fixID(id: string, lid?: string): string;
/**
 * Extrai o número de telefone de um identificador (JID ou LID)
 * @param id - Identificador (JID ou LID)
 * @returns Número de telefone sem formatação
 */
export declare function getPhoneNumber(id: string): string;
/**
 * Converte um número em um identificador JID
 * @param id - Número de telefone
 * @returns JID no formato número@s.whatsapp.net
 */
export declare function getID(id: string): string;
