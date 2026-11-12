import TelegramBotAPI from "node-telegram-bot-api";

import ChatType from "../modules/chat/ChatType";
import { createWriteStream } from "fs";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import {
  type MediaDownloadOptions,
  createByteLimitTransform,
  createMediaTooLargeError,
  getMediaMaxBytes,
  removeFileQuietly,
  toMediaNumber,
} from "../utils/MediaUtils";

export namespace TelegramUtils {
  export function getId(data: Partial<TelegramBotAPI.Chat & TelegramBotAPI.User & TelegramBotAPI.Contact>): string {
    if (!data || typeof data != "object") {
      return "";
    }

    return `${data.id || data.user_id || ""}`;
  }

  export function getName(data: Partial<TelegramBotAPI.Chat & TelegramBotAPI.User & TelegramBotAPI.Contact>): string {
    if (!data || typeof data != "object") {
      return "";
    }

    if (data.first_name && data.last_name) {
      return `${data.first_name} ${data.last_name}`;
    }

    if (data.first_name) {
      return `${data.first_name}`;
    }

    if (data.username) {
      return `${data.username}`;
    }

    return "";
  }

  export function getNickname(data: Partial<TelegramBotAPI.Chat & TelegramBotAPI.User & TelegramBotAPI.Contact>): string {
    if (!data || typeof data != "object") {
      return "";
    }

    return `${data.username || ""}`;
  }

  export function getChatType(chat: TelegramBotAPI.Chat): ChatType {
    if (!chat || typeof chat != "object") {
      return ChatType.PV;
    }

    return chat.type == "private" ? ChatType.PV : ChatType.Group;
  }

  export function getPhoneNumber(id: string | number): string {
    return `${id}`.replace(/\D+/g, "") || "0";
  }

  export function isAnonymousGroupAdminMessage(msg: TelegramBotAPI.Message): boolean {
    return msg?.from?.is_bot === true
      && msg.from.username === 'GroupAnonymousBot'
      && String(msg.sender_chat?.id ?? '') === String(msg.chat?.id ?? '');
  }

  export function getText(msg: TelegramBotAPI.Message): string {
    if (!msg || typeof msg != "object") {
      return "";
    }

    return `${msg.text || msg.caption || ""}`;
  }

  export function getMention(text: string, entity: TelegramBotAPI.MessageEntity): string {
    if (!text || !entity || typeof entity != "object") {
      return "";
    }

    if (entity.type != "mention") {
      return "";
    }

    const start = Number(entity.offset || -1) + 1;
    const end = start + Number(entity.length || 0);

    if (end >= text.length) {
      return "";
    }

    return `${text.slice(start, end)}`;
  }

  export function getMentions(text: string, entities: TelegramBotAPI.MessageEntity | TelegramBotAPI.MessageEntity[]): string[] {
    if (!text || !entities) {
      return [];
    }

    if (!Array.isArray(entities)) {
      entities = [entities];
    }

    return entities.reduce((mentions, entity) => {
      const mention = getMention(text, entity);

      if (mention) {
        mentions.push(mention);
      }

      return mentions;
    }, [] as string[]);
  }

  export function getMessageMentions(msg: TelegramBotAPI.Message): string[] {
    return getMentions(getText(msg), msg.entities!);
  }

  /**
   * Baixa uma URL para a memória.
   * @param options Com opções, confere o status HTTP, aplica `maxBytes` (Content-Length e
   * bytes contados), `signal` e `timeoutMs`. Sem opções, mantém o comportamento antigo.
   */
  export async function downloadFileFromURL(url: string, options?: MediaDownloadOptions): Promise<Buffer> {
    if (!options) {
      return Buffer.from(await (await fetch(url)).arrayBuffer());
    }

    const download = await openDownload(url, options);

    try {
      const chunks: Uint8Array[] = [];
      let total = 0;

      for await (const chunk of readBody(download.response)) {
        total += chunk.byteLength;

        if (download.maxBytes && total > download.maxBytes) {
          throw createMediaTooLargeError(download.maxBytes);
        }

        chunks.push(chunk);
      }

      return Buffer.concat(chunks);
    } finally {
      download.cleanup();
    }
  }

  /**
   * Baixa uma URL direto para `filePath`, em stream. Aplica `maxBytes` (Content-Length e
   * bytes contados), `signal` e `timeoutMs` (tempo total). Apaga o arquivo parcial em caso de falha.
   */
  export async function downloadFileFromURLToFile(url: string, filePath: string, options: MediaDownloadOptions = {}): Promise<void> {
    try {
      const download = await openDownload(url, options);

      try {
        await pipeline(
          Readable.from(readBody(download.response)),
          createByteLimitTransform(download.maxBytes),
          createWriteStream(filePath),
        );
      } finally {
        download.cleanup();
      }
    } catch (error) {
      await removeFileQuietly(filePath);
      throw error;
    }
  }

  /** Faz o fetch com cancelamento/tempo máximo e recusa cedo pelo Content-Length. */
  async function openDownload(url: string, options: MediaDownloadOptions) {
    const controller = new AbortController();
    const signal = options.signal;
    const abort = () => controller.abort((signal as any)?.reason);
    const timeoutMs = Number(options.timeoutMs || 0);

    if (signal) {
      if (signal.aborted) abort();
      else signal.addEventListener("abort", abort, { once: true });
    }

    const timer = timeoutMs > 0
      ? setTimeout(() => controller.abort(new Error(`Tempo esgotado ao baixar a mídia (${timeoutMs} ms).`)), timeoutMs)
      : undefined;

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
    };

    try {
      const response = await fetch(url, { signal: controller.signal });

      if (!response.ok) {
        await response.body?.cancel().catch(() => {});
        throw new Error(`Falha ao baixar a mídia do Telegram (HTTP ${response.status}).`);
      }

      const maxBytes = getMediaMaxBytes(options);
      const length = toMediaNumber(response.headers.get("content-length"));

      if (maxBytes && length > maxBytes) {
        await response.body?.cancel().catch(() => {});
        throw createMediaTooLargeError(maxBytes, length);
      }

      return { response, maxBytes, cleanup };
    } catch (error) {
      cleanup();
      throw error;
    }
  }

  /** Lê o corpo da resposta em pedaços; cancela a leitura se o consumidor parar antes. */
  async function* readBody(response: Response): AsyncGenerator<Uint8Array> {
    if (!response.body) return;

    const reader = response.body.getReader();
    let done = false;

    try {
      while (true) {
        const result = await reader.read();

        if (result.done) {
          done = true;
          return;
        }

        if (result.value?.byteLength) yield result.value;
      }
    } finally {
      if (!done) await reader.cancel().catch(() => {});
    }
  }
}
