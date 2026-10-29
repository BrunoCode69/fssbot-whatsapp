import type ListMessage from '../messages/ListMessage';

export function createInteractiveListPayload(message: ListMessage) {
  return {
    __useBaileysHelper: true,
    text: message.text || '',
    title: message.title || undefined,
    footer: message.footer || undefined,
    interactiveButtons: [{
      name: 'single_select',
      buttonParamsJson: JSON.stringify({
        title: message.button || 'Ver Opções',
        sections: message.list.map((category) => ({
          title: category.title,
          highlight_label: category.label || undefined,
          rows: category.items.map((item) => ({
            header: item.header || undefined,
            title: item.title,
            description: item.description || undefined,
            id: item.id,
          })),
        })),
      }),
    }],
  };
}