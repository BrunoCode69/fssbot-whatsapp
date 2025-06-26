import type { QuickResponsePattern } from "./QuickResponsePattern";
import type { QuickResponseReply } from "./QuickResponseReply";
/** Opções da resposta rápida */
export default class QuickResponseOptions {
    id: string;
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
    patterns: QuickResponsePattern[];
    /**
     * * Prioridade da resposta rápida.
     *
     * A prioriddade é definida do maior ao menos (1 = maior, 2 = menor que 1, 3 = menor que 2, ...).
     */
    priority: number;
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
    reply: QuickResponseReply;
    constructor(options?: Partial<QuickResponseOptions>);
    /**
     * Injeta as opções da resposta rápida.
     * @param options - As opções da resposta rápida.
     */
    inject(options?: Partial<QuickResponseOptions>): void;
    /**
     * Valida se o conteúdo da resposta está correto.
     * @param options - As opções da resposta rápida.
     */
    static isValid(options: unknown): options is Partial<QuickResponseOptions>;
}
