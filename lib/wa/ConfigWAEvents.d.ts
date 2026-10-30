import { MessageUpsertType, proto } from 'baileys';
import WhatsAppBot from './WhatsAppBot';
export default class ConfigWAEvents {
    wa: WhatsAppBot;
    constructor(wa: WhatsAppBot);
    configureAll(): void;
    /** Cria um User com os IDs conhecidos (sem acessar o disco). */
    private toUser;
    /** Cria um Chat de grupo com o nome em cache, sem acessar a rede. */
    private toGroupChat;
    configLidMapping(): void;
    configGroupParticipants(): void;
    configGroupJoinRequest(): void;
    readMessages(messages: proto.IWebMessageInfo[], type?: MessageUpsertType): Promise<void>;
    configMessagesUpsert(): void;
    configMessagesUpdate(): void;
    configConnectionUpdate(): void;
    configHistorySet(): void;
    private handleContacts;
    configContactsUpdate(): void;
    configContactsUpsert(): void;
    configGroupsUpsert(): void;
    configGroupsUpdate(): void;
    configChatsDelete(): void;
    configPresence(): void;
    configBlocklist(): void;
    configCall(): void;
}
