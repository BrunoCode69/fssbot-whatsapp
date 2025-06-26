/// <reference types="node" />
/**
 * * Aguarda um determinado tempo
 * @param timeout
 * @returns
 */
export declare function sleep(timeout?: number): Promise<void>;
/**
 * * Obtem a imagem de uma url
 * @param uri URL
 * @returns
 */
export declare function getImageURL(uri: string): Promise<Buffer>;
/**
 * @param err Erro
 * @returns Retorna um erro
 */
export declare function getError(err: any): any;
/**
 * * Remove a Tag do texto
 * @param tag Tag do comando
 * @param text Texto do comando
 * @returns Texto sem a tag
 */
export declare function replaceCommandTag(tag: string, text: string): string;
export declare type ObjectJSON = {
    [key: string]: any | ObjectJSON;
};
/**
 * * Injeta valores de um objeto em outro
 * @param objectIn Objeto com novos valores
 * @param objectOut Objeto que receberá os novos valores
 * @param recursive Injeta dados recursivamente
 * @param force Força injetar dados
 * @returns Retorna o objeto com os novos valores
 */
export declare function injectJSON<T extends ObjectJSON>(objectIn: ObjectJSON, objectOut: T, recursive?: boolean, force?: boolean): T;
/** Retorna a versão do Rompot */
export declare function getRompotVersion(): string;
/** Lê um diretório recursivamente */
export declare function readRecursiveDir<Callback extends (fileptah: string, filename: string, ext: string) => any>(dir: string, callback: Callback): Promise<ReturnType<Awaited<Callback>>[]>;
/**
 * * Verifica se dois items são iguais.
 * @param a - Item A.
 * @param b - Item B.
 * @returns `true` se A for igual a B.
 */
export declare function verifyIsEquals(a: any, b: any): boolean;
