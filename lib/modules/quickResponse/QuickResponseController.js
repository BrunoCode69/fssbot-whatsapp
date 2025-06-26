"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("util/types");
/** Controlador das respostas rápidas */
class QuickResponseController {
    constructor(arg1, arg2) {
        /** Lista de respostas rápidas separadas por prioridade */
        this.quickResponseByPriority = {};
        /** Usar letras minúsculas na busca */
        this.useLowerCase = true;
        if (arg1) {
            if (!Array.isArray(arg1))
                this.inject(arg1);
            else
                this.add(...arg1);
        }
        if (arg2) {
            if (!Array.isArray(arg2))
                this.inject(arg2);
            else
                this.add(...arg2);
        }
    }
    /**
     * Injeta os dados no controlador.
     * @param options - Dados a serem injetados.
     */
    inject(options) {
        var _a;
        this.useLowerCase = (_a = options === null || options === void 0 ? void 0 : options.useLowerCase) !== null && _a !== void 0 ? _a : this.useLowerCase;
    }
    /**
     * Adiciona uma ou mais respostas rápidas.
     * @param quickResponses - As respostas rápidas.
     */
    add(...quickResponses) {
        for (const quickResponse of quickResponses) {
            if (!this.quickResponseByPriority[quickResponse.priority]) {
                this.quickResponseByPriority[quickResponse.priority] = [quickResponse];
            }
            else {
                this.quickResponseByPriority[quickResponse.priority].push(quickResponse);
            }
        }
    }
    /**
     * Remove uma ou mais mensagens específicas.
     * @param quickResponses - As respostas rápidas a serem removidas.
     */
    remove(...quickResponses) {
        for (const quickResponse of quickResponses) {
            if (typeof quickResponse === "string") {
                for (const priority of Object.keys(this.quickResponseByPriority)) {
                    this.quickResponseByPriority[priority] = this.quickResponseByPriority[priority].filter((q) => q.id !== quickResponse);
                }
            }
            else {
                this.quickResponseByPriority[quickResponse.priority] = this.quickResponseByPriority[quickResponse.priority].filter((q) => q.id === quickResponse.id);
            }
        }
    }
    /**
     * @returns As respostas rápidas.
     */
    getAll() {
        return Object.values(this.quickResponseByPriority).flat();
    }
    async searchAndExecute(message) {
        const res = await this.search(message);
        if (!res)
            return null;
        return await res.quickResponse.execute(message, res.pattern);
    }
    /**
     * Pesquisa por uma resposta rápida.
     * @param message - A mensagem de referencia.
     */
    async search(message) {
        const text = this.useLowerCase ? message.text.toLowerCase() : message.text;
        const priorities = Object.keys(this.quickResponseByPriority).sort((a, b) => +a - +b);
        for (const priority of priorities) {
            for (const quickResponse of this.quickResponseByPriority[priority]) {
                const pattern = await this.searchInPatterns(text, message, ...quickResponse.patterns);
                if (pattern !== null) {
                    return { quickResponse, pattern };
                }
            }
        }
        return null;
    }
    /**
     * Pesquisa por um padrão na mensagem.
     * @param text - O texto a ser pesquisado.
     * @param message - A mensagem de referencia.
     * @param patterns - Os padrões da resposta rápida.
     */
    async searchInPatterns(text, message, ...patterns) {
        const resultInPromsie = [];
        for (const pattern of patterns) {
            if (typeof pattern === "string") {
                if (text.includes(this.useLowerCase ? pattern.toLowerCase() : pattern))
                    return pattern;
            }
            else if ((0, types_1.isRegExp)(pattern)) {
                if (pattern.test(text))
                    return pattern;
            }
            else if (typeof pattern === "function") {
                const result = pattern(text, message, this);
                if (!result)
                    continue;
                if (typeof result === "boolean")
                    return pattern;
                resultInPromsie.push({ pattern, result });
            }
        }
        for (const { pattern, result } of resultInPromsie) {
            if (await result)
                return pattern;
        }
        return null;
    }
}
exports.default = QuickResponseController;
//# sourceMappingURL=QuickResponseController.js.map