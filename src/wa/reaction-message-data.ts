export function createReactionMessageData(base: Record<string, any>, content: any) {
  return {
    ...base,
    type: 'reaction',
    text: content?.text || '',
    id: content?.key?.id || '',
  };
}