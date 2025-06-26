import ICommandControllerConfig from './ICommandControllerConfig';
export default class CommandKey {
    /** Tipo da chave */
    type: string;
    /** Valores da chave */
    values: string[];
    constructor(...values: string[]);
    /**
     * Procura pela chave em um texto
     * @return retorna se a chave foi encontrada
     */
    static search(text: string, config: ICommandControllerConfig, ...keys: CommandKey[]): CommandKey | null;
    /** Verifica se o texto contem as chaves */
    static verify(text: string, keys: string[]): boolean;
    /** Verifica se o texto tem as chaves exatas */
    static verifyExact(text: string, keys: string[]): boolean;
}
