import type UserEvent from '../modules/user/UserEvent';
import type UserAction from '../modules/user/UserAction';
import type ChatAction from '../modules/chat/ChatAction';
import EventEmitter from 'events';
import Chat from '../modules/chat/Chat';
import User from '../modules/user/User';
import Call from '../models/Call';
import Message from '../messages/Message';
import type { BlocklistEvent, ChatStateEvent, DiscordInteractionEvent, DiscordMessageDeleteEvent, DiscordModalEvent, DiscordRoleUpdateEvent, DiscordVoiceEvent, GroupJoinRequestEvent, GroupUpdateEvent, IdMappingEvent, InlineQueryEvent, MessageProtocolEvent, MessageReactionEvent, MessageUnavailableEvent, NewsletterEvent, PaymentSuccessEvent, PictureEvent, PreCheckoutQueryEvent, PresenceEvent, ReceiptEvent } from './BotEventTypes';
/**
 * Mapeia os eventos disponíveis para um bot.
 */
export type BotEventsMap = {
    /** Ocorre quando o bot é conectado. */
    open: {
        isNewLogin: boolean;
    };
    /** Ocorre quando o bot está reconectando. */
    reconnecting: object;
    /** Ocorre quando o bot está se conectando. */
    connecting: object;
    /** Ocorre quando a conexão com o bot é interrompida. */
    stop: {
        /** O bot se desconectou */
        isLogout: boolean;
        /** Motivo da parada */
        reason?: any;
    };
    /** Ocorre quando a conexão com o bot é fechada. */
    close: {
        /** Motivo da desconeção */
        reason: any;
    };
    /** Ocorre quando um código QR é gerado para autenticação. */
    qr: string;
    /** Ocorre quando um código de autenticação é gerado. */
    code: string;
    /** Ocorre quando ocorre um evento relacionado a um usuário. */
    user: {
        action: UserAction;
        event: UserEvent;
        chat: Chat;
        user: User;
        fromUser: User;
    };
    /** Ocorre quando ocorre um evento relacionado a uma sala de bate-papo. */
    chat: {
        action: ChatAction;
        chat: {
            id: string;
        } & Partial<Chat>;
    };
    /** Ocorre quando uma nova mensagem é recebida pelo bot. */
    message: Message;
    /** Ocorre ao receber uma atualizaçãod e chamada */
    call: Call;
    /** [WhatsApp] Configuração de um grupo alterada (nome, descrição, permissões...). */
    'group-update': GroupUpdateEvent;
    /** [WhatsApp] Pedido de entrada num grupo com aprovação. */
    'group-join-request': GroupJoinRequestEvent;
    /** [WhatsApp] Presença de um contato atualizada. */
    presence: PresenceEvent;
    /** [WhatsApp] Lista de bloqueados alterada. */
    blocklist: BlocklistEvent;
    /** [WhatsApp] Um LID foi associado a um número de telefone. */
    'id-mapping': IdMappingEvent;
    /** [WhatsApp] Confirmação de entrega/leitura de mensagens enviadas. */
    receipt: ReceiptEvent;
    /** [WhatsApp] Contato digitando/gravando (requer `subscribePresence`). */
    chatstate: ChatStateEvent;
    /** [WhatsApp] Mensagem recebida sem conteúdo (visualização única consumida, etc.). */
    'message-unavailable': MessageUnavailableEvent;
    /** [WhatsApp] `protocolMessage` bruto recebido. */
    'message-protocol': MessageProtocolEvent;
    /** [WhatsApp] Foto de perfil de contato/grupo alterada. */
    picture: PictureEvent;
    /** [WhatsApp] Atualização em canal (newsletter). */
    newsletter: NewsletterEvent | any;
    /** [Telegram] Consulta inline (`@bot termo`). */
    'inline-query': InlineQueryEvent;
    /** [Telegram] Pré-checkout de pagamento / Telegram Stars. */
    'pre-checkout-query': PreCheckoutQueryEvent;
    /** [Telegram] Pagamento aprovado (`successful_payment`). */
    'payment-success': PaymentSuccessEvent;
    /** [Telegram / Discord] Reação nativa em mensagem. */
    'message-reaction': MessageReactionEvent;
    /** [Discord] Interação de comando slash, botão ou menu. */
    'discord-interaction': DiscordInteractionEvent;
    /** [Discord] Envio de formulário Modal. */
    'discord-modal': DiscordModalEvent;
    /** [Discord] Atualização de estado de voz. */
    'discord-voice': DiscordVoiceEvent;
    /** [Discord] Mensagem apagada. */
    'discord-message-delete': DiscordMessageDeleteEvent;
    /** [Discord] Cargo criado, editado ou apagado. */
    'discord-role-update': DiscordRoleUpdateEvent;
    /** Ocorre quando um erro é detectado. */
    error: Error;
};
/**
 * Classe que lida com os eventos do bot e permite registrar ou remover ouvintes para esses eventos.
 */
export default class BotEvents {
    ev: EventEmitter;
    eventsIsStoped: boolean;
    /**
     * Registra um ouvinte para um evento específico.
     * @param eventName - O nome do evento ao qual o ouvinte será associado.
     * @param listener - A função que será chamada quando o evento ocorrer.
     */
    on<T extends keyof BotEventsMap>(eventName: T, listener: (arg: BotEventsMap[T]) => void): void;
    /**
     * Remove um ouvinte para um evento específico.
     * @param eventName - O nome do evento do qual o ouvinte será removido.
     * @param listener - A função de ouvinte a ser removida.
     */
    off<T extends keyof BotEventsMap>(eventName: T, listener: (arg: BotEventsMap[T]) => void): void;
    /**
     * Remove todos os ouvintes associados a um evento específico.
     * @param event - O nome do evento do qual todos os ouvintes serão removidos.
     */
    removeAllListeners<T extends keyof BotEventsMap>(event: T): void;
    /**
     * Emite um evento e chama todos os ouvintes registrados para esse evento.
     * @param eventName - O nome do evento a ser emitido.
     * @param arg - Os argumentos a serem passados para os ouvintes.
     * @returns Verdadeiro se algum ouvinte for chamado, caso contrário, falso.
     */
    emit<T extends keyof BotEventsMap>(eventName: T, arg: BotEventsMap[T]): boolean;
}
