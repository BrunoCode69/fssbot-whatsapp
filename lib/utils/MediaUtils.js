"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MEDIA_TOO_LARGE_ERROR_CODE = void 0;
exports.createMediaTooLargeError = createMediaTooLargeError;
exports.getMediaMaxBytes = getMediaMaxBytes;
exports.toMediaNumber = toMediaNumber;
exports.createByteLimitTransform = createByteLimitTransform;
exports.removeFileQuietly = removeFileQuietly;
exports.isLocalFilePath = isLocalFilePath;
exports.getExtensionFromMimetype = getExtensionFromMimetype;
exports.getDefaultMediaFileName = getDefaultMediaFileName;
exports.isHttpUrl = isHttpUrl;
exports.downloadMediaFromURL = downloadMediaFromURL;
exports.downloadMediaFromURLToFile = downloadMediaFromURLToFile;
const fs_1 = require("fs");
const stream_1 = require("stream");
const promises_1 = require("stream/promises");
const promises_2 = require("fs/promises");
const stream_2 = require("stream");
const long_1 = __importDefault(require("long"));
/** Código do erro de mídia acima do limite (`error.code`). */
exports.MEDIA_TOO_LARGE_ERROR_CODE = 'MEDIA_TOO_LARGE';
/** Cria o erro de mídia acima do limite, com `code = MEDIA_TOO_LARGE`. */
function createMediaTooLargeError(maxBytes, size) {
    const error = new Error(size
        ? `A mídia tem ${size} bytes e passa do limite de ${maxBytes} bytes.`
        : `A mídia passa do limite de ${maxBytes} bytes.`);
    error.code = exports.MEDIA_TOO_LARGE_ERROR_CODE;
    error.maxBytes = maxBytes;
    if (size)
        error.size = size;
    return error;
}
/** Limite válido (> 0) das opções, ou `undefined` quando não há limite. */
function getMediaMaxBytes(options) {
    const maxBytes = Number(options?.maxBytes);
    return Number.isFinite(maxBytes) && maxBytes > 0 ? maxBytes : undefined;
}
/**
 * Converte tamanhos/durações vindos das plataformas (number, string, bigint, Long ou
 * Long serializado `{ low, high }`) em número. Valor inválido ou negativo = 0.
 */
function toMediaNumber(value) {
    let result = 0;
    try {
        if (value === null || value === undefined || value === '')
            return 0;
        if (typeof value === 'number')
            result = value;
        else if (typeof value === 'bigint')
            result = Number(value);
        else if (typeof value === 'string')
            result = Number(value);
        else if (long_1.default.isLong(value))
            result = value.toNumber();
        else if (typeof value === 'object' && typeof value.low === 'number' && typeof value.high === 'number') {
            result = long_1.default.fromBits(value.low, value.high, !!value.unsigned).toNumber();
        }
        else if (typeof value?.toNumber === 'function')
            result = Number(value.toNumber());
    }
    catch {
        return 0;
    }
    return Number.isFinite(result) && result > 0 ? result : 0;
}
/** Transform que conta os bytes e falha se passar de `maxBytes` (sem limite = só repassa). */
function createByteLimitTransform(maxBytes) {
    let received = 0;
    return new stream_2.Transform({
        transform(chunk, _encoding, callback) {
            received += chunk?.length || 0;
            if (maxBytes && received > maxBytes) {
                callback(createMediaTooLargeError(maxBytes));
                return;
            }
            callback(null, chunk);
        },
    });
}
/** Apaga um arquivo ignorando erros (ex.: arquivo parcial que nem chegou a ser criado). */
async function removeFileQuietly(filePath) {
    try {
        await (0, promises_2.unlink)(filePath);
    }
    catch { }
}
/** Verifica se o valor é o caminho de um arquivo local existente. */
function isLocalFilePath(value) {
    if (typeof value !== 'string' || !value || value.length > 4096)
        return false;
    try {
        return (0, fs_1.statSync)(value).isFile();
    }
    catch {
        return false;
    }
}
/** Extensões por mimetype (sem parâmetros, minúsculo). */
const MIMETYPE_EXTENSIONS = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/bmp': 'bmp',
    'image/svg+xml': 'svg',
    'image/heic': 'heic',
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'video/webm': 'webm',
    'video/x-matroska': 'mkv',
    'video/3gpp': '3gp',
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/ogg': 'ogg',
    'audio/opus': 'opus',
    'audio/mp4': 'm4a',
    'audio/x-m4a': 'm4a',
    'audio/aac': 'aac',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
    'audio/wave': 'wav',
    'audio/flac': 'flac',
    'audio/x-flac': 'flac',
    'application/pdf': 'pdf',
    'text/plain': 'txt',
    'text/csv': 'csv',
    'application/json': 'json',
    'application/xml': 'xml',
    'text/xml': 'xml',
    'text/html': 'html',
    'text/markdown': 'md',
    'application/zip': 'zip',
    'application/x-zip-compressed': 'zip',
    'application/vnd.rar': 'rar',
    'application/x-rar-compressed': 'rar',
    'application/x-7z-compressed': '7z',
    'application/x-tar': 'tar',
    'application/gzip': 'gz',
    'application/x-gzip': 'gz',
    'application/vnd.android.package-archive': 'apk',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.ms-powerpoint': 'ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
};
/** Extensão (sem ponto) pelo mimetype; '' quando desconhecido. */
function getExtensionFromMimetype(mimetype) {
    const base = `${mimetype || ''}`.split(';')[0].trim().toLowerCase();
    return MIMETYPE_EXTENSIONS[base] || '';
}
/** Nome padrão para arquivo sem nome: `<base>.<ext do mimetype>` ou só `<base>`. */
function getDefaultMediaFileName(mimetype, base = 'document') {
    const ext = getExtensionFromMimetype(mimetype);
    return ext ? `${base}.${ext}` : base;
}
/** Verifica se o valor é uma URL HTTP/HTTPS. */
function isHttpUrl(value) {
    return typeof value === 'string' && new RegExp('^https?://', 'i').test(value.trim());
}
async function openHttpMediaDownload(url, options = {}, sourceLabel) {
    const controller = new AbortController();
    const signal = options.signal;
    const abort = () => controller.abort(signal?.reason);
    const timeoutMs = Number(options.timeoutMs || 0);
    if (signal) {
        if (signal.aborted)
            abort();
        else
            signal.addEventListener('abort', abort, { once: true });
    }
    const timer = timeoutMs > 0
        ? setTimeout(() => controller.abort(new Error(`Tempo esgotado ao baixar a mídia (${timeoutMs} ms).`)), timeoutMs)
        : undefined;
    const cleanup = () => {
        if (timer)
            clearTimeout(timer);
        signal?.removeEventListener('abort', abort);
    };
    try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) {
            await response.body?.cancel().catch(() => { });
            const fromLabel = sourceLabel ? ` do ${sourceLabel}` : '';
            throw new Error(`Falha ao baixar a mídia${fromLabel} (HTTP ${response.status}).`);
        }
        const maxBytes = getMediaMaxBytes(options);
        const length = toMediaNumber(response.headers.get('content-length'));
        if (maxBytes && length > maxBytes) {
            await response.body?.cancel().catch(() => { });
            throw createMediaTooLargeError(maxBytes, length);
        }
        return { response, maxBytes, cleanup };
    }
    catch (error) {
        cleanup();
        throw error;
    }
}
async function* readHttpBody(response) {
    if (!response.body)
        return;
    const reader = response.body.getReader();
    let done = false;
    try {
        while (true) {
            const result = await reader.read();
            if (result.done) {
                done = true;
                return;
            }
            if (result.value?.byteLength)
                yield result.value;
        }
    }
    finally {
        if (!done)
            await reader.cancel().catch(() => { });
    }
}
/** Baixa uma URL HTTP/HTTPS para Buffer aplicando maxBytes, signal e timeoutMs. */
async function downloadMediaFromURL(url, options, sourceLabel) {
    const download = await openHttpMediaDownload(url, options || {}, sourceLabel);
    try {
        const chunks = [];
        let total = 0;
        for await (const chunk of readHttpBody(download.response)) {
            total += chunk.byteLength;
            if (download.maxBytes && total > download.maxBytes) {
                throw createMediaTooLargeError(download.maxBytes);
            }
            chunks.push(chunk);
        }
        return Buffer.concat(chunks);
    }
    finally {
        download.cleanup();
    }
}
/** Baixa uma URL HTTP/HTTPS em stream direto para filePath; remove arquivo parcial em falha. */
async function downloadMediaFromURLToFile(url, filePath, options = {}, sourceLabel) {
    try {
        const download = await openHttpMediaDownload(url, options, sourceLabel);
        try {
            await (0, promises_1.pipeline)(stream_1.Readable.from(readHttpBody(download.response)), createByteLimitTransform(download.maxBytes), (0, fs_1.createWriteStream)(filePath));
        }
        finally {
            download.cleanup();
        }
    }
    catch (error) {
        await removeFileQuietly(filePath);
        throw error;
    }
}
//# sourceMappingURL=MediaUtils.js.map