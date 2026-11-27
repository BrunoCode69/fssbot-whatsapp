import {
  ActionRowBuilder,
  ActivityType,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelType,
  Client as DiscordJSClient,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  MentionableSelectMenuBuilder,
  MessageFlags,
  ModalBuilder,
  Partials,
  PermissionFlagsBits,
  RoleSelectMenuBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
  UserSelectMenuBuilder,
  WebhookClient,
  type Interaction,
  type Message as DiscordJSMessage,
} from 'discord.js';
import BotEvents from '../bot/BotEvents';
import { BotStatus } from '../bot/BotStatus';
import type IBot from '../bot/IBot';
import type IAuth from '../client/IAuth';
import AudioMessage from '../messages/AudioMessage';
import ButtonMessage, { ButtonType } from '../messages/ButtonMessage';
import ContactMessage from '../messages/ContactMessage';
import FileMessage from '../messages/FileMessage';
import ImageMessage from '../messages/ImageMessage';
import ListMessage from '../messages/ListMessage';
import LocationMessage from '../messages/LocationMessage';
import MediaMessage, { type Media } from '../messages/MediaMessage';
import Message, { MessageType } from '../messages/Message';
import PollMessage, { PollAction } from '../messages/PollMessage';
import PollUpdateMessage from '../messages/PollUpdateMessage';
import ReactionMessage from '../messages/ReactionMessage';
import TextMessage from '../messages/TextMessage';
import VideoMessage from '../messages/VideoMessage';
import Call from '../models/Call';
import Chat from '../modules/chat/Chat';
import ChatStatus from '../modules/chat/ChatStatus';
import ChatType from '../modules/chat/ChatType';
import User from '../modules/user/User';
import type UserAction from '../modules/user/UserAction';
import type UserEvent from '../modules/user/UserEvent';
import { resolveDiscordIntents } from './DiscordIntents';

export interface DiscordBotOptions {
  intents?: string[] | number | null;
}

const DISCORD_BUTTON_STYLES: Record<string, ButtonStyle> = {
  primary: ButtonStyle.Primary,
  blurple: ButtonStyle.Primary,
  azul: ButtonStyle.Primary,
  secondary: ButtonStyle.Secondary,
  gray: ButtonStyle.Secondary,
  cinza: ButtonStyle.Secondary,
  success: ButtonStyle.Success,
  green: ButtonStyle.Success,
  verde: ButtonStyle.Success,
  danger: ButtonStyle.Danger,
  red: ButtonStyle.Danger,
  vermelho: ButtonStyle.Danger,
  link: ButtonStyle.Link,
};

const ACTIVITY_TYPES: Record<string, ActivityType> = {
  playing: ActivityType.Playing,
  jogando: ActivityType.Playing,
  streaming: ActivityType.Streaming,
  listening: ActivityType.Listening,
  ouvindo: ActivityType.Listening,
  watching: ActivityType.Watching,
  assistindo: ActivityType.Watching,
  competing: ActivityType.Competing,
  competindo: ActivityType.Competing,
};

export function toDiscordEmbed(spec: any): EmbedBuilder {
  const embed = new EmbedBuilder();
  if (!spec || typeof spec !== 'object') return embed;
  if (spec.title) embed.setTitle(String(spec.title).slice(0, 256));
  if (spec.description) embed.setDescription(String(spec.description).slice(0, 4096));
  if (spec.url) embed.setURL(String(spec.url));
  if (spec.color !== undefined && spec.color !== '') {
    const raw = String(spec.color).trim();
    if (/^#?[0-9a-f]{6}$/i.test(raw)) {
      embed.setColor(Number.parseInt(raw.replace(/^#/, ''), 16));
    } else if (!Number.isNaN(Number(raw))) {
      embed.setColor(Number(raw));
    }
  }
  if (spec.thumbnail) embed.setThumbnail(String(spec.thumbnail));
  if (spec.image) embed.setImage(String(spec.image));
  if (spec.author) {
    if (typeof spec.author === 'string') {
      embed.setAuthor({ name: spec.author.slice(0, 256) });
    } else if (spec.author?.name) {
      embed.setAuthor({
        name: String(spec.author.name).slice(0, 256),
        ...(spec.author.iconUrl ? { iconURL: String(spec.author.iconUrl) } : {}),
        ...(spec.author.url ? { url: String(spec.author.url) } : {}),
      });
    }
  }
  if (Array.isArray(spec.fields) && spec.fields.length > 0) {
    embed.addFields(
      spec.fields.slice(0, 25).map((f: any) => ({
        name: String(f?.name || '\u200b').slice(0, 256),
        value: String(f?.value || '\u200b').slice(0, 1024),
        inline: Boolean(f?.inline),
      })),
    );
  }
  if (spec.footer) {
    if (typeof spec.footer === 'string') {
      embed.setFooter({ text: spec.footer.slice(0, 2048) });
    } else if (spec.footer?.text) {
      embed.setFooter({
        text: String(spec.footer.text).slice(0, 2048),
        ...(spec.footer.iconUrl ? { iconURL: String(spec.footer.iconUrl) } : {}),
      });
    }
  }
  if (spec.timestamp === true) embed.setTimestamp();
  else if (spec.timestamp) embed.setTimestamp(new Date(spec.timestamp));
  return embed;
}

export function buildDiscordPayload(message: Message): Record<string, any> {
  const payload: Record<string, any> = {};
  const embeds: EmbedBuilder[] = [];
  const components: any[] = [];
  const files: AttachmentBuilder[] = [];

  if (Array.isArray(message.extra?.discordEmbeds)) {
    for (const spec of message.extra.discordEmbeds.slice(0, 10)) {
      embeds.push(toDiscordEmbed(spec));
    }
  } else if (message.extra?.discordEmbed) {
    embeds.push(toDiscordEmbed(message.extra.discordEmbed));
  }

  if (message instanceof LocationMessage || message.type === MessageType.Location) {
    const loc = message as LocationMessage;
    const mapsUrl = `https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`;
    embeds.push(
      new EmbedBuilder()
        .setTitle(loc.name || 'Localização')
        .setDescription(loc.address || `Coordenadas: ${loc.latitude}, ${loc.longitude}`)
        .setURL(loc.url || mapsUrl)
        .setColor(0x5865f2),
    );
  } else if (message instanceof ContactMessage || message.type === MessageType.Contact) {
    const contactMsg = message as ContactMessage;
    const listText = (contactMsg.contacts || [])
      .map((c: any) => `• **${c.name || 'Contato'}**: ${c.phone || ''}`)
      .join('\n');
    embeds.push(new EmbedBuilder().setTitle('Contatos').setDescription(listText || 'Sem contatos').setColor(0x57f287));
  } else if (message instanceof PollMessage || message.type === MessageType.Poll) {
    const poll = message as PollMessage;
    payload.poll = {
      question: { text: (poll.text || 'Enquete').slice(0, 300) },
      answers: (poll.options || []).slice(0, 10).map((o) => ({ text: String(o.name || o.id).slice(0, 55) })),
      allowMultiselect: Number((poll as any).selectableCount ?? 1) > 1,
      duration: 24,
    };
  }

  if (message instanceof ButtonMessage || message.type === MessageType.Button) {
    const btnMsg = message as ButtonMessage;
    const buttons = (btnMsg.buttons || []).slice(0, 25);
    for (let i = 0; i < buttons.length; i += 5) {
      const row = new ActionRowBuilder<ButtonBuilder>();
      for (const btn of buttons.slice(i, i + 5)) {
        const builder = new ButtonBuilder().setLabel(String(btn.text || 'Botão').slice(0, 80));
        if (btn.emoji) {
          try { builder.setEmoji(btn.emoji); } catch {}
        }
        if (btn.type === ButtonType.Url) {
          builder.setStyle(ButtonStyle.Link).setURL(String(btn.content || 'https://discord.com'));
        } else {
          const styleKey = String(btn.style || 'primary').toLowerCase();
          builder
            .setStyle(DISCORD_BUTTON_STYLES[styleKey] ?? ButtonStyle.Primary)
            .setCustomId(String(btn.content || btn.text || `btn_${i}`).slice(0, 100));
        }
        row.addComponents(builder);
      }
      if (row.components.length > 0) components.push(row);
    }
  }

  if (message instanceof ListMessage || message.type === MessageType.List) {
    const listMsg = message as ListMessage;
    const selectType = String(listMsg.selectType || 'string').toLowerCase();
    const customId = String(message.extra?.customId || listMsg.id || `select_${Date.now()}`).slice(0, 100);
    const placeholder = String(listMsg.button || listMsg.title || 'Escolha uma opção').slice(0, 150);
    const minValues = Math.max(0, Math.min(25, Number(listMsg.minValues ?? 1)));
    const maxValues = Math.max(minValues || 1, Math.min(25, Number(listMsg.maxValues ?? 1)));

    const row = new ActionRowBuilder<any>();
    if (selectType === 'user') {
      row.addComponents(new UserSelectMenuBuilder().setCustomId(customId).setPlaceholder(placeholder).setMinValues(minValues).setMaxValues(maxValues));
    } else if (selectType === 'role') {
      row.addComponents(new RoleSelectMenuBuilder().setCustomId(customId).setPlaceholder(placeholder).setMinValues(minValues).setMaxValues(maxValues));
    } else if (selectType === 'channel') {
      row.addComponents(new ChannelSelectMenuBuilder().setCustomId(customId).setPlaceholder(placeholder).setMinValues(minValues).setMaxValues(maxValues));
    } else if (selectType === 'mentionable') {
      row.addComponents(new MentionableSelectMenuBuilder().setCustomId(customId).setPlaceholder(placeholder).setMinValues(minValues).setMaxValues(maxValues));
    } else {
      const options = (listMsg.list || []).flatMap((sec) =>
        (sec.items || []).map((item) => ({
          label: String(item.title || item.id).slice(0, 100),
          value: String(item.id || item.title).slice(0, 100),
          ...(item.description ? { description: String(item.description).slice(0, 100) } : {}),
          ...(item.emoji ? { emoji: String(item.emoji) } : {}),
        })),
      ).slice(0, 25);
      if (options.length > 0) {
        row.addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(customId)
            .setPlaceholder(placeholder)
            .setMinValues(minValues)
            .setMaxValues(Math.min(maxValues, options.length))
            .addOptions(options),
        );
      }
    }
    if (row.components.length > 0) components.push(row);
  }

  const rawText = typeof message.text === 'string' ? message.text : '';
  if (rawText && !(message instanceof PollMessage || message.type === MessageType.Poll)) {
    payload.content = rawText.slice(0, 2000);
  } else if (embeds.length === 0 && components.length === 0 && files.length === 0 && !payload.poll) {
    payload.content = rawText || '\u200b';
  }

  if (embeds.length > 0) payload.embeds = embeds;
  if (components.length > 0) payload.components = components;
  if (files.length > 0) payload.files = files;
  return payload;
}

export default class DiscordBot extends BotEvents implements IBot {
  public readonly platform = 'discord' as const;
  public auth: IAuth | string = '';
  public discord: DiscordJSClient;
  public options: DiscordBotOptions;

  public id: string = '';
  public status: BotStatus = BotStatus.Offline;
  public phoneNumber: string = '';
  public name: string = '';
  public profileUrl: string = '';

  private interactions = new Map<string, { interaction: any; createdAt: number }>();
  private answeredInteractions = new Set<string>();
  private clientDestroyed = false;

  constructor(options: DiscordBotOptions = {}) {
    super();
    this.options = options;
    this.discord = this.createClient(options.intents);
  }

  private createClient(intentsInput?: string[] | number | null): DiscordJSClient {
    const intents = resolveDiscordIntents(intentsInput ?? this.options.intents);
    const client = new DiscordJSClient({
      intents,
      partials: [Partials.Channel, Partials.Message, Partials.Reaction, Partials.GuildMember, Partials.User],
    });
    this.clientDestroyed = false;
    this.attachEvents(client);
    return client;
  }

  private buildGuildMeta(guild: any, channel?: any) {
    return {
      guildId: guild?.id ? String(guild.id) : '',
      guildName: String(guild?.name || ''),
      guildIcon: typeof guild?.iconURL === 'function' ? guild.iconURL() || '' : '',
      guildMemberCount: Number(guild?.memberCount ?? 0),
      guildOwnerId: String(guild?.ownerId || ''),
      channelId: channel?.id ? String(channel.id) : '',
      channelName: String(channel?.name || ''),
    };
  }

  private storeInteraction(interaction: any): string {
    const id = String(interaction?.id || '');
    if (!id) return '';
    const now = Date.now();
    this.interactions.set(id, { interaction, createdAt: now });
    if (this.interactions.size > 500) {
      for (const [k, v] of this.interactions.entries()) {
        if (now - v.createdAt > 15 * 60_000 || this.interactions.size > 500) {
          this.interactions.delete(k);
        }
      }
    }
    return id;
  }

  private toRompotChat(channel: any, guild?: any): Chat {
    const channelId = String(channel?.id || '');
    const isDM = channel?.isDMBased?.() || channel?.type === ChannelType.DM;
    const chat = new Chat(channelId, isDM ? ChatType.PV : ChatType.Group);
    chat.name = String(channel?.name || guild?.name || '');
    chat.description = String(channel?.topic || '');
    return chat;
  }

  private toRompotUser(author: any, member?: any): User {
    const id = String(author?.id || member?.id || '');
    const displayName = String(member?.displayName || author?.globalName || author?.username || id);
    const avatarUrl = typeof author?.displayAvatarURL === 'function' ? author.displayAvatarURL() : '';
    const user = new User(id, displayName);
    user.nickname = String(author?.username || '');
    user.profileUrl = avatarUrl || '';
    return user;
  }

  private attachEvents(client: DiscordJSClient): void {
    client.on(Events.ClientReady, (readyClient) => {
      this.id = String(readyClient.user?.id || '');
      this.name = String(readyClient.user?.username || '');
      this.profileUrl = readyClient.user?.displayAvatarURL() || '';
      this.status = BotStatus.Online;
      this.emit('open', { isNewLogin: false });
    });

    client.on(Events.MessageCreate, async (dMsg) => {
      if (dMsg.author?.bot) return;
      const converted = await this.convertIncomingMessage(dMsg);
      this.emit('message', converted);
    });

    client.on(Events.MessageUpdate, async (_oldMsg, newMsg) => {
      if (newMsg.partial) {
        try { newMsg = await newMsg.fetch(); } catch { return; }
      }
      if (newMsg.author?.bot) return;
      const converted = await this.convertIncomingMessage(newMsg as DiscordJSMessage);
      converted.isEdited = true;
      this.emit('message', converted);
    });

    client.on(Events.MessageDelete, (dMsg) => {
      const chat = this.toRompotChat(dMsg.channel, dMsg.guild);
      const user = dMsg.author ? this.toRompotUser(dMsg.author, dMsg.member) : new User('');
      const meta = this.buildGuildMeta(dMsg.guild, dMsg.channel);
      this.emit('discord-message-delete', {
        ...meta,
        messageId: String(dMsg.id || ''),
        channelId: String(dMsg.channelId || meta.channelId),
        guildId: dMsg.guildId ? String(dMsg.guildId) : meta.guildId || undefined,
        text: String(dMsg.content || ''),
        chat,
        user,
      });
    });

    const handleReaction = async (reaction: any, dUser: any, isAdd: boolean) => {
      if (dUser?.bot) return;
      if (reaction.partial) {
        try { reaction = await reaction.fetch(); } catch {}
      }
      const channel = reaction.message?.channel;
      const guild = reaction.message?.guild;
      const chat = this.toRompotChat(channel, guild);
      const user = this.toRompotUser(dUser);
      const emoji = String(reaction.emoji?.name || reaction.emoji?.id || '');
      this.emit('message-reaction', {
        ...this.buildGuildMeta(guild, channel),
        chat,
        user,
        messageId: String(reaction.message?.id || ''),
        emoji: isAdd ? emoji : '',
        added: isAdd && emoji ? [emoji] : [],
        removed: !isAdd && emoji ? [emoji] : [],
      });
    };

    client.on(Events.MessageReactionAdd, (reaction, dUser) => {
      void handleReaction(reaction, dUser, true);
    });
    client.on(Events.MessageReactionRemove, (reaction, dUser) => {
      void handleReaction(reaction, dUser, false);
    });

    const handlePollVote = async (pollAnswer: any, userId: string, isAdd: boolean) => {
      if (String(userId) === this.id) return;
      const message = pollAnswer?.poll?.message;
      const channel = message?.channel;
      const guild = message?.guild;
      const chat = this.toRompotChat(channel || { id: message?.channelId || '', type: guild ? ChannelType.GuildText : ChannelType.DM }, guild);
      const dUser = await this.discord.users.fetch(String(userId)).catch(() => ({ id: String(userId) }));
      if ((dUser as any)?.bot) return;
      const user = this.toRompotUser(dUser);
      const answerId = String(pollAnswer?.id ?? '');
      const answerText = String(pollAnswer?.text || answerId);
      const msgId = String(message?.id || '');
      const pollUpdate = PollUpdateMessage.fromJSON({
        type: MessageType.PollUpdate,
        id: msgId,
        chat,
        user,
        selected: answerText || answerId,
        text: answerText,
        action: isAdd ? PollAction.Add : PollAction.Remove,
        extra: {
          ...this.buildGuildMeta(guild, channel),
          pollCreationMessageId: msgId,
          pollId: msgId,
          answerId,
        },
      });
      this.emit('message', pollUpdate);
    };
    if ((Events as any).MessagePollVoteAdd) {
      client.on((Events as any).MessagePollVoteAdd, (pollAnswer: any, userId: string) => {
        void handlePollVote(pollAnswer, userId, true);
      });
    }
    if ((Events as any).MessagePollVoteRemove) {
      client.on((Events as any).MessagePollVoteRemove, (pollAnswer: any, userId: string) => {
        void handlePollVote(pollAnswer, userId, false);
      });
    }

    client.on(Events.GuildMemberAdd, (member) => {
      const chat = new Chat(String(member.guild?.id || ''), ChatType.Group);
      chat.name = member.guild?.name || '';
      const user = this.toRompotUser(member.user, member);
      const meta = this.buildGuildMeta(member.guild);
      this.emit('user', {
        ...meta,
        action: 'join' as UserAction,
        event: 'add' as UserEvent,
        chat,
        user,
        fromUser: user,
      } as any);
      this.emit('user', {
        ...meta,
        action: 'add' as UserAction,
        event: 'add' as UserEvent,
        chat,
        user,
        fromUser: user,
      } as any);
    });

    client.on(Events.GuildMemberRemove, (member) => {
      const chat = new Chat(String(member.guild?.id || ''), ChatType.Group);
      chat.name = member.guild?.name || '';
      const user = this.toRompotUser(member.user, member);
      const meta = this.buildGuildMeta(member.guild);
      this.emit('user', {
        ...meta,
        action: 'leave' as UserAction,
        event: 'remove' as UserEvent,
        chat,
        user,
        fromUser: user,
      } as any);
      this.emit('user', {
        ...meta,
        action: 'remove' as UserAction,
        event: 'remove' as UserEvent,
        chat,
        user,
        fromUser: user,
      } as any);
    });

    client.on(Events.VoiceStateUpdate, (oldState, newState) => {
      const oldChannelId = oldState.channelId ? String(oldState.channelId) : undefined;
      const newChannelId = newState.channelId ? String(newState.channelId) : '';
      const action: 'join' | 'leave' | 'switch' | 'update' = !oldChannelId && newChannelId
        ? 'join'
        : oldChannelId && !newChannelId
          ? 'leave'
          : oldChannelId && newChannelId && oldChannelId !== newChannelId
            ? 'switch'
            : 'update';
      const channel = newState.channel || oldState.channel;
      const guild = newState.guild || oldState.guild;
      const user = this.toRompotUser(newState.member?.user || { id: newState.id }, newState.member);
      const chat = new Chat(newChannelId || oldChannelId || String(guild?.id || ''), ChatType.Group);
      chat.name = channel?.name || guild?.name || '';
      this.emit('discord-voice', {
        ...this.buildGuildMeta(guild, channel),
        action,
        guildId: String(guild?.id || ''),
        channelId: newChannelId,
        oldChannelId,
        selfMute: Boolean(newState.selfMute),
        selfDeaf: Boolean(newState.selfDeaf),
        serverMute: Boolean(newState.serverMute),
        serverDeaf: Boolean(newState.serverDeaf),
        chat,
        user,
      });
    });

    const emitRole = (role: any, action: 'create' | 'update' | 'delete') => {
      const chat = new Chat(String(role.guild?.id || ''), ChatType.Group);
      chat.name = role.guild?.name || '';
      const roleId = String(role.id || '');
      const roleName = String(role.name || '');
      const color = String(role.hexColor || '');
      this.emit('discord-role-update', {
        ...this.buildGuildMeta(role.guild),
        action,
        guildId: String(role.guild?.id || ''),
        roleId,
        roleName,
        color,
        role: { id: roleId, name: roleName, color },
        chat,
      });
    };
    client.on(Events.GuildRoleCreate, (r) => emitRole(r, 'create'));
    client.on(Events.GuildRoleUpdate, (_o, n) => emitRole(n, 'update'));
    client.on(Events.GuildRoleDelete, (r) => emitRole(r, 'delete'));

    client.on(Events.InteractionCreate, async (interaction) => {
      await this.handleInteraction(interaction);
    });

    client.on(Events.ShardDisconnect, (closeEvent) => {
      this.status = BotStatus.Offline;
      this.emit('close', { reason: closeEvent?.code ?? 'disconnect' });
    });

    client.on(Events.ShardReconnecting, () => {
      this.emit('reconnecting', {});
    });

    client.on(Events.ShardResume, () => {
      this.status = BotStatus.Online;
      this.emit('open', { isNewLogin: false });
    });

    client.on(Events.Invalidated, () => {
      this.status = BotStatus.Offline;
      this.clientDestroyed = true;
      this.emit('stop', { isLogout: true, reason: 'invalidated' });
    });

    client.on(Events.Error, (err) => {
      this.emit('error', err instanceof Error ? err : new Error(String(err)));
    });
  }

  private async handleInteraction(interaction: Interaction): Promise<void> {
    const interactionId = this.storeInteraction(interaction);
    const channel: any = interaction.channel || { id: interaction.channelId, type: interaction.guildId ? ChannelType.GuildText : ChannelType.DM };
    const chat = this.toRompotChat(channel, interaction.guild);
    const user = this.toRompotUser(interaction.user, interaction.member);
    const guildMeta = {
      ...this.buildGuildMeta(interaction.guild, channel),
      channelId: String(interaction.channelId || ''),
      userTag: String(interaction.user?.tag || interaction.user?.username || ''),
      interactionId,
    };

    if (interaction.isChatInputCommand()) {
      const optionsMap: Record<string, any> = {};
      const argParts: string[] = [];
      for (const opt of interaction.options.data) {
        if (opt.type === 1 || opt.type === 2) {
          for (const subOpt of opt.options || []) {
            optionsMap[subOpt.name] = subOpt.value ?? '';
            if (subOpt.value !== undefined) argParts.push(String(subOpt.value));
          }
        } else {
          optionsMap[opt.name] = opt.value ?? '';
          if (opt.value !== undefined) argParts.push(String(opt.value));
        }
      }
      const subcommand = interaction.options.getSubcommand(false) || undefined;
      const commandText = `/${interaction.commandName}${argParts.length ? ` ${argParts.join(' ')}` : ''}`;

      this.scheduleAutoDefer(interactionId, interaction, 'reply');
      this.emit('discord-interaction', {
        interactionId,
        kind: 'slash',
        commandName: interaction.commandName,
        subcommand,
        options: optionsMap,
        ...guildMeta,
        chat,
        user,
        raw: interaction,
      });

      const msg = new TextMessage(chat, commandText, {
        id: interactionId,
        user,
        fromMe: false,
        timestamp: Math.floor(interaction.createdTimestamp / 1000),
        extra: {
          ...guildMeta,
          isSlashCommand: true,
          commandName: interaction.commandName,
          subcommand,
          slashOptions: optionsMap,
        },
      });
      this.emit('message', msg);
      return;
    }

    if (interaction.isButton()) {
      const customId = String(interaction.customId || '');
      const bMsg = new ButtonMessage(chat, String(interaction.message?.content || ''), [], {
        id: String(interaction.message?.id || interactionId),
        user,
        selected: customId,
        extra: {
          ...guildMeta,
          customId,
          messageId: String(interaction.message?.id || ''),
        },
      });
      this.scheduleAutoDefer(interactionId, interaction, 'update');
      this.emit('discord-interaction', {
        interactionId,
        kind: 'button',
        customId,
        ...guildMeta,
        chat,
        user,
        raw: interaction,
      });
      this.emit('message', bMsg);
      return;
    }

    if (interaction.isAnySelectMenu()) {
      const customId = String(interaction.customId || '');
      const values = Array.isArray(interaction.values) ? interaction.values.map(String) : [];
      const firstValue = values[0] || '';
      const lMsg = new ListMessage(chat, String(interaction.message?.content || ''), [], {
        id: String(interaction.message?.id || interactionId),
        user,
        selected: firstValue,
        extra: {
          ...guildMeta,
          customId,
          values,
          listMessageId: String(interaction.message?.id || ''),
        },
      });
      this.scheduleAutoDefer(interactionId, interaction, 'update');
      this.emit('discord-interaction', {
        interactionId,
        kind: 'select',
        customId,
        values,
        ...guildMeta,
        chat,
        user,
        raw: interaction,
      });
      this.emit('message', lMsg);
      return;
    }

    if (interaction.isModalSubmit()) {
      const fields: Record<string, string> = {};
      for (const [key, comp] of interaction.fields.fields.entries()) {
        if ('value' in comp) fields[key] = String((comp as any).value ?? '');
      }
      this.scheduleAutoDefer(interactionId, interaction, 'modal');
      this.emit('discord-modal', {
        interactionId,
        modalId: String(interaction.customId || ''),
        fields,
        ...guildMeta,
        chat,
        user,
        raw: interaction,
      });
    }
  }

  private scheduleAutoDefer(interactionId: string, interaction: any, mode: 'reply' | 'update' | 'modal' = 'update'): void {
    const timer = setTimeout(() => {
      if (this.answeredInteractions.has(interactionId)) return;
      if (!interaction || interaction.replied || interaction.deferred) return;
      if (mode === 'reply') {
        if (typeof interaction.deferReply === 'function') {
          void interaction.deferReply().catch(() => {});
        }
      } else if (mode === 'modal') {
        if (interaction.isFromMessage?.() && typeof interaction.deferUpdate === 'function') {
          void interaction.deferUpdate().catch(() => {});
        } else if (typeof interaction.deferReply === 'function') {
          void interaction.deferReply().catch(() => {});
        }
      } else if (typeof interaction.deferUpdate === 'function') {
        void interaction.deferUpdate().catch(() => {});
      }
    }, 1800);
    (timer as any).unref?.();
  }

  private async convertIncomingMessage(dMsg: DiscordJSMessage, depth: number = 0): Promise<Message> {
    const chat = this.toRompotChat(dMsg.channel, dMsg.guild);
    const user = this.toRompotUser(dMsg.author, dMsg.member);
    const mentions = Array.from(dMsg.mentions.users.keys()).map(String);
    const baseExtra = {
      ...this.buildGuildMeta(dMsg.guild, dMsg.channel),
      channelId: String(dMsg.channelId || ''),
      userTag: String(dMsg.author?.tag || dMsg.author?.username || ''),
      threadId: dMsg.channel?.isThread?.() ? String(dMsg.channelId) : '',
    };

    const firstAtt = dMsg.attachments.first();
    let rompotMsg: Message;
    if (firstAtt) {
      const mime = String(firstAtt.contentType || 'application/octet-stream');
      const common = {
        id: String(dMsg.id),
        user,
        mentions,
        timestamp: Math.floor(dMsg.createdTimestamp / 1000),
        file: firstAtt.url,
        name: firstAtt.name || 'file',
        mimetype: mime,
        size: firstAtt.size || 0,
        extra: { ...baseExtra, url: firstAtt.url },
      };
      if (mime.startsWith('image/')) {
        rompotMsg = new ImageMessage(chat, String(dMsg.content || ''), firstAtt.url, common as any);
      } else if (mime.startsWith('video/')) {
        rompotMsg = new VideoMessage(chat, String(dMsg.content || ''), firstAtt.url, common as any);
      } else if (mime.startsWith('audio/')) {
        rompotMsg = new AudioMessage(chat, firstAtt.url, common as any);
      } else {
        rompotMsg = new FileMessage(chat, String(dMsg.content || ''), firstAtt.url, { ...common, name: firstAtt.name || 'file' } as any);
      }
    } else {
      rompotMsg = new TextMessage(chat, String(dMsg.content || ''), {
        id: String(dMsg.id),
        user,
        mentions,
        timestamp: Math.floor(dMsg.createdTimestamp / 1000),
        extra: baseExtra,
      });
    }

    if (depth < 1 && dMsg.reference?.messageId) {
      try {
        const refMsg = await dMsg.fetchReference();
        rompotMsg.mention = await this.convertIncomingMessage(refMsg, depth + 1);
      } catch {}
    }
    return rompotMsg;
  }

  public async connect(auth: IAuth | string): Promise<void> {
    this.status = BotStatus.Offline;
    this.emit('connecting', {});
    this.auth = auth;
    const token = typeof auth === 'string' ? auth : await auth.get('BOT_TOKEN');
    if (!token) throw new Error('Token do Discord não informado.');
    if (this.clientDestroyed) {
      this.discord = this.createClient(this.options.intents);
    }
    try {
      await this.discord.login(String(token).trim());
    } catch (err) {
      this.clientDestroyed = true;
      try { await this.discord.destroy(); } catch {}
      throw err;
    }
  }

  public async reconnect(_alert?: boolean): Promise<void> {
    this.status = BotStatus.Offline;
    this.emit('reconnecting', {});
    this.clientDestroyed = true;
    try { await this.discord.destroy(); } catch {}
    this.discord = this.createClient(this.options.intents);
    await this.connect(this.auth);
  }

  public async stop(_reason?: any): Promise<void> {
    this.status = BotStatus.Offline;
    this.clientDestroyed = true;
    try { await this.discord.destroy(); } catch {}
    this.emit('stop', { isLogout: false });
  }

  public async logout(): Promise<void> {
    this.status = BotStatus.Offline;
    this.clientDestroyed = true;
    try { await this.discord.destroy(); } catch {}
    this.emit('stop', { isLogout: true });
  }

  public async send(message: Message): Promise<Message> {
    const payload = await this.preparePayloadWithMedia(message);
    const interactionId = String(message.extra?.interactionId || message.mention?.extra?.interactionId || '');
    const stored = interactionId ? this.interactions.get(interactionId)?.interaction : undefined;

    if (stored && (message.extra?.replyAsInteraction || message.mention?.extra?.isSlashCommand)) {
      this.answeredInteractions.add(interactionId);
      if (message.extra?.ephemeral) {
        payload.flags = MessageFlags.Ephemeral;
      }
      try {
        let sent: any;
        if (stored.replied || stored.deferred) {
          sent = await stored.followUp({ ...payload, withResponse: true }).catch(() => stored.editReply(payload));
        } else {
          const res = await stored.reply({ ...payload, withResponse: true });
          sent = res?.resource?.message ?? await stored.fetchReply().catch(() => null);
        }
        const msgId = String(sent?.id || interactionId);
        return new Message(message.chat, payload.content || message.text || '', {
          id: msgId,
          fromMe: true,
          extra: { ...message.extra, channelId: String(message.chat?.id || ''), interactionId },
        });
      } catch {
        // Se a interação já expirou no Discord, faz fallback para envio normal no canal.
      }
    }

    const channel = await this.fetchSendableChannel(String(message.chat?.id || ''));
    const sent = await channel.send(payload);
    return new Message(message.chat, String(sent.content || message.text || ''), {
      id: String(sent.id),
      fromMe: true,
      extra: { ...message.extra, channelId: String(sent.channelId || message.chat?.id || '') },
    });
  }

  private async preparePayloadWithMedia(message: Message): Promise<Record<string, any>> {
    const payload = buildDiscordPayload(message);
    if (
      message instanceof ImageMessage
      || message instanceof VideoMessage
      || message instanceof AudioMessage
      || message instanceof FileMessage
      || message.type === MessageType.Image
      || message.type === MessageType.Video
      || message.type === MessageType.Audio
      || message.type === MessageType.File
    ) {
      const mediaMsg = message as MediaMessage;
      const source = typeof mediaMsg.getStream === 'function'
        ? await mediaMsg.getStream().catch(() => mediaMsg.file || message.extra?.url)
        : (mediaMsg.file || message.extra?.url);
      if (source) {
        const fileName = (mediaMsg as any).name || (message.type === MessageType.Image ? 'image.png' : message.type === MessageType.Video ? 'video.mp4' : message.type === MessageType.Audio ? 'audio.mp3' : 'file.bin');
        payload.files = [...(payload.files || []), new AttachmentBuilder(source, { name: String(fileName) })];
      }
      if ((mediaMsg as any).caption && !payload.content) {
        payload.content = String((mediaMsg as any).caption).slice(0, 2000);
      }
    }
    return payload;
  }

  private async fetchSendableChannel(targetId: string): Promise<any> {
    if (!targetId) throw new Error('ID do canal ou usuário Discord não informado.');
    const ch = await this.discord.channels.fetch(targetId).catch(() => null);
    if (ch && typeof (ch as any).send === 'function') return ch;
    const dUser = await this.discord.users.fetch(targetId).catch(() => null);
    if (dUser) return await dUser.createDM();
    throw new Error(`Canal ou usuário Discord não encontrado: ${targetId}`);
  }

  public async editMessage(message: Message): Promise<void> {
    const payload = await this.preparePayloadWithMedia(message);
    if (!payload.embeds) payload.embeds = [];
    if (!payload.components) payload.components = [];
    if (payload.content === undefined) {
      payload.content = typeof message.text === 'string' ? message.text.slice(0, 2000) : '';
    }

    const interactionId = String(message.extra?.interactionId || '');
    const storedInteraction = interactionId ? this.interactions.get(interactionId)?.interaction : undefined;
    if (storedInteraction && (message.extra?.ephemeral || String(message.id || '') === interactionId)) {
      await storedInteraction.editReply(payload);
      return;
    }

    const channel = await this.fetchSendableChannel(String(message.chat?.id || ''));
    const dMsg = await channel.messages?.fetch?.(String(message.id || '')).catch(() => null);
    if (dMsg) {
      await dMsg.edit(payload);
      return;
    }
    if (storedInteraction && typeof storedInteraction.editReply === 'function') {
      await storedInteraction.editReply(payload);
      return;
    }
    throw new Error('Mensagem Discord não encontrada para edição.');
  }

  public async deleteMessage(message: Message): Promise<void> {
    const channel = await this.fetchSendableChannel(String(message.chat?.id || ''));
    const dMsg = await channel.messages?.fetch?.(String(message.id || ''));
    if (dMsg) await dMsg.delete();
  }

  public async removeMessage(message: Message): Promise<void> {
    await this.deleteMessage(message);
  }

  public async addReaction(message: ReactionMessage): Promise<void> {
    const channel = await this.fetchSendableChannel(String(message.chat?.id || ''));
    const targetId = String(message.extra?.targetId || (message as any).message?.id || message.id || '');
    const dMsg = await channel.messages?.fetch?.(targetId);
    if (dMsg && message.text) await dMsg.react(message.text);
  }

  public async removeReaction(message: ReactionMessage): Promise<void> {
    const channel = await this.fetchSendableChannel(String(message.chat?.id || ''));
    const targetId = String(message.extra?.targetId || (message as any).message?.id || message.id || '');
    const dMsg = await channel.messages?.fetch?.(targetId);
    if (!dMsg) return;
    if (message.text) {
      const r = dMsg.reactions.resolve(message.text);
      await r?.users.remove(this.id).catch(() => {});
    } else {
      await dMsg.reactions.removeAll().catch(() => {});
    }
  }

  public async pinMessage(message: Message): Promise<void> {
    const channel = await this.fetchSendableChannel(String(message.chat?.id || ''));
    const dMsg = await channel.messages?.fetch?.(String(message.id || ''));
    if (dMsg) await dMsg.pin();
  }

  public async unpinMessage(message: Message): Promise<void> {
    const channel = await this.fetchSendableChannel(String(message.chat?.id || ''));
    const dMsg = await channel.messages?.fetch?.(String(message.id || ''));
    if (dMsg) await dMsg.unpin();
  }

  public async readMessage(_message: Message): Promise<void> {}

  public async downloadStreamMessage(media: Media): Promise<Buffer> {
    const url = String((media as any)?.extra?.url || (media as any)?.file || '');
    if (!url.startsWith('http')) return Buffer.alloc(0);
    const res = await fetch(url);
    return Buffer.from(await res.arrayBuffer());
  }

  public async getBotName(): Promise<string> {
    return this.discord.user?.username || this.name || '';
  }

  public async setBotName(name: string): Promise<void> {
    await this.discord.user?.setUsername(String(name).slice(0, 32));
    this.name = name;
  }

  public async getBotDescription(): Promise<string> {
    return '';
  }

  public async setBotDescription(_description: string): Promise<void> {}

  public async getBotProfile(): Promise<Buffer> {
    const url = await this.getBotProfileUrl();
    if (!url) return Buffer.alloc(0);
    const res = await fetch(url);
    return Buffer.from(await res.arrayBuffer());
  }

  public async getBotProfileUrl(): Promise<string> {
    return this.discord.user?.displayAvatarURL({ size: 512 }) || this.profileUrl || '';
  }

  public async setBotProfile(image: Buffer): Promise<void> {
    await this.discord.user?.setAvatar(image);
  }

  public async setBotActivity(text: string, type: string = 'playing', status: 'online' | 'idle' | 'dnd' | 'invisible' = 'online'): Promise<void> {
    const actType = ACTIVITY_TYPES[String(type || 'playing').toLowerCase()] ?? ActivityType.Playing;
    this.discord.user?.setPresence({
      status,
      activities: text ? [{ name: String(text).slice(0, 128), type: actType }] : [],
    });
  }

  public async getChat(chat: Chat): Promise<Chat | null> {
    const ch: any = await this.discord.channels.fetch(String(chat.id)).catch(() => null);
    if (!ch) return null;
    return this.toRompotChat(ch, ch.guild);
  }

  public async updateChat(_chat: { id: string } & Partial<Chat>): Promise<void> {}
  public async removeChat(chat: Chat): Promise<void> { await this.deleteGuildChannel(String(chat.id)); }
  public async addUserInChat(_chat: Chat, _user: User): Promise<void> {}
  public async removeUserInChat(chat: Chat, user: User): Promise<void> { await this.kickMember(String(chat.id), String(user.id)); }
  public async promoteUserInChat(_chat: Chat, _user: User): Promise<void> {}
  public async demoteUserInChat(_chat: Chat, _user: User): Promise<void> {}

  public async changeChatStatus(chat: Chat, status: ChatStatus): Promise<void> {
    if (status === ChatStatus.Typing) {
      const ch = await this.fetchSendableChannel(String(chat.id)).catch(() => null);
      await ch?.sendTyping?.();
    }
  }

  public async createChat(_chat: Chat): Promise<void> {}
  public async leaveChat(chat: Chat): Promise<void> {
    const guild = await this.discord.guilds.fetch(String(chat.id)).catch(() => null);
    await guild?.leave();
  }

  public async getChatName(chat: Chat): Promise<string> {
    const ch: any = await this.discord.channels.fetch(String(chat.id)).catch(() => null);
    return String(ch?.name || ch?.guild?.name || '');
  }

  public async setChatName(chat: Chat, name: string): Promise<void> {
    const ch: any = await this.discord.channels.fetch(String(chat.id)).catch(() => null);
    if (ch?.setName) await ch.setName(String(name).slice(0, 100));
  }

  public async getChatDescription(chat: Chat): Promise<string> {
    const ch: any = await this.discord.channels.fetch(String(chat.id)).catch(() => null);
    return String(ch?.topic || '');
  }

  public async setChatDescription(chat: Chat, description: string): Promise<void> {
    await this.setChannelTopic(String(chat.id), description);
  }

  public async getChatProfile(chat: Chat): Promise<Buffer> {
    const url = await this.getChatProfileUrl(chat);
    if (!url) return Buffer.alloc(0);
    const res = await fetch(url);
    return Buffer.from(await res.arrayBuffer());
  }

  public async getChatProfileUrl(chat: Chat): Promise<string> {
    const ch: any = await this.discord.channels.fetch(String(chat.id)).catch(() => null);
    if (ch?.guild?.iconURL) return ch.guild.iconURL({ size: 512 }) || '';
    const guild = await this.discord.guilds.fetch(String(chat.id)).catch(() => null);
    return guild?.iconURL({ size: 512 }) || '';
  }

  public async setChatProfile(_chat: Chat, _profile: Buffer): Promise<void> {}

  public async getChatUsers(chat: Chat): Promise<string[]> {
    const ch: any = await this.discord.channels.fetch(String(chat.id)).catch(() => null);
    const guild = ch?.guild || await this.discord.guilds.fetch(String(chat.id)).catch(() => null);
    if (!guild) return [];
    const members = await guild.members.fetch().catch(() => guild.members.cache);
    return Array.from(members.keys()).map(String);
  }

  public async getChatAdmins(chat: Chat): Promise<string[]> {
    const ch: any = await this.discord.channels.fetch(String(chat.id)).catch(() => null);
    const guild = ch?.guild || await this.discord.guilds.fetch(String(chat.id)).catch(() => null);
    if (!guild) return [];
    const members = await guild.members.fetch().catch(() => guild.members.cache);
    return Array.from(members.values())
      .filter((m: any) => m.permissions?.has(PermissionFlagsBits.Administrator))
      .map((m: any) => String(m.id));
  }

  public async getChatLeader(chat: Chat): Promise<string> {
    const ch: any = await this.discord.channels.fetch(String(chat.id)).catch(() => null);
    const guild = ch?.guild || await this.discord.guilds.fetch(String(chat.id)).catch(() => null);
    return String(guild?.ownerId || '');
  }

  public async getChats(): Promise<string[]> {
    return Array.from(this.discord.channels.cache.keys()).map(String);
  }
  public async setChats(_chats: Chat[]): Promise<void> {}
  public async joinChat(_code: string): Promise<void> {}

  public async getChatInvite(chat: Chat): Promise<string> {
    const ch: any = await this.discord.channels.fetch(String(chat.id)).catch(() => null);
    if (!ch?.createInvite) return '';
    const invite = await ch.createInvite({ maxAge: 0, maxUses: 0 });
    return invite?.url || '';
  }
  public async revokeChatInvite(_chat: Chat): Promise<string> { return ''; }
  public async rejectCall(_call: Call): Promise<void> {}

  public async getUser(user: User): Promise<User | null> {
    const dUser = await this.discord.users.fetch(String(user.id)).catch(() => null);
    if (!dUser) return null;
    return this.toRompotUser(dUser);
  }
  public async updateUser(_user: { id: string } & Partial<User>): Promise<void> {}
  public async removeUser(_user: User): Promise<void> {}
  public async getUserName(user: User): Promise<string> {
    const u = await this.getUser(user);
    return u?.name || '';
  }
  public async setUserName(_user: User, _name: string): Promise<void> {}
  public async getUserDescription(_user: User): Promise<string> { return ''; }
  public async setUserDescription(_user: User, _description: string): Promise<void> {}
  public async getUserProfile(user: User): Promise<Buffer> {
    const url = await this.getUserProfileUrl(user);
    if (!url) return Buffer.alloc(0);
    const res = await fetch(url);
    return Buffer.from(await res.arrayBuffer());
  }
  public async getUserProfileUrl(user: User): Promise<string> {
    const dUser = await this.discord.users.fetch(String(user.id)).catch(() => null);
    return dUser?.displayAvatarURL({ size: 512 }) || '';
  }
  public async setUserProfile(_user: User, _profile: Buffer): Promise<void> {}
  public async unblockUser(_user: User): Promise<void> {}
  public async blockUser(_user: User): Promise<void> {}
  public async getUsers(): Promise<string[]> {
    return Array.from(this.discord.users.cache.keys()).map(String);
  }
  public async setUsers(_users: User[]): Promise<void> {}

  // ==================== DISCORD NATIVE EXTENSIONS ====================

  public async replyInteraction(
    interactionId: string,
    contentOrPayload: any,
    ephemeral: boolean = false,
  ): Promise<any> {
    const stored = this.interactions.get(String(interactionId))?.interaction;
    if (!stored) throw new Error('Interação Discord não encontrada ou expirada.');
    this.answeredInteractions.add(String(interactionId));
    const payload = typeof contentOrPayload === 'string'
      ? { content: contentOrPayload }
      : buildDiscordPayload(contentOrPayload);
    if (ephemeral) payload.flags = MessageFlags.Ephemeral;
    if (stored.replied || stored.deferred) {
      return await stored.followUp(payload).catch(() => stored.editReply(payload));
    }
    return await stored.reply(payload);
  }

  public async deferInteraction(interactionId: string, ephemeral: boolean = false): Promise<void> {
    const stored = this.interactions.get(String(interactionId))?.interaction;
    if (!stored || stored.replied || stored.deferred) return;
    this.answeredInteractions.add(String(interactionId));
    if (typeof stored.deferReply === 'function') {
      await stored.deferReply(ephemeral ? { flags: MessageFlags.Ephemeral } : undefined);
    } else if (typeof stored.deferUpdate === 'function') {
      await stored.deferUpdate();
    }
  }

  public async showDiscordModal(
    interactionId: string,
    modalSpec: {
      id: string;
      title: string;
      inputs: Array<{ id: string; label: string; style?: string; required?: boolean; placeholder?: string; value?: string; minLength?: number; maxLength?: number }>;
    },
  ): Promise<void> {
    const stored = this.interactions.get(String(interactionId))?.interaction;
    if (!stored || typeof stored.showModal !== 'function') {
      throw new Error('$show_modal: esta interação não suporta abrir um modal (ou já foi respondida).');
    }
    this.answeredInteractions.add(String(interactionId));
    const modal = new ModalBuilder()
      .setCustomId(String(modalSpec.id || 'modal').slice(0, 100))
      .setTitle(String(modalSpec.title || 'Formulário').slice(0, 45));

    for (const input of (modalSpec.inputs || []).slice(0, 5)) {
      const style = String(input.style || 'short').toLowerCase() === 'paragraph'
        ? TextInputStyle.Paragraph
        : TextInputStyle.Short;
      const field = new TextInputBuilder()
        .setCustomId(String(input.id).slice(0, 100))
        .setLabel(String(input.label).slice(0, 45))
        .setStyle(style)
        .setRequired(input.required !== false);
      if (input.placeholder) field.setPlaceholder(String(input.placeholder).slice(0, 100));
      if (input.value) field.setValue(String(input.value).slice(0, 4000));
      if (input.minLength !== undefined) field.setMinLength(Number(input.minLength));
      if (input.maxLength !== undefined) field.setMaxLength(Number(input.maxLength));
      modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(field));
    }
    await stored.showModal(modal);
  }

  public async registerSlashCommands(commands: Array<{ name: string; description: string; options?: any[] }>, guildId?: string): Promise<any> {
    if (!this.discord.application) throw new Error('Aplicação Discord não inicializada.');
    const payload = commands.map((cmd) => ({
      name: String(cmd.name).replace(/^\/+/, '').toLowerCase().slice(0, 32),
      description: String(cmd.description || 'Comando').slice(0, 100),
      options: Array.isArray(cmd.options) ? cmd.options : [],
    }));
    if (guildId) {
      return await this.discord.application.commands.set(payload, String(guildId));
    }
    return await this.discord.application.commands.set(payload);
  }

  private async resolveGuild(guildOrChannelId: string): Promise<any> {
    const id = String(guildOrChannelId || '').trim();
    const direct = await this.discord.guilds.fetch(id).catch(() => null);
    if (direct) return direct;
    const ch: any = await this.discord.channels.fetch(id).catch(() => null);
    if (ch?.guild) return ch.guild;
    throw new Error(`Servidor Discord não encontrado para ID ${id}`);
  }

  public async addRoleToUser(guildOrChannelId: string, userId: string, roleId: string): Promise<void> {
    const guild = await this.resolveGuild(guildOrChannelId);
    const member = await guild.members.fetch(String(userId));
    await member.roles.add(String(roleId));
  }

  public async removeRoleFromUser(guildOrChannelId: string, userId: string, roleId: string): Promise<void> {
    const guild = await this.resolveGuild(guildOrChannelId);
    const member = await guild.members.fetch(String(userId));
    await member.roles.remove(String(roleId));
  }

  public async userHasRole(guildOrChannelId: string, userId: string, roleId: string): Promise<boolean> {
    const guild = await this.resolveGuild(guildOrChannelId);
    const member = await guild.members.fetch(String(userId));
    return member.roles.cache.has(String(roleId));
  }

  public async getMemberRoles(guildOrChannelId: string, userId: string): Promise<string[]> {
    const guild = await this.resolveGuild(guildOrChannelId);
    const member = await guild.members.fetch(String(userId));
    return Array.from(member.roles.cache.keys()).map(String);
  }

  public async createGuildRole(guildOrChannelId: string, name: string, color?: string, hoist?: boolean, mentionable?: boolean): Promise<string> {
    const guild = await this.resolveGuild(guildOrChannelId);
    const role = await guild.roles.create({
      name: String(name),
      ...(color ? { color } : {}),
      ...(hoist !== undefined ? { hoist: Boolean(hoist) } : {}),
      ...(mentionable !== undefined ? { mentionable: Boolean(mentionable) } : {}),
    });
    return String(role.id);
  }

  public async deleteGuildRole(guildOrChannelId: string, roleId: string): Promise<void> {
    const guild = await this.resolveGuild(guildOrChannelId);
    const role = await guild.roles.fetch(String(roleId));
    if (role) await role.delete();
  }

  public async userHasPermission(guildOrChannelId: string, userId: string, permission: string): Promise<boolean> {
    const guild = await this.resolveGuild(guildOrChannelId);
    const member = await guild.members.fetch(String(userId));
    return member.permissions.has(permission as any);
  }

  public async timeoutMember(guildOrChannelId: string, userId: string, seconds: number, reason?: string): Promise<void> {
    const guild = await this.resolveGuild(guildOrChannelId);
    const member = await guild.members.fetch(String(userId));
    await member.timeout(seconds > 0 ? seconds * 1000 : null, reason);
  }

  public async kickMember(guildOrChannelId: string, userId: string, reason?: string): Promise<void> {
    const guild = await this.resolveGuild(guildOrChannelId);
    const member = await guild.members.fetch(String(userId));
    await member.kick(reason);
  }

  public async banGuildMember(guildOrChannelId: string, userId: string, deleteMessageSeconds?: number, reason?: string): Promise<void> {
    const guild = await this.resolveGuild(guildOrChannelId);
    await guild.members.ban(String(userId), {
      ...(deleteMessageSeconds ? { deleteMessageSeconds } : {}),
      ...(reason ? { reason } : {}),
    });
  }

  public async unbanGuildMember(guildOrChannelId: string, userId: string): Promise<void> {
    const guild = await this.resolveGuild(guildOrChannelId);
    await guild.members.unban(String(userId));
  }

  public async setMemberNickname(guildOrChannelId: string, userId: string, nickname: string): Promise<void> {
    const guild = await this.resolveGuild(guildOrChannelId);
    const member = await guild.members.fetch(String(userId));
    await member.setNickname(nickname || null);
  }

  public async purgeMessages(channelId: string, count: number): Promise<number> {
    const ch: any = await this.discord.channels.fetch(String(channelId));
    if (!ch?.bulkDelete) throw new Error('Este canal não suporta limpeza em lote ($purge_messages).');
    const deleted = await ch.bulkDelete(Math.min(100, Math.max(1, Math.floor(count))), true);
    return Number(deleted?.size ?? 0);
  }

  public async createGuildChannel(guildOrChannelId: string, name: string, type: string = 'text', parentId?: string): Promise<string> {
    const guild = await this.resolveGuild(guildOrChannelId);
    const typeMap: Record<string, ChannelType> = {
      text: ChannelType.GuildText,
      voice: ChannelType.GuildVoice,
      category: ChannelType.GuildCategory,
      forum: ChannelType.GuildForum,
      announcement: ChannelType.GuildAnnouncement,
    };
    const created = await guild.channels.create({
      name: String(name).slice(0, 100),
      type: typeMap[String(type).toLowerCase()] ?? ChannelType.GuildText,
      ...(parentId ? { parent: String(parentId) } : {}),
    });
    return String(created.id);
  }

  public async deleteGuildChannel(channelId: string): Promise<void> {
    const ch: any = await this.discord.channels.fetch(String(channelId)).catch(() => null);
    if (ch?.delete) await ch.delete();
  }

  public async setChannelTopic(channelId: string, topic: string): Promise<void> {
    const ch: any = await this.discord.channels.fetch(String(channelId));
    if (ch?.setTopic) await ch.setTopic(String(topic));
  }

  public async setChannelSlowmode(channelId: string, seconds: number): Promise<void> {
    const ch: any = await this.discord.channels.fetch(String(channelId));
    if (ch?.setRateLimitPerUser) await ch.setRateLimitPerUser(Math.max(0, Math.min(21600, Math.floor(seconds))));
  }

  public async setChannelPermission(channelId: string, targetId: string, allow: boolean, permission: string): Promise<void> {
    const ch: any = await this.discord.channels.fetch(String(channelId));
    if (!ch?.permissionOverwrites) throw new Error('Canal não suporta alteração de permissões.');
    await ch.permissionOverwrites.edit(String(targetId), { [permission]: allow });
  }

  public async createThread(channelOrMessageId: string, name: string, messageId?: string, autoArchiveMinutes: number = 1440): Promise<string> {
    const ch: any = await this.discord.channels.fetch(String(channelOrMessageId));
    if (messageId && ch?.messages) {
      const msg = await ch.messages.fetch(String(messageId));
      const thread = await msg.startThread({ name: String(name).slice(0, 100), autoArchiveDuration: autoArchiveMinutes as any });
      return String(thread.id);
    }
    const thread = await ch.threads.create({ name: String(name).slice(0, 100), autoArchiveDuration: autoArchiveMinutes as any });
    return String(thread.id);
  }

  public async archiveThread(threadId: string, archived: boolean = true): Promise<void> {
    const th: any = await this.discord.channels.fetch(String(threadId));
    if (th?.setArchived) await th.setArchived(archived);
  }

  public async lockThread(threadId: string, locked: boolean = true): Promise<void> {
    const th: any = await this.discord.channels.fetch(String(threadId));
    if (th?.setLocked) await th.setLocked(locked);
  }

  public async sendDiscordWebhook(url: string, contentOrEmbed: any, username?: string, avatarURL?: string): Promise<any> {
    const webhook = new WebhookClient({ url: String(url) });
    const payload = typeof contentOrEmbed === 'string'
      ? { content: contentOrEmbed }
      : buildDiscordPayload(contentOrEmbed);
    return await webhook.send({
      ...payload,
      ...(username ? { username: String(username) } : {}),
      ...(avatarURL ? { avatarURL: String(avatarURL) } : {}),
    });
  }

  public async moveVoiceMember(guildOrChannelId: string, userId: string, voiceChannelId: string): Promise<void> {
    const guild = await this.resolveGuild(guildOrChannelId);
    const member = await guild.members.fetch(String(userId));
    await member.voice.setChannel(voiceChannelId ? String(voiceChannelId) : null);
  }

  public async muteVoiceMember(guildOrChannelId: string, userId: string, muted: boolean = true): Promise<void> {
    const guild = await this.resolveGuild(guildOrChannelId);
    const member = await guild.members.fetch(String(userId));
    await member.voice.setMute(muted);
  }

  public async deafenVoiceMember(guildOrChannelId: string, userId: string, deafened: boolean = true): Promise<void> {
    const guild = await this.resolveGuild(guildOrChannelId);
    const member = await guild.members.fetch(String(userId));
    await member.voice.setDeaf(deafened);
  }

  public async disconnectVoiceMember(guildOrChannelId: string, userId: string): Promise<void> {
    await this.moveVoiceMember(guildOrChannelId, userId, '');
  }

  // ==================== SERVER (GUILD) MANAGEMENT ====================

  public async isServerAdmin(guildOrChannelId: string, userId: string): Promise<boolean> {
    const guild = await this.resolveGuild(guildOrChannelId);
    if (String(guild.ownerId || '') === String(userId)) return true;
    const member = await guild.members.fetch(String(userId)).catch(() => null);
    if (!member) return false;
    return Boolean(
      member.permissions?.has(PermissionFlagsBits.Administrator)
      || member.permissions?.has(PermissionFlagsBits.ManageGuild),
    );
  }

  public async isServerMember(guildOrChannelId: string, userId: string): Promise<boolean> {
    const guild = await this.resolveGuild(guildOrChannelId);
    const member = await guild.members.fetch(String(userId)).catch(() => null);
    return Boolean(member);
  }

  public async getServerMembers(guildOrChannelId: string): Promise<string[]> {
    const guild = await this.resolveGuild(guildOrChannelId);
    const members = await guild.members.fetch().catch(() => guild.members.cache);
    return Array.from(members.keys()).map(String);
  }

  public async getServerAdmins(guildOrChannelId: string): Promise<string[]> {
    const guild = await this.resolveGuild(guildOrChannelId);
    const members = await guild.members.fetch().catch(() => guild.members.cache);
    return Array.from(members.values())
      .filter((m: any) => (
        String(m.id) === String(guild.ownerId || '')
        || m.permissions?.has(PermissionFlagsBits.Administrator)
        || m.permissions?.has(PermissionFlagsBits.ManageGuild)
      ))
      .map((m: any) => String(m.id));
  }

  public async getServerInvite(guildOrChannelId: string): Promise<string> {
    const id = String(guildOrChannelId || '').trim();
    const directChannel: any = await this.discord.channels.fetch(id).catch(() => null);
    if (directChannel?.createInvite) {
      const invite = await directChannel.createInvite({ maxAge: 0, maxUses: 0 });
      return invite?.url || '';
    }
    const guild = await this.resolveGuild(id);
    const channels = await guild.channels.fetch().catch(() => guild.channels.cache);
    const candidate: any = guild.systemChannel
      || guild.rulesChannel
      || Array.from(channels.values()).find((ch: any) => typeof ch?.createInvite === 'function');
    if (!candidate?.createInvite) return '';
    const invite = await candidate.createInvite({ maxAge: 0, maxUses: 0 });
    return invite?.url || '';
  }

  public async setServerName(guildOrChannelId: string, name: string): Promise<void> {
    const guild = await this.resolveGuild(guildOrChannelId);
    await guild.setName(String(name).slice(0, 100));
  }

  public async setServerDescription(guildOrChannelId: string, description: string): Promise<void> {
    const guild = await this.resolveGuild(guildOrChannelId);
    await guild.setDescription(description ? String(description).slice(0, 120) : null);
  }

  public async setServerIcon(guildOrChannelId: string, icon: Buffer): Promise<void> {
    const guild = await this.resolveGuild(guildOrChannelId);
    await guild.setIcon(icon);
  }

  public async leaveServer(guildOrChannelId: string): Promise<void> {
    const guild = await this.resolveGuild(guildOrChannelId);
    await guild.leave();
  }
}
