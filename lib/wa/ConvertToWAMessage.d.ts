import { MiscMessageGenerationOptions, proto } from 'baileys';
import Message, { MessageStatus } from '../messages/Message';
import ListMessage from '../messages/ListMessage';
import LocationMessage from '../messages/LocationMessage';
import ReactionMessage from '../messages/ReactionMessage';
import ContactMessage from '../messages/ContactMessage';
import StickerMessage from '../messages/StickerMessage';
import ButtonMessage from '../messages/ButtonMessage';
import MediaMessage from '../messages/MediaMessage';
import PollMessage from '../messages/PollMessage';
import WhatsAppBot from './WhatsAppBot';
export default class ConvertToWAMessage {
    message: Message;
    bot: WhatsAppBot;
    isMention: boolean;
    chatId: string;
    waMessage: any;
    options: MiscMessageGenerationOptions;
    isRelay: boolean;
    constructor(bot: WhatsAppBot, message: Message, isMention?: boolean);
    /**
     * Normaliza um JID usando o método do WhatsAppBot
     */
    private safeNormalizeJid;
    /**
     * * Refatora a mensagem
     * @param message
     */
    refactory(message?: Message): Promise<this>;
    /**
     * * Refatora outras informações da mensagem
     * @param message
     * @returns
     */
    refactoryMessage(message: Message): Promise<any>;
    /**
     * * Refatora uma mensagem de midia
     * @param message
     */
    refactoryMediaMessage(message: MediaMessage): Promise<void>;
    refatoryStickerMessage(message: StickerMessage): Promise<void>;
    refactoryLocationMessage(message: LocationMessage): void;
    refactoryContactMessage(message: ContactMessage): void;
    /**
     * * Refatora uma mensagem de reação
     * @param message
     */
    refactoryReactionMessage(message: ReactionMessage): void;
    /**
     * * Refatora uma mensagem de enquete
     * @param message
     */
    refactoryPollMessage(message: PollMessage): void;
    /**
     * * Refatora uma mensagem de botão com formato simples
     * Converte para formato compatível com baileys
     * @param message
     */
    refactoryButtonMessage(message: ButtonMessage): void;
    /**
     * * Refatora uma mensagem de lista
     * Converte para formato compatível com baileys_helper
     * @param message
     */
    refactoryListMessage(message: ListMessage): Promise<void>;
    static convertToWaMessageStatus(status: MessageStatus): proto.WebMessageInfo.Status;
}
