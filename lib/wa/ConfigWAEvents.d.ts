import { MessageUpsertType, proto } from 'baileys';
import WhatsAppBot from './WhatsAppBot';
export default class ConfigWAEvents {
    wa: WhatsAppBot;
    constructor(wa: WhatsAppBot);
    configureAll(): void;
    configCBNotifications(): void;
    configCBNotificationRemove(): void;
    configCBNotificationAdd(): void;
    configCBNotificationPromote(): void;
    configCBNotificationDemote(): void;
    readMessages(messages: proto.IWebMessageInfo[], type?: MessageUpsertType): Promise<void>;
    configMessagesUpsert(): void;
    configMessagesUpdate(): void;
    configConnectionUpdate(): void;
    configHistorySet(): void;
    configContactsUpdate(): void;
    configContactsUpsert(): void;
    configGroupsUpdate(): void;
    configChatsDelete(): void;
    configCall(): void;
}
