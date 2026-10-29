import { proto } from 'baileys';
import type ListMessage from '../messages/ListMessage';

export function createLegacyListPayload(message: ListMessage) {
  return {
    listMessage: {
      title: message.title || undefined,
      description: message.text || '',
      buttonText: message.button || 'Ver Opções',
      listType: proto.Message.ListMessage.ListType.SINGLE_SELECT,
      sections: message.list.map((category) => ({
        title: category.title,
        rows: category.items.map((item) => ({
          title: item.title,
          description: item.description || undefined,
          rowId: item.id,
        })),
      })),
      footerText: message.footer || undefined,
    },
  };
}