import TelegramBotAPI from "node-telegram-bot-api";

import Chat from "../modules/chat/Chat";
import User from "../modules/user/User";

import TelegramToRompotConverter from "./TelegramToRompotConverter";
import { TelegramUtils } from "./TelegramUtils";
import TelegramBot from "./TelegramBot";
import ButtonMessage from "../messages/ButtonMessage";
import PollUpdateMessage from "../messages/PollUpdateMessage";
import { MessageType } from "../messages/Message";
import { PollAction } from "../messages/PollMessage";

export default class TelegramEvents {
  public telegram: TelegramBot;

  constructor(telegram: TelegramBot) {
    this.telegram = telegram;
  }

  public configAll() {
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

  public configCallbackQueries() {
    this.telegram.bot.on('callback_query', async (query) => {
      const callbackData = query.data || '';
      const sourceMessage = query.message;
      if (!sourceMessage) {
        await this.telegram.answerCallbackQuery(query.id, 'Esta ação não está disponível nesta mensagem.');
        return;
      }

      const selectedMessage = ButtonMessage.fromJSON({
        chat: { id: String(sourceMessage.chat.id), type: TelegramUtils.getChatType(sourceMessage.chat) },
        user: {
          id: TelegramUtils.getId(query.from),
          name: TelegramUtils.getName(query.from),
          nickname: TelegramUtils.getNickname(query.from),
          phoneNumber: TelegramUtils.getPhoneNumber(query.from.id),
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
          void this.telegram.answerCallbackQuery(query.id).catch(() => {});
        }
      }, 1500);
    });
  }

  public configMessage() {
    const receievMessage = async (msg: TelegramBotAPI.Message) => {
      if (msg?.new_chat_members) return;
      if (msg?.left_chat_member) return;

      if ((msg as any)?.successful_payment) {
        const payment = (msg as any).successful_payment;
        const chat = Chat.fromJSON({
          id: String(msg.chat.id),
          type: TelegramUtils.getChatType(msg.chat),
          name: (msg.chat as any).title || undefined,
        });
        const from = msg.from
          ? User.fromJSON({
              id: TelegramUtils.getId(msg.from),
              name: TelegramUtils.getName(msg.from),
              nickname: TelegramUtils.getNickname(msg.from),
              phoneNumber: TelegramUtils.getPhoneNumber(msg.from.id),
            })
          : new User(String(msg.chat.id));

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

      const converter = new TelegramToRompotConverter(msg);

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

  public configInlineQueries() {
    this.telegram.bot.on('inline_query', async (query: any) => {
      try {
        const user = User.fromJSON({
          id: TelegramUtils.getId(query.from),
          name: TelegramUtils.getName(query.from),
          nickname: TelegramUtils.getNickname(query.from),
          phoneNumber: TelegramUtils.getPhoneNumber(query.from.id),
        });
        await this.update(user);
        this.telegram.emit('inline-query', {
          id: String(query.id || ''),
          query: String(query.query || ''),
          offset: String(query.offset || ''),
          user,
        });
      } catch (err) {
        this.telegram.emit('error', err as any);
      }
    });
  }

  public configPreCheckoutQueries() {
    this.telegram.bot.on('pre_checkout_query', async (query: any) => {
      try {
        const user = User.fromJSON({
          id: TelegramUtils.getId(query.from),
          name: TelegramUtils.getName(query.from),
          nickname: TelegramUtils.getNickname(query.from),
          phoneNumber: TelegramUtils.getPhoneNumber(query.from.id),
        });
        await this.update(user);
        this.telegram.emit('pre-checkout-query', {
          id: String(query.id || ''),
          currency: String(query.currency || ''),
          totalAmount: Number(query.total_amount || 0),
          invoicePayload: String(query.invoice_payload || ''),
          user,
        });
      } catch (err) {
        this.telegram.emit('error', err as any);
      }
    });
  }

  public configChatJoinRequests() {
    this.telegram.bot.on('chat_join_request' as any, async (req: any) => {
      try {
        const chat = Chat.fromJSON({
          id: String(req.chat.id),
          type: TelegramUtils.getChatType(req.chat),
          name: req.chat?.title || undefined,
        });
        const user = User.fromJSON({
          id: TelegramUtils.getId(req.from),
          name: TelegramUtils.getName(req.from),
          nickname: TelegramUtils.getNickname(req.from),
          phoneNumber: TelegramUtils.getPhoneNumber(req.from.id),
        });
        await this.update(user);
        await this.update(chat);
        this.telegram.emit('group-join-request', {
          action: 'created',
          method: req.invite_link?.invite_link ? 'invite_link' : undefined,
          chat,
          user,
        });
      } catch (err) {
        this.telegram.emit('error', err as any);
      }
    });
  }

  public configMessageReactions() {
    this.telegram.bot.on('message_reaction' as any, async (reaction: any) => {
      try {
        const chat = Chat.fromJSON({
          id: String(reaction.chat.id),
          type: TelegramUtils.getChatType(reaction.chat),
          name: reaction.chat?.title || undefined,
        });
        const fromRaw = reaction.user || reaction.actor_chat;
        const user = fromRaw
          ? User.fromJSON({
              id: String(fromRaw.id),
              name: TelegramUtils.getName(fromRaw),
              nickname: TelegramUtils.getNickname(fromRaw),
            })
          : new User(String(reaction.chat.id));
        const toEmojis = (arr: any[]) =>
          (Array.isArray(arr) ? arr : [])
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
      } catch (err) {
        this.telegram.emit('error', err as any);
      }
    });
  }

  public configChannelPost() {
    const receiveChannelPost = async (msg: TelegramBotAPI.Message) => {
      const converter = new TelegramToRompotConverter(msg);
      const rompotMessage = await converter.convert(true);

      await this.update(rompotMessage.chat);
      this.telegram.emit("message", rompotMessage);
    };

    this.telegram.bot.on("channel_post", receiveChannelPost);
    this.telegram.bot.on("edited_channel_post", receiveChannelPost);
  }

  public configPollAnswer() {
    this.telegram.bot.on("poll_answer", async (answer: any) => {
      try {
        const user = User.fromJSON({
          id: TelegramUtils.getId(answer.user),
          name: TelegramUtils.getName(answer.user),
          nickname: TelegramUtils.getNickname(answer.user),
          phoneNumber: TelegramUtils.getPhoneNumber(answer.user.id),
        });

        const optionIdx = answer.option_ids?.[0] !== undefined ? String(answer.option_ids[0]) : '';
        const pollUpdate = PollUpdateMessage.fromJSON({
          type: MessageType.PollUpdate,
          id: answer.poll_id,
          user,
          selected: optionIdx,
          text: optionIdx,
          action: answer.option_ids?.length ? PollAction.Add : PollAction.Remove,
          extra: { pollId: answer.poll_id, optionIds: answer.option_ids },
        });

        this.telegram.emit("message", pollUpdate);
      } catch (err) {
        this.telegram.emit("error", err as any);
      }
    });
  }

  public configNewChatMembers() {
    this.telegram.bot.on("new_chat_members", async (msg) => {
      const converter = new TelegramToRompotConverter(msg);

      const rompotMessage = await converter.convert(true);

      for (const member of msg.new_chat_members || []) {
        const userId: string = TelegramUtils.getId(member);

        const user = User.fromJSON({
          ...((await this.telegram.getUser(new User(userId))) || {}),
          id: userId,
          name: TelegramUtils.getName(member),
          nickname: TelegramUtils.getNickname(member),
          phoneNumber: TelegramUtils.getPhoneNumber(userId),
        });

        await this.updateChatUsers("add", rompotMessage.chat, user);

        await this.update(user);
        await this.update(rompotMessage.user);
        await this.update(rompotMessage.chat);

        if (rompotMessage.user.id == user.id) {
          this.telegram.emit("user", { action: "join", event: "add", user, chat: rompotMessage.chat, fromUser: rompotMessage.user });
        } else {
          this.telegram.emit("user", { action: "add", event: "add", user, chat: rompotMessage.chat, fromUser: rompotMessage.user });
        }
      }
    });
  }

  public configLeftChatMember() {
    this.telegram.bot.on("left_chat_member", async (msg) => {
      const converter = new TelegramToRompotConverter(msg);

      const rompotMessage = await converter.convert(true);

      const userId: string = TelegramUtils.getId(msg.left_chat_member!);

      const user = User.fromJSON({
        ...((await this.telegram.getUser(new User(userId))) || {}),
        id: userId,
        name: TelegramUtils.getName(msg.left_chat_member!),
        nickname: TelegramUtils.getNickname(msg.left_chat_member!),
        phoneNumber: TelegramUtils.getPhoneNumber(userId),
      });

      await this.update(user);
      await this.update(rompotMessage.user);
      await this.update(rompotMessage.chat);

      await this.updateChatUsers("remove", rompotMessage.chat, user);

      if (rompotMessage.user.id == user.id) {
        this.telegram.emit("user", { action: "leave", event: "remove", user, chat: rompotMessage.chat, fromUser: rompotMessage.user });
      } else {
        this.telegram.emit("user", { action: "remove", event: "remove", user, chat: rompotMessage.chat, fromUser: rompotMessage.user });
      }
    });
  }

  public async update(data: User | Chat) {
    try {
      if (!data) return;

      if (data instanceof User) {
        return await this.telegram.updateUser(data);
      }

      if (data instanceof Chat) {
        return await this.telegram.updateChat(data);
      }
    } catch (error) {
      this.telegram.emit("error", error);
    }
  }

  public async updateChatUsers(action: "add" | "remove", chat: Chat, ...users: User[]) {
    try {
      chat = Chat.fromJSON({
        ...((await this.telegram.getChat(chat)) || {}),
        ...chat,
      });

      
      if (action == "add") {
        let users = chat.users || [];
        
        users = users.filter((user) => !users.includes(user));

        if (users.length == 0) return;

        chat.users = users;

        await this.update(chat);
      } else if (action == "remove") {
        const userIds = users.map((user) => user.id);

        if (userIds.includes(this.telegram.id)) {
          await this.telegram.removeChat(chat);
        } else {
          const users = chat.users || [];

          chat.users = users.filter((userId) => !userIds.includes(userId));

          await this.update(chat);
        }
      }
    } catch (error) {
      this.telegram.emit("error", error);
    }
  }
}
