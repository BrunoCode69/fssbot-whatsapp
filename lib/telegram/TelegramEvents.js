"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Chat_1 = __importDefault(require("../modules/chat/Chat"));
const User_1 = __importDefault(require("../modules/user/User"));
const TelegramToRompotConverter_1 = __importDefault(require("./TelegramToRompotConverter"));
const TelegramUtils_1 = require("./TelegramUtils");
class TelegramEvents {
    constructor(telegram) {
        this.telegram = telegram;
    }
    configAll() {
        this.configMessage();
        this.configNewChatMembers();
        this.configLeftChatMember();
    }
    configMessage() {
        const receievMessage = async (msg) => {
            if (msg === null || msg === void 0 ? void 0 : msg.new_chat_members)
                return;
            if (msg === null || msg === void 0 ? void 0 : msg.left_chat_member)
                return;
            const converter = new TelegramToRompotConverter_1.default(msg);
            const rompotMessage = await converter.convert(true);
            await this.update(rompotMessage.user);
            await this.update(rompotMessage.chat);
            this.telegram.emit("message", rompotMessage);
        };
        this.telegram.bot.on("message", receievMessage);
        this.telegram.bot.on("edited_message", receievMessage);
    }
    configNewChatMembers() {
        this.telegram.bot.on("new_chat_members", async (msg) => {
            const converter = new TelegramToRompotConverter_1.default(msg);
            const rompotMessage = await converter.convert(true);
            for (const member of msg.new_chat_members || []) {
                const userId = TelegramUtils_1.TelegramUtils.getId(member);
                const user = User_1.default.fromJSON({
                    ...((await this.telegram.getUser(new User_1.default(userId))) || {}),
                    id: userId,
                    name: TelegramUtils_1.TelegramUtils.getName(member),
                    nickname: TelegramUtils_1.TelegramUtils.getNickname(member),
                    phoneNumber: TelegramUtils_1.TelegramUtils.getPhoneNumber(userId),
                });
                await this.updateChatUsers("add", rompotMessage.chat, user);
                await this.update(user);
                await this.update(rompotMessage.user);
                await this.update(rompotMessage.chat);
                if (rompotMessage.user.id == user.id) {
                    this.telegram.emit("user", { action: "join", event: "add", user, chat: rompotMessage.chat, fromUser: rompotMessage.user });
                }
                else {
                    this.telegram.emit("user", { action: "add", event: "add", user, chat: rompotMessage.chat, fromUser: rompotMessage.user });
                }
            }
        });
    }
    configLeftChatMember() {
        this.telegram.bot.on("left_chat_member", async (msg) => {
            const converter = new TelegramToRompotConverter_1.default(msg);
            const rompotMessage = await converter.convert(true);
            const userId = TelegramUtils_1.TelegramUtils.getId(msg.left_chat_member);
            const user = User_1.default.fromJSON({
                ...((await this.telegram.getUser(new User_1.default(userId))) || {}),
                id: userId,
                name: TelegramUtils_1.TelegramUtils.getName(msg.left_chat_member),
                nickname: TelegramUtils_1.TelegramUtils.getNickname(msg.left_chat_member),
                phoneNumber: TelegramUtils_1.TelegramUtils.getPhoneNumber(userId),
            });
            await this.update(user);
            await this.update(rompotMessage.user);
            await this.update(rompotMessage.chat);
            await this.updateChatUsers("remove", rompotMessage.chat, user);
            if (rompotMessage.user.id == user.id) {
                this.telegram.emit("user", { action: "leave", event: "remove", user, chat: rompotMessage.chat, fromUser: rompotMessage.user });
            }
            else {
                this.telegram.emit("user", { action: "remove", event: "remove", user, chat: rompotMessage.chat, fromUser: rompotMessage.user });
            }
        });
    }
    async update(data) {
        try {
            if (!data)
                return;
            if (data instanceof User_1.default) {
                return await this.telegram.updateUser(data);
            }
            if (data instanceof Chat_1.default) {
                return await this.telegram.updateChat(data);
            }
        }
        catch (error) {
            this.telegram.emit("error", error);
        }
    }
    async updateChatUsers(action, chat, ...users) {
        try {
            chat = Chat_1.default.fromJSON({
                ...((await this.telegram.getChat(chat)) || {}),
                ...chat,
            });
            if (action == "add") {
                let users = chat.users || [];
                users = users.filter((user) => !users.includes(user));
                if (users.length == 0)
                    return;
                chat.users = users;
                await this.update(chat);
            }
            else if (action == "remove") {
                const userIds = users.map((user) => user.id);
                if (userIds.includes(this.telegram.id)) {
                    await this.telegram.removeChat(chat);
                }
                else {
                    const users = chat.users || [];
                    chat.users = users.filter((userId) => !userIds.includes(userId));
                    await this.update(chat);
                }
            }
        }
        catch (error) {
            this.telegram.emit("error", error);
        }
    }
}
exports.default = TelegramEvents;
//# sourceMappingURL=TelegramEvents.js.map