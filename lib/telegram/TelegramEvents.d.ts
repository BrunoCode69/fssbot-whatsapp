import Chat from "../modules/chat/Chat";
import User from "../modules/user/User";
import TelegramBot from "./TelegramBot";
export default class TelegramEvents {
    telegram: TelegramBot;
    constructor(telegram: TelegramBot);
    configAll(): void;
    configMessage(): void;
    configNewChatMembers(): void;
    configLeftChatMember(): void;
    update(data: User | Chat): Promise<void>;
    updateChatUsers(action: "add" | "remove", chat: Chat, ...users: User[]): Promise<void>;
}
