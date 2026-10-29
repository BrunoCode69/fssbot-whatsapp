"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createInteractiveListPayload = void 0;
function createInteractiveListPayload(message) {
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
exports.createInteractiveListPayload = createInteractiveListPayload;
//# sourceMappingURL=interactive-list-payload.js.map