import { statSync } from 'fs';
import { unlink } from 'fs/promises';
import { Transform } from 'stream';
import Long from 'long';

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
export const MEDIA_TOO_LARGE_ERROR_CODE = 'MEDIA_TOO_LARGE';

/** Cria o erro de mídia acima do limite, com `code = MEDIA_TOO_LARGE`. */
export function createMediaTooLargeError(maxBytes: number, size?: number): Error {
  const error: any = new Error(
    size
      ? `A mídia tem ${size} bytes e passa do limite de ${maxBytes} bytes.`
      : `A mídia passa do limite de ${maxBytes} bytes.`,
  );
  error.code = MEDIA_TOO_LARGE_ERROR_CODE;
  error.maxBytes = maxBytes;
  if (size) error.size = size;
  return error;
}

/** Limite válido (> 0) das opções, ou `undefined` quando não há limite. */
export function getMediaMaxBytes(options?: MediaDownloadOptions): number | undefined {
  const maxBytes = Number(options?.maxBytes);
  return Number.isFinite(maxBytes) && maxBytes > 0 ? maxBytes : undefined;
}

/**
 * Converte tamanhos/durações vindos das plataformas (number, string, bigint, Long ou
 * Long serializado `{ low, high }`) em número. Valor inválido ou negativo = 0.
 */
export function toMediaNumber(value: any): number {
  let result: number = 0;

  try {
    if (value === null || value === undefined || value === '') return 0;

    if (typeof value === 'number') result = value;
    else if (typeof value === 'bigint') result = Number(value);
    else if (typeof value === 'string') result = Number(value);
    else if (Long.isLong(value)) result = value.toNumber();
    else if (typeof value === 'object' && typeof value.low === 'number' && typeof value.high === 'number') {
      result = Long.fromBits(value.low, value.high, !!value.unsigned).toNumber();
    } else if (typeof value?.toNumber === 'function') result = Number(value.toNumber());
  } catch {
    return 0;
  }

  return Number.isFinite(result) && result > 0 ? result : 0;
}

/** Transform que conta os bytes e falha se passar de `maxBytes` (sem limite = só repassa). */
export function createByteLimitTransform(maxBytes?: number): Transform {
  let received = 0;

  return new Transform({
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
export async function removeFileQuietly(filePath: string): Promise<void> {
  try {
    await unlink(filePath);
  } catch {}
}

/** Verifica se o valor é o caminho de um arquivo local existente. */
export function isLocalFilePath(value: any): value is string {
  if (typeof value !== 'string' || !value || value.length > 4096) return false;

  try {
    return statSync(value).isFile();
  } catch {
    return false;
  }
}

/** Extensões por mimetype (sem parâmetros, minúsculo). */
const MIMETYPE_EXTENSIONS: Record<string, string> = {
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
export function getExtensionFromMimetype(mimetype?: string): string {
  const base = `${mimetype || ''}`.split(';')[0].trim().toLowerCase();
  return MIMETYPE_EXTENSIONS[base] || '';
}

/** Nome padrão para arquivo sem nome: `<base>.<ext do mimetype>` ou só `<base>`. */
export function getDefaultMediaFileName(mimetype?: string, base: string = 'document'): string {
  const ext = getExtensionFromMimetype(mimetype);
  return ext ? `${base}.${ext}` : base;
}
