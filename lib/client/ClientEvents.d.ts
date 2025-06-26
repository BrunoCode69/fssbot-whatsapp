/// <reference types="node" />
import type UserEvent from '../modules/user/UserEvent';
import type UserAction from '../modules/user/UserAction';
import type ChatAction from '../modules/chat/ChatAction';
import EventEmitter from 'events';
import { ConnectionType } from './ConnectionType';
import Call from '../models/Call';
import User from '../modules/user/User';
import Chat from '../modules/chat/Chat';
import Message from '../messages/Message';
/**
 * Mapeia os eventos que podem ser emitidos pelo cliente.
 */
export declare type ClientEventsMap = {
    /**
     * Evento de conexão alterada.
     */
    conn: {
        /** O tipo de ação que ocorreu na conexão. */
        action: ConnectionType;
        /** Indica se é um novo login. */
        isNewLogin?: boolean;
        /** Motivo da desconeção */
        reason?: any;
        /** O cliente se desconectou */
        isLogout?: boolean;
        /** O QR code gerado (quando aplicável). */
        qr?: string;
        /** O código de pareamento gerado */
        code?: string;
    };
    /**
     * Evento de cliente conectado.
     */
    open: {
        /** Indica se é um novo login. */
        isNewLogin: boolean;
    };
    /**
     * Evento de cliente reconectando.
     */
    reconnecting: object;
    /**
     * Evento de cliente conectando.
     */
    connecting: object;
    /**
     * Evento de conexão parada.
     */
    stop: {
        /** O cliente se desconectou */
        isLogout: boolean;
    };
    /**
     * Evento de conexão fechada.
     */
    close: {
        /** Motivo da desconeção */
        reason: any;
    };
    /**
     * Evento de QR code gerado.
     */
    qr: string;
    /**
     * Evento de código de autenticação gerado.
     */
    code: string;
    /**
     * Evento de ação do usuário.
     */
    user: {
        /** Ação do usuário. */
        action: UserAction;
        /** Evento do usuário. */
        event: UserEvent;
        /** O chat associado ao evento. */
        chat: Chat;
        /** O usuário relacionado ao evento. */
        user: User;
        /** O usuário que realizou a ação. */
        fromUser: User;
    };
    /**
     * Evento da sala de bate-papo.
     */
    chat: {
        /** Ação relacionada à sala de bate-papo. */
        action: ChatAction;
        /** O chat associado ao evento. */
        chat: {
            id: string;
            botId: string;
        } & Partial<Chat>;
    };
    /**
     * Evento de nova mensagem.
     */
    message: Message;
    /**
     * Evento de atualização de chamada
     */
    call: Call;
    'new-call': Call;
    'ringing-call': Call;
    'call-rejected': Call;
    'call-accepted': Call;
    'call-ended': Call;
    /**
     * Evento de erro ocorrido.
     */
    error: Error;
};
/**
 * Classe que gerencia eventos emitidos pelo cliente.
 */
export default class ClientEvents {
    protected ev: EventEmitter;
    /**
     * Registra um ouvinte para um evento específico.
     * @param eventName - O nome do evento a ser ouvido.
     * @param listener - A função a ser executada quando o evento é emitido.
     */
    on<T extends keyof ClientEventsMap>(eventName: T, listener: (arg: ClientEventsMap[T]) => void): void;
    /**
     * Remove um ouvinte de um evento específico.
     * @param eventName - O nome do evento do qual o ouvinte será removido.
     * @param listener - O ouvinte a ser removido.
     */
    off<T extends keyof ClientEventsMap>(eventName: T, listener: (arg: ClientEventsMap[T]) => void): void;
    /**
     * Remove todos os ouvintes de um evento específico.
     * @param event - O nome do evento do qual todos os ouvintes serão removidos.
     */
    removeAllListeners<T extends keyof ClientEventsMap>(event: T): void;
    /**
     * Emite um evento com os dados fornecidos.
     * @param eventName - O nome do evento a ser emitido.
     * @param arg - Os dados do evento a serem transmitidos aos ouvintes.
     * @returns Verdadeiro se houver ouvintes para o evento, caso contrário, falso.
     */
    emit<T extends keyof ClientEventsMap>(eventName: T, arg: ClientEventsMap[T]): boolean;
    /**
     * Construtor da classe `ClientEvents`.
     * Registra ouvintes internos para eventos padrão de conexão.
     */
    constructor();
}
