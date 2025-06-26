"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CallStatus = void 0;
const chat_1 = require("../modules/chat");
const user_1 = require("../modules/user");
const utils_1 = require("../utils");
const Generic_1 = require("../utils/Generic");
var CallStatus;
(function (CallStatus) {
    CallStatus["Offer"] = "offer";
    CallStatus["Ringing"] = "ringing";
    CallStatus["Reject"] = "reject";
    CallStatus["Accept"] = "accept";
    CallStatus["Timeout"] = "timeout";
})(CallStatus = exports.CallStatus || (exports.CallStatus = {}));
class Call {
    constructor(id = '', chat = '', user = '', status = CallStatus.Ringing, options) {
        /** E uma chamada de video */
        this.isVideo = false;
        /** Foi chamada enquanto estava offline */
        this.offline = false;
        /** Latencia da chamada */
        this.latencyMs = 0;
        this.id = id;
        this.status = status;
        this.chat = chat_1.Chat.apply(chat || '');
        this.user = user_1.User.apply(user || '');
        if (options) {
            this.inject(options);
        }
    }
    /**
     * Injeta dados para o objeto atual.
     * @param options - Os dados que serão injetados.
     */
    inject(data) {
        if (data.chat)
            this.chat = chat_1.Chat.apply(data.chat);
        if (data.user)
            this.user = user_1.User.apply(data.user);
        if (data.clientId) {
            this.clientId = data.clientId;
            this.chat.clientId = data.clientId;
            this.user.clientId = data.clientId;
        }
        if (data.botId) {
            this.botId = data.botId;
            this.chat.botId = data.botId;
            this.user.botId = data.botId;
        }
        if (data.id)
            this.id = data.id;
        if (data.date)
            this.date = data.date;
        if (data.status)
            this.status = data.status;
        if (data.isVideo)
            this.isVideo = data.isVideo;
        if (data.offline)
            this.offline = data.offline;
        if (data.latencyMs)
            this.latencyMs = data.latencyMs;
    }
    async reject() {
        var _a;
        if (this.status !== CallStatus.Offer)
            return;
        (_a = utils_1.ClientUtils.getClient(this.clientId)) === null || _a === void 0 ? void 0 : _a.rejectCall(this);
    }
    /**
     * Converte o objeto atual para uma representação em formato JSON.
     * @returns Um objeto JSON que representa o estado atual do objeto.
     */
    toJSON() {
        const data = {};
        for (const key of Object.keys(this)) {
            if (key == 'toJSON')
                continue;
            data[key] = this[key];
        }
        return JSON.parse(JSON.stringify(data));
    }
    /**
     * Cria uma instância de `Call` a partir de uma representação em formato JSON.
     * @param data - Os dados JSON a serem usados para criar a instância.
     * @returns Uma instância de `Call` criada a partir dos dados JSON.
     */
    static fromJSON(data) {
        return Call.fix(!data || typeof data != 'object'
            ? new Call()
            : (0, Generic_1.injectJSON)(data, new Call(), false, true));
    }
    /**
     * Corrige o objeto atual para uma representação em formato JSON.
     * @param call - O objeto a ser corrigido.
     * @returns O objeto passado corrigido.
     */
    static fix(call) {
        call.chat = chat_1.Chat.fromJSON(call.chat);
        call.user = user_1.User.fromJSON(call.user);
        return call;
    }
    /**
     * Obtém uma instância de `Call` com base em um ID e/ou dados passados.
     * @param call - O ID da mensagem ou uma instância existente de Call.
     * @param data - Dados que serão aplicados na mensagem,.
     * @returns Uma instância de Call com os dados passados.
     */
    static apply(call, data) {
        if (!call || typeof call != 'object') {
            call = new Call('', `${call}`);
        }
        call.inject(data || {});
        return call;
    }
    /**
     * Verifica se um objeto é uma instância válida de `Call`.
     * @param call - O objeto a ser verificado.
     * @returns Verdadeiro se o objeto for uma instância válida de `Call`, caso contrário, falso.
     */
    static isValid(call) {
        return (typeof call === 'object' &&
            !Object.keys(new Call()).some((key) => !(key in call)));
    }
}
exports.default = Call;
//# sourceMappingURL=Call.js.map