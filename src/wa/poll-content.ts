export function getPollCreationContent(messageContent: any): any | undefined {
  return messageContent?.pollCreationMessage
    || messageContent?.pollCreationMessageV2
    || messageContent?.pollCreationMessageV3
    || messageContent?.pollCreationMessageV5
    || messageContent?.pollCreationMessageV4?.message?.pollCreationMessage
    || messageContent?.pollCreationMessageV4?.message?.pollCreationMessageV2
    || messageContent?.pollCreationMessageV4?.message?.pollCreationMessageV3;
}

export function getPollVoterId(message: any, botId: string): string {
  if (message?.key?.fromMe) return botId;
  const key = message?.key || {};
  return String(
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
  if (message?.key?.fromMe) return botId;
  const key = message?.key || {};
  return String(
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

export function getPollVoteChange(previousVotes: string[], currentVotes: string[]): { action: 'add' | 'remove'; option: string } | undefined {
  const addedOption = currentVotes.find((option) => !previousVotes.includes(option));
  if (addedOption) return { action: 'add', option: addedOption };

  const removedOption = previousVotes.find((option) => !currentVotes.includes(option));
  if (removedOption) return { action: 'remove', option: removedOption };

  return undefined;
}