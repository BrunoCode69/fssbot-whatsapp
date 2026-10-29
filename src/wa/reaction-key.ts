export function createReactionKey(
  chatId: string,
  messageId: string,
  messageFromMe: boolean,
  userId: string | undefined,
  botId: string | undefined,
  isGroup: boolean,
) {
  const fromMe = messageFromMe || !userId || userId === botId;
  return {
    remoteJid: chatId,
    id: messageId || '',
    fromMe,
    participant: isGroup && !fromMe ? userId : undefined,
  };
}