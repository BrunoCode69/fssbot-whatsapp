import TelegramBotAPI from "node-telegram-bot-api";
import ChatType from "../modules/chat/ChatType";
import { type MediaDownloadOptions } from "../utils/MediaUtils";
export declare namespace TelegramUtils {
    function getId(data: Partial<TelegramBotAPI.Chat & TelegramBotAPI.User & TelegramBotAPI.Contact>): string;
    function getName(data: Partial<TelegramBotAPI.Chat & TelegramBotAPI.User & TelegramBotAPI.Contact>): string;
    function getNickname(data: Partial<TelegramBotAPI.Chat & TelegramBotAPI.User & TelegramBotAPI.Contact>): string;
    function getChatType(chat: TelegramBotAPI.Chat): ChatType;
    function getPhoneNumber(id: string | number): string;
    function isAnonymousGroupAdminMessage(msg: TelegramBotAPI.Message): boolean;
    function getText(msg: TelegramBotAPI.Message): string;
    function getMention(text: string, entity: TelegramBotAPI.MessageEntity): string;
    function getMentions(text: string, entities: TelegramBotAPI.MessageEntity | TelegramBotAPI.MessageEntity[]): string[];
    function getMessageMentions(msg: TelegramBotAPI.Message): string[];
    /**
     * Baixa uma URL para a memória.
     * @param options Com opções, confere o status HTTP, aplica `maxBytes` (Content-Length e
     * bytes contados), `signal` e `timeoutMs`. Sem opções, mantém o comportamento antigo.
     */
    function downloadFileFromURL(url: string, options?: MediaDownloadOptions): Promise<Buffer>;
    /**
     * Baixa uma URL direto para `filePath`, em stream. Aplica `maxBytes` (Content-Length e
     * bytes contados), `signal` e `timeoutMs` (tempo total). Apaga o arquivo parcial em caso de falha.
     */
    function downloadFileFromURLToFile(url: string, filePath: string, options?: MediaDownloadOptions): Promise<void>;
}
