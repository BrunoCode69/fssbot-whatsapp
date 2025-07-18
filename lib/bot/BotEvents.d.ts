/// <reference types="node" />
import type UserEvent from '../modules/user/UserEvent';
import type UserAction from '../modules/user/UserAction';
import type ChatAction from '../modules/chat/ChatAction';
import EventEmitter from 'events';
import Chat from '../modules/chat/Chat';
import User from '../modules/user/User';
import Call from '../models/Call';
import Message from '../messages/Message';
/**
 * Mapeia os eventos disponíveis para um bot.
 */
export declare type BotEventsMap = {
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
