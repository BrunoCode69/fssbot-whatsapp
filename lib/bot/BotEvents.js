"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = __importDefault(require("events"));
/**
 * Classe que lida com os eventos do bot e permite registrar ou remover ouvintes para esses eventos.
 */
class BotEvents {
    constructor() {
        this.ev = new events_1.default();
        this.eventsIsStoped = false;
    }
    /**
     * Registra um ouvinte para um evento específico.
     * @param eventName - O nome do evento ao qual o ouvinte será associado.
     * @param listener - A função que será chamada quando o evento ocorrer.
     */
    on(eventName, listener) {
        this.ev.on(eventName, listener);
    }
    /**
     * Remove um ouvinte para um evento específico.
     * @param eventName - O nome do evento do qual o ouvinte será removido.
     * @param listener - A função de ouvinte a ser removida.
     */
    off(eventName, listener) {
        this.ev.off(eventName, listener);
    }
    /**
     * Remove todos os ouvintes associados a um evento específico.
     * @param event - O nome do evento do qual todos os ouvintes serão removidos.
     */
    removeAllListeners(event) {
        this.ev.removeAllListeners(event);
    }
    /**
     * Emite um evento e chama todos os ouvintes registrados para esse evento.
     * @param eventName - O nome do evento a ser emitido.
     * @param arg - Os argumentos a serem passados para os ouvintes.
     * @returns Verdadeiro se algum ouvinte for chamado, caso contrário, falso.
     */
    emit(eventName, arg) {
        if (this.eventsIsStoped)
            return false;
        return this.ev.emit(eventName, arg);
    }
}
exports.default = BotEvents;
//# sourceMappingURL=BotEvents.js.map