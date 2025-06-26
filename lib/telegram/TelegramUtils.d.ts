/// <reference types="node" />
import TelegramBotAPI from "node-telegram-bot-api";
import ChatType from "../modules/chat/ChatType";
export declare namespace TelegramUtils {
    function getId(data: Partial<TelegramBotAPI.Chat & TelegramBotAPI.User & TelegramBotAPI.Contact>): string;
    function getName(data: Partial<TelegramBotAPI.Chat & TelegramBotAPI.User & TelegramBotAPI.Contact>): string;
    function getNickname(data: Partial<TelegramBotAPI.Chat & TelegramBotAPI.User & TelegramBotAPI.Contact>): string;
    function getChatType(chat: TelegramBotAPI.Chat): ChatType;
    function getPhoneNumber(id: string | number): string;
    function getText(msg: TelegramBotAPI.Message): string;
    function getMention(text: string, entity: TelegramBotAPI.MessageEntity): string;
    function getMentions(text: string, entities: TelegramBotAPI.MessageEntity | TelegramBotAPI.MessageEntity[]): string[];
    function getMessageMentions(msg: TelegramBotAPI.Message): string[];
    function downloadFileFromURL(url: string): Promise<Buffer>;
}
