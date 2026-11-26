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
/**
 * Normaliza o mimetype de `AudioMessage` antes de enviar pelo ZapoJS/WhatsApp,
 * garantindo que contêineres MP4/M4A marcados por engano como `video/*` ou genéricos
 * não quebrem a entrega do `audioMessage` no WhatsApp.
 */
export declare function normalizeWhatsAppAudioMimetype(mimetype?: string, isPTT?: boolean): string;
export default class ConvertToWAMessage {
    message: Message;
    bot: WhatsAppBot;
    isMention: boolean;
    chatId: string;
    waMessage: any;
    options: any;
    isRelay: boolean;
    constructor(bot: WhatsAppBot, message: Message, isMention?: boolean);
    /**
     * Resolve um ID para o ID canônico usado no envio (PN quando conhecido, senão LID).
     */
    private resolveJid;
    /**
     * * Refatora a mensagem para o formato ZapoJS
     */
    refactory(message?: Message): Promise<this>;
    /**
     * Monta a mensagem citada (quote) para o envio.
     */
    createQuoted(mention: Message): Promise<any>;
    /**
     * Refatora texto, menções e campos base da mensagem
     */
    refactoryMessage(message: Message): Promise<any>;
    /**
     * Refatora mensagens de mídia (imagem, vídeo, áudio, documento, figurinha)
     */
    /**
     * Conteúdo da mídia para o Zapo: caminho de arquivo local é repassado como string (o Zapo
     * lê em stream, sem carregar tudo em memória); os demais casos viram Buffer.
     */
    getMediaInput(message: MediaMessage): Promise<Buffer | string>;
    /** Metadados opcionais (só quando conhecidos) para o envio. */
    static getMediaFields(message: MediaMessage, duration?: number): any;
    refactoryMediaMessage(message: MediaMessage): Promise<void>;
    refactoryStickerMessage(message: StickerMessage): Promise<void>;
    refactoryLocationMessage(message: LocationMessage): void;
    refactoryContactMessage(message: ContactMessage): void;
    refactoryReactionMessage(message: ReactionMessage): Promise<void>;
    refactoryPollMessage(message: PollMessage): void;
    refactoryButtonMessage(message: ButtonMessage): void;
    refactoryListMessage(message: ListMessage): Promise<void>;
    static convertToWaMessageStatus(status: MessageStatus): any;
}
