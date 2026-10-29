export function getPollCreationContent(messageContent: any): any | undefined {
  return messageContent?.pollCreationMessage
    || messageContent?.pollCreationMessageV2
    || messageContent?.pollCreationMessageV3
    || messageContent?.pollCreationMessageV5
    || messageContent?.pollCreationMessageV4?.message?.pollCreationMessage
    || messageContent?.pollCreationMessageV4?.message?.pollCreationMessageV2
    || messageContent?.pollCreationMessageV4?.message?.pollCreationMessageV3;
}