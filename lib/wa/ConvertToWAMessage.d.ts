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
import type WhatsAppBot from './WhatsAppBot';
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
     * Resolve um ID para o ID canônico usado no envio (PN quando conhecido, senão LID).
     */
    private resolveJid;
    /**
     * * Refatora a mensagem
     * @param message
     */
    refactory(message?: Message): Promise<this>;
    /**
     * Monta a mensagem citada. Usa a mensagem original do cache quando existe
     * (conteúdo e chave exatos); senão gera uma cópia a partir dos dados do Rompot.
     */
    createQuoted(mention: Message): Promise<import("baileys").WAMessage>;
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
    refactoryReactionMessage(message: ReactionMessage): Promise<void>;
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
      * Converte para o formato interativo single-select do helper WhatsApp
     * @param message
     */
    refactoryListMessage(message: ListMessage): Promise<void>;
    static convertToWaMessageStatus(status: MessageStatus): proto.WebMessageInfo.Status;
}
