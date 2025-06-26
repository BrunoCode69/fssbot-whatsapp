"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const QuickResponseOptions_1 = __importDefault(require("./QuickResponseOptions"));
/**
 * Mensagem rápida.
 * @example
 * const quickResponse1 = new QuickResponse(["comprar", "pedido", "quero"], "Vamos fazer um pedido?");
 *
 * const quickResponse2 = new QuickResponse(/vendem(.*?)\?/, "Vou estar conferindo...", { priority: 1 });
 *
 * const quickResponse3 = new QuickResponse({ patterns: ["hello", "hi", /ola(.*?)\!/], reply: "Hello There!", priority: 2 });
 *
 * const quickResponse4 = new QuickResponse(
 *  async (text, message) => {
 *    await message.addReaction("👋");
 *
 *    return message.chat.type !== ChatType.Group && text.includes("hi");
 *  },
 *  (message) => {
 *    message.reply(`Hello ${message.chat.name}!`);
 *  },
 *  { priority: 1 }
 * );
 */
class QuickResponse extends QuickResponseOptions_1.default {
    /**
     * @param content - O conteúdo da resposta rápida.
     * @param reply - A resposta da resposta rápida.
     * @param options - As opções da mensagem apósida.
     */
    constructor(content, reply, options) {
        super(options);
        if (QuickResponseOptions_1.default.isValid(content)) {
            this.inject(content);
        }
        else {
            if (Array.isArray(content)) {
                this.patterns = content;
            }
            else {
                this.patterns = [content];
            }
            if (reply) {
                this.reply = reply;
            }
        }
    }
    /**
     * Executa a resposta.
     * @param message - A mensagem de origem.
     * @param pattern - O padrão da mensagem.
     */
    async execute(message, pattern) {
        if (typeof this.reply === "function") {
            return await this.reply(message, pattern);
        }
        return await message.reply(this.reply);
    }
}
exports.default = QuickResponse;
//# sourceMappingURL=QuickResponse.js.map