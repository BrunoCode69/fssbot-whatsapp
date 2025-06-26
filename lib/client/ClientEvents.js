"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = __importDefault(require("events"));
const Call_1 = require("../models/Call");
/**
 * Classe que gerencia eventos emitidos pelo cliente.
 */
class ClientEvents {
    /**
     * Construtor da classe `ClientEvents`.
     * Registra ouvintes internos para eventos padrão de conexão.
     */
    constructor() {
        this.ev = new events_1.default();
        this.on('close', (update) => {
            this.emit('conn', { action: 'close', reason: update.reason });
        });
        this.on('open', (update) => {
            this.emit('conn', { action: 'open', isNewLogin: update.isNewLogin });
        });
        this.on('qr', (qr) => {
            this.emit('conn', { action: 'qr', qr });
        });
        this.on('code', (code) => {
            this.emit('conn', { action: 'code', code });
        });
        this.on('stop', (update) => {
            this.emit('conn', { action: 'stop', isLogout: !!(update === null || update === void 0 ? void 0 : update.isLogout) });
        });
        this.on('reconnecting', () => {
            this.emit('conn', { action: 'reconnecting' });
        });
        this.on('connecting', () => {
            this.emit('conn', { action: 'connecting' });
        });
        this.on('call', (call) => {
            switch (call.status) {
                case Call_1.CallStatus.Offer:
                    this.emit('new-call', call);
                    break;
                case Call_1.CallStatus.Ringing:
                    this.emit('ringing-call', call);
                    break;
                case Call_1.CallStatus.Reject:
                    this.emit('call-rejected', call);
                    break;
                case Call_1.CallStatus.Accept:
                    this.emit('call-accepted', call);
                    break;
                case Call_1.CallStatus.Timeout:
                    this.emit('call-ended', call);
                    break;
            }
        });
    }
    /**
     * Registra um ouvinte para um evento específico.
     * @param eventName - O nome do evento a ser ouvido.
     * @param listener - A função a ser executada quando o evento é emitido.
     */
    on(eventName, listener) {
        this.ev.on(eventName, listener);
    }
    /**
     * Remove um ouvinte de um evento específico.
     * @param eventName - O nome do evento do qual o ouvinte será removido.
     * @param listener - O ouvinte a ser removido.
     */
    off(eventName, listener) {
        this.ev.off(eventName, listener);
    }
    /**
     * Remove todos os ouvintes de um evento específico.
     * @param event - O nome do evento do qual todos os ouvintes serão removidos.
     */
    removeAllListeners(event) {
        this.ev.removeAllListeners(event);
    }
    /**
     * Emite um evento com os dados fornecidos.
     * @param eventName - O nome do evento a ser emitido.
     * @param arg - Os dados do evento a serem transmitidos aos ouvintes.
     * @returns Verdadeiro se houver ouvintes para o evento, caso contrário, falso.
     */
    emit(eventName, arg) {
        return this.ev.emit(eventName, arg);
    }
}
exports.default = ClientEvents;
//# sourceMappingURL=ClientEvents.js.map