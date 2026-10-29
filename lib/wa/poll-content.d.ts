export declare function getPollCreationContent(messageContent: any): any | undefined;
export declare function getPollVoterId(message: any, botId: string): string;
export declare function getPollVoteChange(previousVotes: string[], currentVotes: string[]): {
    action: 'add' | 'remove';
    option: string;
} | undefined;
