"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramUtils = void 0;
const ChatType_1 = __importDefault(require("../modules/chat/ChatType"));
const fs_1 = require("fs");
const stream_1 = require("stream");
const promises_1 = require("stream/promises");
const MediaUtils_1 = require("../utils/MediaUtils");
var TelegramUtils;
(function (TelegramUtils) {
    function getId(data) {
        if (!data || typeof data != "object") {
            return "";
        }
        return `${data.id || data.user_id || ""}`;
    }
    TelegramUtils.getId = getId;
    function getName(data) {
        if (!data || typeof data != "object") {
            return "";
        }
        if (data.first_name && data.last_name) {
            return `${data.first_name} ${data.last_name}`;
        }
        if (data.first_name) {
            return `${data.first_name}`;
        }
        if (data.title) {
            return `${data.title}`;
        }
        if (data.username) {
            return `${data.username}`;
        }
        return "";
    }
    TelegramUtils.getName = getName;
    function getNickname(data) {
        if (!data || typeof data != "object") {
            return "";
        }
        return `${data.username || ""}`;
    }
    TelegramUtils.getNickname = getNickname;
    function getChatType(chat) {
        if (!chat || typeof chat != "object") {
            return ChatType_1.default.PV;
        }
        return chat.type == "private" ? ChatType_1.default.PV : ChatType_1.default.Group;
    }
    TelegramUtils.getChatType = getChatType;
    function getPhoneNumber(id) {
        return `${id}`.replace(/\D+/g, "") || "0";
    }
    TelegramUtils.getPhoneNumber = getPhoneNumber;
    function isAnonymousGroupAdminMessage(msg) {
        return msg?.from?.is_bot === true
            && msg.from.username === 'GroupAnonymousBot'
            && String(msg.sender_chat?.id ?? '') === String(msg.chat?.id ?? '');
    }
    TelegramUtils.isAnonymousGroupAdminMessage = isAnonymousGroupAdminMessage;
    function getText(msg) {
        if (!msg || typeof msg != "object") {
            return "";
        }
        return `${msg.text || msg.caption || ""}`;
    }
    TelegramUtils.getText = getText;
    function getMention(text, entity) {
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
    TelegramUtils.getMention = getMention;
    function getMentions(text, entities) {
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
        }, []);
    }
    TelegramUtils.getMentions = getMentions;
    function getMessageMentions(msg) {
        return getMentions(getText(msg), msg.entities);
    }
    TelegramUtils.getMessageMentions = getMessageMentions;
    /**
     * Baixa uma URL para a memória.
     * @param options Com opções, confere o status HTTP, aplica `maxBytes` (Content-Length e
     * bytes contados), `signal` e `timeoutMs`. Sem opções, mantém o comportamento antigo.
     */
    async function downloadFileFromURL(url, options) {
        if (!options) {
            return Buffer.from(await (await fetch(url)).arrayBuffer());
        }
        const download = await openDownload(url, options);
        try {
            const chunks = [];
            let total = 0;
            for await (const chunk of readBody(download.response)) {
                total += chunk.byteLength;
                if (download.maxBytes && total > download.maxBytes) {
                    throw (0, MediaUtils_1.createMediaTooLargeError)(download.maxBytes);
                }
                chunks.push(chunk);
            }
            return Buffer.concat(chunks);
        }
        finally {
            download.cleanup();
        }
    }
    TelegramUtils.downloadFileFromURL = downloadFileFromURL;
    /**
     * Baixa uma URL direto para `filePath`, em stream. Aplica `maxBytes` (Content-Length e
     * bytes contados), `signal` e `timeoutMs` (tempo total). Apaga o arquivo parcial em caso de falha.
     */
    async function downloadFileFromURLToFile(url, filePath, options = {}) {
        try {
            const download = await openDownload(url, options);
            try {
                await (0, promises_1.pipeline)(stream_1.Readable.from(readBody(download.response)), (0, MediaUtils_1.createByteLimitTransform)(download.maxBytes), (0, fs_1.createWriteStream)(filePath));
            }
            finally {
                download.cleanup();
            }
        }
        catch (error) {
            await (0, MediaUtils_1.removeFileQuietly)(filePath);
            throw error;
        }
    }
    TelegramUtils.downloadFileFromURLToFile = downloadFileFromURLToFile;
    /** Faz o fetch com cancelamento/tempo máximo e recusa cedo pelo Content-Length. */
    async function openDownload(url, options) {
        const controller = new AbortController();
        const signal = options.signal;
        const abort = () => controller.abort(signal?.reason);
        const timeoutMs = Number(options.timeoutMs || 0);
        if (signal) {
            if (signal.aborted)
                abort();
            else
                signal.addEventListener("abort", abort, { once: true });
        }
        const timer = timeoutMs > 0
            ? setTimeout(() => controller.abort(new Error(`Tempo esgotado ao baixar a mídia (${timeoutMs} ms).`)), timeoutMs)
            : undefined;
        const cleanup = () => {
            if (timer)
                clearTimeout(timer);
            signal?.removeEventListener("abort", abort);
        };
        try {
            const response = await fetch(url, { signal: controller.signal });
            if (!response.ok) {
                await response.body?.cancel().catch(() => { });
                throw new Error(`Falha ao baixar a mídia do Telegram (HTTP ${response.status}).`);
            }
            const maxBytes = (0, MediaUtils_1.getMediaMaxBytes)(options);
            const length = (0, MediaUtils_1.toMediaNumber)(response.headers.get("content-length"));
            if (maxBytes && length > maxBytes) {
                await response.body?.cancel().catch(() => { });
                throw (0, MediaUtils_1.createMediaTooLargeError)(maxBytes, length);
            }
            return { response, maxBytes, cleanup };
        }
        catch (error) {
            cleanup();
            throw error;
        }
    }
    /** Lê o corpo da resposta em pedaços; cancela a leitura se o consumidor parar antes. */
    async function* readBody(response) {
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
})(TelegramUtils || (exports.TelegramUtils = TelegramUtils = {}));
//# sourceMappingURL=TelegramUtils.js.map