export declare function createReactionKey(chatId: string, messageId: string, messageFromMe: boolean, userId: string | undefined, botId: string | undefined, isGroup: boolean): {
    remoteJid: string;
    id: string;
    fromMe: boolean;
    participant: string;
};
