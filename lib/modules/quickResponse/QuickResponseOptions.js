"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("util/types");
const nonce_1 = __importDefault(require("../../utils/nonce"));
/** Opções da resposta rápida */
class QuickResponseOptions {
    constructor(options) {
        this.id = "";
        /**
         * * Lista de padrões da mensagem.
         *
         * @example
         *
         * // Normal pattern
         * "buy"
         *
         * // Others pattern
         * ["buy", "get", "search", /\D/g, "hello"]
         *
         * // Regex pattern
         * /search (.?*)?/
         *
         * // Custom pattern
         * (message: Message) => message.text.includes("search")
         *
         * */
        this.patterns = [];
        /**
         * * Prioridade da resposta rápida.
         *
         * A prioriddade é definida do maior ao menos (1 = maior, 2 = menor que 1, 3 = menor que 2, ...).
         */
        this.priority = 1;
        /**
         * * Resposta da resposta rápida.
         *
         * @example
         *
         * // Normal response
         * "Hello World!"
         *
         * // Custom response
         * (message: Message) => {
         *   return `Hello ${message.user.name}!`;
         * }
         *  */
        this.reply = "";
        if (!(options === null || options === void 0 ? void 0 : options.id)) {
            this.id = (0, nonce_1.default)();
        }
        this.inject(options);
    }
    /**
     * Injeta as opções da resposta rápida.
     * @param options - As opções da resposta rápida.
     */
    inject(options) {
        var _a, _b, _c, _d;
        this.id = (_a = options === null || options === void 0 ? void 0 : options.id) !== null && _a !== void 0 ? _a : this.id;
        this.patterns = (_b = options === null || options === void 0 ? void 0 : options.patterns) !== null && _b !== void 0 ? _b : this.patterns;
        this.priority = (_c = options === null || options === void 0 ? void 0 : options.priority) !== null && _c !== void 0 ? _c : this.priority;
        this.reply = (_d = options === null || options === void 0 ? void 0 : options.reply) !== null && _d !== void 0 ? _d : this.reply;
    }
    /**
     * Valida se o conteúdo da resposta está correto.
     * @param options - As opções da resposta rápida.
     */
    static isValid(options) {
        return !!options && typeof options === "object" && !Array.isArray(options) && !(0, types_1.isRegExp)(options);
    }
}
exports.default = QuickResponseOptions;
//# sourceMappingURL=QuickResponseOptions.js.map