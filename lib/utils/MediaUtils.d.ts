import { Transform } from 'stream';
/** Opções de download de mídia (memória ou arquivo). */
export type MediaDownloadOptions = {
    /** Máximo de bytes aceitos; acima disso o download falha. Sem valor (ou `<= 0`) = sem limite próprio. */
    maxBytes?: number;
    /** Cancela o download. */
    signal?: AbortSignal;
    /** Tempo máximo do download em milissegundos. */
    timeoutMs?: number;
};
/** Código do erro de mídia acima do limite (`error.code`). */
export declare const MEDIA_TOO_LARGE_ERROR_CODE = "MEDIA_TOO_LARGE";
/** Cria o erro de mídia acima do limite, com `code = MEDIA_TOO_LARGE`. */
export declare function createMediaTooLargeError(maxBytes: number, size?: number): Error;
/** Limite válido (> 0) das opções, ou `undefined` quando não há limite. */
export declare function getMediaMaxBytes(options?: MediaDownloadOptions): number | undefined;
/**
 * Converte tamanhos/durações vindos das plataformas (number, string, bigint, Long ou
 * Long serializado `{ low, high }`) em número. Valor inválido ou negativo = 0.
 */
export declare function toMediaNumber(value: any): number;
/** Transform que conta os bytes e falha se passar de `maxBytes` (sem limite = só repassa). */
export declare function createByteLimitTransform(maxBytes?: number): Transform;
/** Apaga um arquivo ignorando erros (ex.: arquivo parcial que nem chegou a ser criado). */
export declare function removeFileQuietly(filePath: string): Promise<void>;
/** Verifica se o valor é o caminho de um arquivo local existente. */
export declare function isLocalFilePath(value: any): value is string;
/** Extensão (sem ponto) pelo mimetype; '' quando desconhecido. */
export declare function getExtensionFromMimetype(mimetype?: string): string;
/** Nome padrão para arquivo sem nome: `<base>.<ext do mimetype>` ou só `<base>`. */
export declare function getDefaultMediaFileName(mimetype?: string, base?: string): string;
/** Verifica se o valor é uma URL HTTP/HTTPS. */
export declare function isHttpUrl(value: any): value is string;
/** Baixa uma URL HTTP/HTTPS para Buffer aplicando maxBytes, signal e timeoutMs. */
export declare function downloadMediaFromURL(url: string, options?: MediaDownloadOptions, sourceLabel?: string): Promise<Buffer>;
/** Baixa uma URL HTTP/HTTPS em stream direto para filePath; remove arquivo parcial em falha. */
export declare function downloadMediaFromURLToFile(url: string, filePath: string, options?: MediaDownloadOptions, sourceLabel?: string): Promise<void>;
