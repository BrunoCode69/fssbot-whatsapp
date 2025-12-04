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
import CustomMessage from '../messages/CustomMessage';
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
     * * Refatora uma mensagem de botão
     * OPÇÃO 1: Formato simples (NÃO FUNCIONA mais no Baileys 7.x)
     * OPÇÃO 2: Usar baileys_helper (FUNCIONA, mas apenas no Mobile)
     * @param message
     */
    refactoryButtonMessage(message: ButtonMessage): void;
    /**
     * * Refatora uma mensagem de lista
     * OPÇÃO 1: Formato simples compatível com Web e Mobile ✅ (RECOMENDADO)
     * OPÇÃO 2: Formato interativo com baileys_helper (apenas Mobile)
     * @param message
     */
    refactoryListMessage(message: ListMessage): Promise<void>;
    /**
     * * Refatora uma mensagem customizada
     * @param message
     */
    refactoryCustomMessage(message: CustomMessage): Promise<void>;
    static convertToWaMessageStatus(status: MessageStatus): proto.WebMessageInfo.Status;
}
