export declare function getPollCreationContent(messageContent: any): any | undefined;
/**
 * Remove o sufixo de dispositivo (`:4`) de um JID.
 * A chave do voto é derivada do JID do usuário, sem dispositivo.
 */
export declare function normalizePollJid(jid?: string | null): string;
/** Mesma precedência do `getKeyAuthor`: PN alternativo primeiro, depois o ID do envio. */
export declare function getPollVoterId(message: any, botId: string): string;
export declare function getPollCreatorJid(message: any, botId: string): string;
/** Lista única de JIDs normalizados, na ordem recebida (vazios descartados). */
export declare function getPollJidCandidates(...ids: Array<string | null | undefined>): string[];
/**
 * Tenta descriptografar o voto com cada combinação de criador e votante (PN e LID).
 */
export declare function decryptPollVoteWithCandidates<T>(decrypt: (creatorJid: string, voterJid: string) => T, creatorCandidates: string[], voterCandidates: string[]): {
    vote: T;
    creatorJid: string;
    voterJid: string;
};
export declare function getPollVoteChange(previousVotes: string[], currentVotes: string[]): {
    action: 'add' | 'remove';
    option: string;
} | undefined;
