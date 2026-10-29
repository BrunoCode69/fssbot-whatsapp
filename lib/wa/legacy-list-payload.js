"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLegacyListPayload = createLegacyListPayload;
const baileys_1 = require("baileys");
function createLegacyListPayload(message) {
    return {
        listMessage: {
            title: message.title || undefined,
            description: message.text || '',
            buttonText: message.button || 'Ver Opções',
            listType: baileys_1.proto.Message.ListMessage.ListType.SINGLE_SELECT,
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