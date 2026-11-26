import Message, { MessageStatus } from '../messages/Message';
import WhatsAppBot from './WhatsAppBot';
export default class ConvertWAMessage {
    type?: any;
    waMessage: any;
    private message;
    private bot;
    constructor(bot: WhatsAppBot, waMessage: any, type?: any);
    set(waMessage?: any, type?: any): void;
    get(): Promise<Message>;
    convertMessage(waMessage: any, type?: any): Promise<void>;
    /**
     * Converte addons nativos do ZapoJS (reações, votos de enquete, edições)
     */
    convertAddonMessage(addon: any): Promise<void>;
    /**
     * Desembrulha os contêineres comuns (temporária, visualização única, documento com legenda,
     * envio entre dispositivos, menção de grupo, invocação de bot etc.), inclusive combinados.
     * Marca `isViewOnce` quando passa por visualização única.
     */
    unwrapContainers(messageContent: any): any;
    convertContentMessage(messageContent: any): Promise<void>;
    convertContextMessage(context: any): Promise<void>;
    convertConversationMessage(content: string): void;
    convertExtendedTextMessage(content: any): void;
    convertProtocolMessage(content: any): Promise<void>;
    convertLocationMessage(content: any): void;
    convertContactMessage(content: any): void;
    convertMediaMessage(content: any, contentType: string): Promise<void>;
    convertReactionMessage(content: any): void;
    convertEditedMessage(content: any): Promise<void>;
    convertPollCreationMessage(content: any): Promise<void>;
    convertPollUpdateMessage(content: any): Promise<void>;
    convertButtonMessage(content: any): void;
    convertListMessage(content: any): void;
    convertInteractiveMessage(content: any): void;
    convertInteractiveResponseMessage(content: any): void;
    static convertMessageStatus(status?: any): MessageStatus;
    static isMessageUpdate(waMessage: any): boolean;
}
