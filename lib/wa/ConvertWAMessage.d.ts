import { MessageUpsertType, proto, WAMessage, WAMessageContent, WAMessageUpdate } from "@whiskeysockets/baileys";
import Message, { MessageStatus } from "../messages/Message";
import WhatsAppBot from "./WhatsAppBot";
export default class ConvertWAMessage {
    type?: MessageUpsertType;
    waMessage: WAMessage;
    private message;
    private bot;
    constructor(bot: WhatsAppBot, waMessage: WAMessage, type?: MessageUpsertType);
    /**
     * * Define a mensagem a ser convertida
     * @param waMessage
     * @param type
     */
    set(waMessage?: WAMessage, type?: MessageUpsertType): void;
    /**
     * * Retorna a mensagem convertida
     */
    get(): Promise<Message>;
    /**
     * * Converte a mensagem
     * @param waMessage
     * @param type
     */
    convertMessage(waMessage: WAMessage, type?: MessageUpsertType): Promise<void>;
    /**
     * * Converte o conteudo da mensagem
     * @param messageContent
     * @returns
     */
    convertContentMessage(messageContent: proto.IMessage | undefined | null): Promise<void>;
    /**
     * * Converte o contexto da mensagem
     * @param context
     * @returns
     */
    convertContextMessage(context: proto.ContextInfo): Promise<void>;
    /**
     * * Converte mensagem de conversa
     * @param content
     */
    convertConversationMessage(content: proto.Message["conversation"]): void;
    /**
     * * Converte mensagem de texto
     * @param content
     */
    convertExtendedTextMessage(content: proto.Message["extendedTextMessage"]): void;
    /**
     * * Converte mensagem de protocolo
     * @param content
     */
    convertProtocolMessage(content: proto.Message["protocolMessage"]): Promise<void>;
    /**
     * * Converte mensagem de localização
     * @param content
     */
    convertLocationMessage(content: any): void;
    /**
     * * Converte mensagem com contatos
     * @param content
     */
    convertContactMessage(content: any): void;
    /**
     * * Converte mensagem de midia
     * @param content
     * @param contentType
     */
    convertMediaMessage(content: any, contentType: keyof proto.Message): Promise<void>;
    /**
     * * Converte uma mensagem de reação
     * @param content
     */
    convertReactionMessage(content: any): void;
    /**
     * * Converte uma mensagem editada
     * @param content
     */
    convertEditedMessage(content: proto.IMessage["protocolMessage"]): Promise<void>;
    /**
     * * Converte uma mensagem de enquete
     * @param content
     */
    convertPollCreationMessage(content: proto.Message.PollCreationMessage): Promise<void>;
    /**
     * * Converte uma mensagem de enquete atualizada
     * @param content
     */
    convertPollUpdateMessage(content: proto.Message.PollUpdateMessage): Promise<void>;
    /**
     * * Converte uma mensagem de botão
     * @param content
     * @returns
     */
    convertButtonMessage(content: WAMessageContent): void;
    /**
     * * Converte uma mensagem de lista
     * @param content
     * @returns
     */
    convertListMessage(content: WAMessageContent): void;
    /**
     * * Converte uma mensagem de interativa
     * @param content
     */
    convertInteractiveMessage(content: WAMessageContent): void;
    static convertMessageStatus(status?: proto.WebMessageInfo.Status): MessageStatus;
    static isMessageUpdate(waMessage: any): waMessage is WAMessageUpdate;
}
