"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Chat_1 = __importDefault(require("../modules/chat/Chat"));
const User_1 = __importDefault(require("../modules/user/User"));
const TelegramToRompotConverter_1 = __importDefault(require("./TelegramToRompotConverter"));
const TelegramUtils_1 = require("./TelegramUtils");
const ButtonMessage_1 = __importDefault(require("../messages/ButtonMessage"));
const PollUpdateMessage_1 = __importDefault(require("../messages/PollUpdateMessage"));
const Message_1 = require("../messages/Message");
const PollMessage_1 = require("../messages/PollMessage");
class TelegramEvents {
    constructor(telegram) {
        this.telegram = telegram;
    }
    configAll() {
        this.configMessage();
        this.configChannelPost();
        this.configCallbackQueries();
        this.configPollAnswer();
        this.configNewChatMembers();
        this.configLeftChatMember();
    }
    configCallbackQueries() {
        this.telegram.bot.on('callback_query', async (query) => {
            const callbackData = query.data || '';
            const sourceMessage = query.message;
            if (!sourceMessage) {
                await this.telegram.bot.answerCallbackQuery(query.id, { text: 'Esta ação não está disponível nesta mensagem.' });
                return;
            }
            await this.telegram.bot.answerCallbackQuery(query.id);
            const selectedMessage = ButtonMessage_1.default.fromJSON({
                chat: { id: String(sourceMessage.chat.id), type: TelegramUtils_1.TelegramUtils.getChatType(sourceMessage.chat) },
                user: {
                    id: TelegramUtils_1.TelegramUtils.getId(query.from),
                    name: TelegramUtils_1.TelegramUtils.getName(query.from),
                    nickname: TelegramUtils_1.TelegramUtils.getNickname(query.from),
                    phoneNumber: TelegramUtils_1.TelegramUtils.getPhoneNumber(query.from.id),
                },
                id: String(sourceMessage.message_id),
                text: callbackData,
                selected: callbackData,
                fromMe: false,
            });
            await this.update(selectedMessage.user);
            await this.update(selectedMessage.chat);
            this.telegram.emit('message', selectedMessage);
        });
    }
    configMessage() {
        const receievMessage = async (msg) => {
            if (msg?.new_chat_members)
                return;
            if (msg?.left_chat_member)
                return;
            const converter = new TelegramToRompotConverter_1.default(msg);
            const rompotMessage = await converter.convert(true);
            await this.update(rompotMessage.user);
            await this.update(rompotMessage.chat);
            this.telegram.emit("message", rompotMessage);
            if (msg?.new_chat_title) {
                this.telegram.emit("group-update", {
                    action: "name",
                    changes: { name: msg.new_chat_title },
                    chat: rompotMessage.chat,
                    fromUser: rompotMessage.user,
                });
            }
        };
        this.telegram.bot.on("message", receievMessage);
        this.telegram.bot.on("edited_message", receievMessage);
    }
    configChannelPost() {
        const receiveChannelPost = async (msg) => {
            const converter = new TelegramToRompotConverter_1.default(msg);
            const rompotMessage = await converter.convert(true);
            await this.update(rompotMessage.chat);
            this.telegram.emit("message", rompotMessage);
        };
        this.telegram.bot.on("channel_post", receiveChannelPost);
        this.telegram.bot.on("edited_channel_post", receiveChannelPost);
    }
    configPollAnswer() {
        this.telegram.bot.on("poll_answer", async (answer) => {
            try {
                const user = User_1.default.fromJSON({
                    id: TelegramUtils_1.TelegramUtils.getId(answer.user),
                    name: TelegramUtils_1.TelegramUtils.getName(answer.user),
                    nickname: TelegramUtils_1.TelegramUtils.getNickname(answer.user),
                    phoneNumber: TelegramUtils_1.TelegramUtils.getPhoneNumber(answer.user.id),
                });
                const optionIdx = answer.option_ids?.[0] !== undefined ? String(answer.option_ids[0]) : '';
                const pollUpdate = PollUpdateMessage_1.default.fromJSON({
                    type: Message_1.MessageType.PollUpdate,
                    id: answer.poll_id,
                    user,
                    selected: optionIdx,
                    text: optionIdx,
                    action: answer.option_ids?.length ? PollMessage_1.PollAction.Add : PollMessage_1.PollAction.Remove,
                    extra: { pollId: answer.poll_id, optionIds: answer.option_ids },
                });
                this.telegram.emit("message", pollUpdate);
            }
            catch (err) {
                this.telegram.emit("error", err);
            }
        });
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