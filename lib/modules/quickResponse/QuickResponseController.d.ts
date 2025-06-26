import type { QuickResponsePattern } from "./QuickResponsePattern";
import type QuickResponse from "./QuickResponse";
import type Message from "../../messages/Message";
/** Controlador das respostas rápidas */
export default class QuickResponseController {
    /** Lista de respostas rápidas separadas por prioridade */
    quickResponseByPriority: Record<number, QuickResponse[]>;
    /** Usar letras minúsculas na busca */
    useLowerCase: boolean;
    /**
     * @param quickResponses - As respostas rápidas.
     * @param options - As opções do controlador.
     */
    constructor(quickResponses: QuickResponse[], options?: Partial<QuickResponseController>);
    /**
     * @param options - As opções do controlador.
     * @param quickResponses - As mensagens mínpidas.
     */
    constructor(options?: Partial<QuickResponseController>, quickResponses?: QuickResponse[]);
    /**
     * Injeta os dados no controlador.
     * @param options - Dados a serem injetados.
     */
    inject(options: Partial<QuickResponseController>): void;
    /**
     * Adiciona uma ou mais respostas rápidas.
     * @param quickResponses - As respostas rápidas.
     */
    add(...quickResponses: QuickResponse[]): void;
    /**
     * Remove uma ou mais mensagens específicas.
     * @param quickResponses - As respostas rápidas a serem removidas.
     */
    remove(...quickResponses: Array<QuickResponse | string>): void;
    /**
     * @returns As respostas rápidas.
     */
    getAll(): QuickResponse[];
    searchAndExecute(message: Message): Promise<Message | null | unknown>;
    /**
     * Pesquisa por uma resposta rápida.
     * @param message - A mensagem de referencia.
     */
    search(message: Message): Promise<{
        quickResponse: QuickResponse;
        pattern: QuickResponsePattern;
    } | null>;
    /**
     * Pesquisa por um padrão na mensagem.
     * @param text - O texto a ser pesquisado.
     * @param message - A mensagem de referencia.
     * @param patterns - Os padrões da resposta rápida.
     */
    searchInPatterns(text: string, message: Message, ...patterns: QuickResponsePattern[]): Promise<QuickResponsePattern | null>;
}
