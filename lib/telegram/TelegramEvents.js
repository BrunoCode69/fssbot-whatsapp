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
        this.configInlineQueries();
        this.configPreCheckoutQueries();
        this.configChatJoinRequests();
        this.configMessageReactions();
    }
    configCallbackQueries() {
        this.telegram.bot.on('callback_query', async (query) => {
            const callbackData = query.data || '';
            const sourceMessage = query.message;
            if (!sourceMessage) {
                await this.telegram.answerCallbackQuery(query.id, 'Esta ação não está disponível nesta mensagem.');
                return;
            }
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
            selectedMessage.extra = {
                ...(selectedMessage.extra || {}),
                callbackQueryId: query.id,
            };
            await this.update(selectedMessage.user);
            await this.update(selectedMessage.chat);
            this.telegram.emit('message', selectedMessage);
            // Responde automaticamente caso o script não chame $answer_callback dentro de 1.5s,
            // evitando que o botão fique carregando infinitamente no app do usuário.
            setTimeout(() => {
                if (!this.telegram.isCallbackQueryAnswered(query.id)) {
                    void this.telegram.answerCallbackQuery(query.id).catch(() => { });
                }
            }, 1500);
        });
    }
    configMessage() {
        const receievMessage = async (msg) => {
            if (msg?.new_chat_members)
                return;
            if (msg?.left_chat_member)
                return;
            if (msg?.successful_payment) {
                const payment = msg.successful_payment;
                const chat = Chat_1.default.fromJSON({
                    id: String(msg.chat.id),
                    type: TelegramUtils_1.TelegramUtils.getChatType(msg.chat),
                    name: msg.chat.title || undefined,
                });
                const from = msg.from
                    ? User_1.default.fromJSON({
                        id: TelegramUtils_1.TelegramUtils.getId(msg.from),
                        name: TelegramUtils_1.TelegramUtils.getName(msg.from),
                        nickname: TelegramUtils_1.TelegramUtils.getNickname(msg.from),
                        phoneNumber: TelegramUtils_1.TelegramUtils.getPhoneNumber(msg.from.id),
                    })
                    : new User_1.default(String(msg.chat.id));
                this.telegram.emit('payment-success', {
                    chat,
                    user: from,
                    messageId: String(msg.message_id || ''),
                    currency: String(payment.currency || ''),
                    totalAmount: Number(payment.total_amount || 0),
                    invoicePayload: String(payment.invoice_payload || ''),
                    telegramChargeId: String(payment.telegram_payment_charge_id || ''),
                    providerChargeId: String(payment.provider_payment_charge_id || ''),
                });
            }
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
    configInlineQueries() {
        this.telegram.bot.on('inline_query', async (query) => {
            try {
                const user = User_1.default.fromJSON({
                    id: TelegramUtils_1.TelegramUtils.getId(query.from),
                    name: TelegramUtils_1.TelegramUtils.getName(query.from),
                    nickname: TelegramUtils_1.TelegramUtils.getNickname(query.from),
                    phoneNumber: TelegramUtils_1.TelegramUtils.getPhoneNumber(query.from.id),
                });
                await this.update(user);
                this.telegram.emit('inline-query', {
                    id: String(query.id || ''),
                    query: String(query.query || ''),
                    offset: String(query.offset || ''),
                    user,
                });
            }
            catch (err) {
                this.telegram.emit('error', err);
            }
        });
    }
    configPreCheckoutQueries() {
        this.telegram.bot.on('pre_checkout_query', async (query) => {
            try {
                const user = User_1.default.fromJSON({
                    id: TelegramUtils_1.TelegramUtils.getId(query.from),
                    name: TelegramUtils_1.TelegramUtils.getName(query.from),
                    nickname: TelegramUtils_1.TelegramUtils.getNickname(query.from),
                    phoneNumber: TelegramUtils_1.TelegramUtils.getPhoneNumber(query.from.id),
                });
                await this.update(user);
                this.telegram.emit('pre-checkout-query', {
                    id: String(query.id || ''),
                    currency: String(query.currency || ''),
                    totalAmount: Number(query.total_amount || 0),
                    invoicePayload: String(query.invoice_payload || ''),
                    user,
                });
            }
            catch (err) {
                this.telegram.emit('error', err);
            }
        });
    }
    configChatJoinRequests() {
        this.telegram.bot.on('chat_join_request', async (req) => {
            try {
                const chat = Chat_1.default.fromJSON({
                    id: String(req.chat.id),
                    type: TelegramUtils_1.TelegramUtils.getChatType(req.chat),
                    name: req.chat?.title || undefined,
                });
                const user = User_1.default.fromJSON({
                    id: TelegramUtils_1.TelegramUtils.getId(req.from),
                    name: TelegramUtils_1.TelegramUtils.getName(req.from),
                    nickname: TelegramUtils_1.TelegramUtils.getNickname(req.from),
                    phoneNumber: TelegramUtils_1.TelegramUtils.getPhoneNumber(req.from.id),
                });
                await this.update(user);
                await this.update(chat);
                this.telegram.emit('group-join-request', {
                    action: 'created',
                    method: req.invite_link?.invite_link ? 'invite_link' : undefined,
                    chat,
                    user,
                });
            }
            catch (err) {
                this.telegram.emit('error', err);
            }
        });
    }
    configMessageReactions() {
        this.telegram.bot.on('message_reaction', async (reaction) => {
            try {
                const chat = Chat_1.default.fromJSON({
                    id: String(reaction.chat.id),
                    type: TelegramUtils_1.TelegramUtils.getChatType(reaction.chat),
                    name: reaction.chat?.title || undefined,
                });
                const fromRaw = reaction.user || reaction.actor_chat;
                const user = fromRaw
                    ? User_1.default.fromJSON({
                        id: String(fromRaw.id),
                        name: TelegramUtils_1.TelegramUtils.getName(fromRaw),
                        nickname: TelegramUtils_1.TelegramUtils.getNickname(fromRaw),
                    })
                    : new User_1.default(String(reaction.chat.id));
                const toEmojis = (arr) => (Array.isArray(arr) ? arr : [])
                    .map((r) => (r?.type === 'emoji' ? r.emoji : r?.custom_emoji_id ? String(r.custom_emoji_id) : ''))
                    .filter(Boolean);
                const added = toEmojis(reaction.new_reaction);
                const removed = toEmojis(reaction.old_reaction);
                const emoji = added[0] || removed[0] || '';
                this.telegram.emit('message-reaction', {
                    chat,
                    user,
                    messageId: String(reaction.message_id || ''),
                    emoji,
                    added,
                    removed,
                });
            }
            catch (err) {
                this.telegram.emit('error', err);
            }
        });
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