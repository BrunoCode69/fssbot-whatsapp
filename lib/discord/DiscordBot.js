"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toDiscordEmbed = toDiscordEmbed;
exports.buildDiscordPayload = buildDiscordPayload;
const discord_js_1 = require("discord.js");
const BotEvents_1 = __importDefault(require("../bot/BotEvents"));
const BotStatus_1 = require("../bot/BotStatus");
const AudioMessage_1 = __importDefault(require("../messages/AudioMessage"));
const ButtonMessage_1 = __importStar(require("../messages/ButtonMessage"));
const ContactMessage_1 = __importDefault(require("../messages/ContactMessage"));
const FileMessage_1 = __importDefault(require("../messages/FileMessage"));
const ImageMessage_1 = __importDefault(require("../messages/ImageMessage"));
const ListMessage_1 = __importDefault(require("../messages/ListMessage"));
const LocationMessage_1 = __importDefault(require("../messages/LocationMessage"));
const Message_1 = __importStar(require("../messages/Message"));
const PollMessage_1 = __importDefault(require("../messages/PollMessage"));
const TextMessage_1 = __importDefault(require("../messages/TextMessage"));
const VideoMessage_1 = __importDefault(require("../messages/VideoMessage"));
const Chat_1 = __importDefault(require("../modules/chat/Chat"));
const ChatStatus_1 = __importDefault(require("../modules/chat/ChatStatus"));
const ChatType_1 = __importDefault(require("../modules/chat/ChatType"));
const User_1 = __importDefault(require("../modules/user/User"));
const DiscordIntents_1 = require("./DiscordIntents");
const DISCORD_BUTTON_STYLES = {
    primary: discord_js_1.ButtonStyle.Primary,
    blurple: discord_js_1.ButtonStyle.Primary,
    azul: discord_js_1.ButtonStyle.Primary,
    secondary: discord_js_1.ButtonStyle.Secondary,
    gray: discord_js_1.ButtonStyle.Secondary,
    cinza: discord_js_1.ButtonStyle.Secondary,
    success: discord_js_1.ButtonStyle.Success,
    green: discord_js_1.ButtonStyle.Success,
    verde: discord_js_1.ButtonStyle.Success,
    danger: discord_js_1.ButtonStyle.Danger,
    red: discord_js_1.ButtonStyle.Danger,
    vermelho: discord_js_1.ButtonStyle.Danger,
    link: discord_js_1.ButtonStyle.Link,
};
const ACTIVITY_TYPES = {
    playing: discord_js_1.ActivityType.Playing,
    jogando: discord_js_1.ActivityType.Playing,
    streaming: discord_js_1.ActivityType.Streaming,
    listening: discord_js_1.ActivityType.Listening,
    ouvindo: discord_js_1.ActivityType.Listening,
    watching: discord_js_1.ActivityType.Watching,
    assistindo: discord_js_1.ActivityType.Watching,
    competing: discord_js_1.ActivityType.Competing,
    competindo: discord_js_1.ActivityType.Competing,
};
function toDiscordEmbed(spec) {
    const embed = new discord_js_1.EmbedBuilder();
    if (!spec || typeof spec !== 'object')
        return embed;
    if (spec.title)
        embed.setTitle(String(spec.title).slice(0, 256));
    if (spec.description)
        embed.setDescription(String(spec.description).slice(0, 4096));
    if (spec.url)
        embed.setURL(String(spec.url));
    if (spec.color !== undefined && spec.color !== '') {
        const raw = String(spec.color).trim();
        if (/^#?[0-9a-f]{6}$/i.test(raw)) {
            embed.setColor(Number.parseInt(raw.replace(/^#/, ''), 16));
        }
        else if (!Number.isNaN(Number(raw))) {
            embed.setColor(Number(raw));
        }
    }
    if (spec.thumbnail)
        embed.setThumbnail(String(spec.thumbnail));
    if (spec.image)
        embed.setImage(String(spec.image));
    if (spec.author) {
        if (typeof spec.author === 'string') {
            embed.setAuthor({ name: spec.author.slice(0, 256) });
        }
        else if (spec.author?.name) {
            embed.setAuthor({
                name: String(spec.author.name).slice(0, 256),
                ...(spec.author.iconUrl ? { iconURL: String(spec.author.iconUrl) } : {}),
                ...(spec.author.url ? { url: String(spec.author.url) } : {}),
            });
        }
    }
    if (Array.isArray(spec.fields) && spec.fields.length > 0) {
        embed.addFields(spec.fields.slice(0, 25).map((f) => ({
            name: String(f?.name || '\u200b').slice(0, 256),
            value: String(f?.value || '\u200b').slice(0, 1024),
            inline: Boolean(f?.inline),
        })));
    }
    if (spec.footer) {
        if (typeof spec.footer === 'string') {
            embed.setFooter({ text: spec.footer.slice(0, 2048) });
        }
        else if (spec.footer?.text) {
            embed.setFooter({
                text: String(spec.footer.text).slice(0, 2048),
                ...(spec.footer.iconUrl ? { iconURL: String(spec.footer.iconUrl) } : {}),
            });
        }
    }
    if (spec.timestamp === true)
        embed.setTimestamp();
    else if (spec.timestamp)
        embed.setTimestamp(new Date(spec.timestamp));
    return embed;
}
function buildDiscordPayload(message) {
    const payload = {};
    const embeds = [];
    const components = [];
    const files = [];
    if (Array.isArray(message.extra?.discordEmbeds)) {
        for (const spec of message.extra.discordEmbeds.slice(0, 10)) {
            embeds.push(toDiscordEmbed(spec));
        }
    }
    else if (message.extra?.discordEmbed) {
        embeds.push(toDiscordEmbed(message.extra.discordEmbed));
    }
    if (message instanceof LocationMessage_1.default || message.type === Message_1.MessageType.Location) {
        const loc = message;
        const mapsUrl = `https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`;
        embeds.push(new discord_js_1.EmbedBuilder()
            .setTitle(loc.name || 'Localização')
            .setDescription(loc.address || `Coordenadas: ${loc.latitude}, ${loc.longitude}`)
            .setURL(loc.url || mapsUrl)
            .setColor(0x5865f2));
    }
    else if (message instanceof ContactMessage_1.default || message.type === Message_1.MessageType.Contact) {
        const contactMsg = message;
        const listText = (contactMsg.contacts || [])
            .map((c) => `• **${c.name || 'Contato'}**: ${c.phone || ''}`)
            .join('\n');
        embeds.push(new discord_js_1.EmbedBuilder().setTitle('Contatos').setDescription(listText || 'Sem contatos').setColor(0x57f287));
    }
    else if (message instanceof PollMessage_1.default || message.type === Message_1.MessageType.Poll) {
        const poll = message;
        payload.poll = {
            question: { text: (poll.text || 'Enquete').slice(0, 300) },
            answers: (poll.options || []).slice(0, 10).map((o) => ({ text: String(o.name || o.id).slice(0, 55) })),
            allowMultiselect: Number(poll.selectableCount ?? 1) > 1,
            duration: 24,
        };
    }
    if (message instanceof ButtonMessage_1.default || message.type === Message_1.MessageType.Button) {
        const btnMsg = message;
        const buttons = (btnMsg.buttons || []).slice(0, 25);
        for (let i = 0; i < buttons.length; i += 5) {
            const row = new discord_js_1.ActionRowBuilder();
            for (const btn of buttons.slice(i, i + 5)) {
                const builder = new discord_js_1.ButtonBuilder().setLabel(String(btn.text || 'Botão').slice(0, 80));
                if (btn.emoji) {
                    try {
                        builder.setEmoji(btn.emoji);
                    }
                    catch { }
                }
                if (btn.type === ButtonMessage_1.ButtonType.Url) {
                    builder.setStyle(discord_js_1.ButtonStyle.Link).setURL(String(btn.content || 'https://discord.com'));
                }
                else {
                    const styleKey = String(btn.style || 'primary').toLowerCase();
                    builder
                        .setStyle(DISCORD_BUTTON_STYLES[styleKey] ?? discord_js_1.ButtonStyle.Primary)
                        .setCustomId(String(btn.content || btn.text || `btn_${i}`).slice(0, 100));
                }
                row.addComponents(builder);
            }
            if (row.components.length > 0)
                components.push(row);
        }
    }
    if (message instanceof ListMessage_1.default || message.type === Message_1.MessageType.List) {
        const listMsg = message;
        const selectType = String(listMsg.selectType || 'string').toLowerCase();
        const customId = String(message.extra?.customId || listMsg.id || `select_${Date.now()}`).slice(0, 100);
        const placeholder = String(listMsg.button || listMsg.title || 'Escolha uma opção').slice(0, 150);
        const minValues = Math.max(0, Math.min(25, Number(listMsg.minValues ?? 1)));
        const maxValues = Math.max(minValues || 1, Math.min(25, Number(listMsg.maxValues ?? 1)));
        const row = new discord_js_1.ActionRowBuilder();
        if (selectType === 'user') {
            row.addComponents(new discord_js_1.UserSelectMenuBuilder().setCustomId(customId).setPlaceholder(placeholder).setMinValues(minValues).setMaxValues(maxValues));
        }
        else if (selectType === 'role') {
            row.addComponents(new discord_js_1.RoleSelectMenuBuilder().setCustomId(customId).setPlaceholder(placeholder).setMinValues(minValues).setMaxValues(maxValues));
        }
        else if (selectType === 'channel') {
            row.addComponents(new discord_js_1.ChannelSelectMenuBuilder().setCustomId(customId).setPlaceholder(placeholder).setMinValues(minValues).setMaxValues(maxValues));
        }
        else if (selectType === 'mentionable') {
            row.addComponents(new discord_js_1.MentionableSelectMenuBuilder().setCustomId(customId).setPlaceholder(placeholder).setMinValues(minValues).setMaxValues(maxValues));
        }
        else {
            const options = (listMsg.list || []).flatMap((sec) => (sec.items || []).map((item) => ({
                label: String(item.title || item.id).slice(0, 100),
                value: String(item.id || item.title).slice(0, 100),
                ...(item.description ? { description: String(item.description).slice(0, 100) } : {}),
                ...(item.emoji ? { emoji: String(item.emoji) } : {}),
            }))).slice(0, 25);
            if (options.length > 0) {
                row.addComponents(new discord_js_1.StringSelectMenuBuilder()
                    .setCustomId(customId)
                    .setPlaceholder(placeholder)
                    .setMinValues(minValues)
                    .setMaxValues(Math.min(maxValues, options.length))
                    .addOptions(options));
            }
        }
        if (row.components.length > 0)
            components.push(row);
    }
    const rawText = typeof message.text === 'string' ? message.text : '';
    if (rawText && !(message instanceof PollMessage_1.default || message.type === Message_1.MessageType.Poll)) {
        payload.content = rawText.slice(0, 2000);
    }
    else if (embeds.length === 0 && components.length === 0 && files.length === 0 && !payload.poll) {
        payload.content = rawText || '\u200b';
    }
    if (embeds.length > 0)
        payload.embeds = embeds;
    if (components.length > 0)
        payload.components = components;
    if (files.length > 0)
        payload.files = files;
    return payload;
}
class DiscordBot extends BotEvents_1.default {
    constructor(options = {}) {
        super();
        this.platform = 'discord';
        this.auth = '';
        this.id = '';
        this.status = BotStatus_1.BotStatus.Offline;
        this.phoneNumber = '';
        this.name = '';
        this.profileUrl = '';
        this.interactions = new Map();
        this.answeredInteractions = new Set();
        this.options = options;
        this.discord = this.createClient(options.intents);
    }
    createClient(intentsInput) {
        const intents = (0, DiscordIntents_1.resolveDiscordIntents)(intentsInput ?? this.options.intents);
        const client = new discord_js_1.Client({
            intents,
            partials: [discord_js_1.Partials.Channel, discord_js_1.Partials.Message, discord_js_1.Partials.Reaction, discord_js_1.Partials.GuildMember, discord_js_1.Partials.User],
        });
        this.attachEvents(client);
        return client;
    }
    storeInteraction(interaction) {
        const id = String(interaction?.id || '');
        if (!id)
            return '';
        const now = Date.now();
        this.interactions.set(id, { interaction, createdAt: now });
        if (this.interactions.size > 500) {
            for (const [k, v] of this.interactions.entries()) {
                if (now - v.createdAt > 15 * 60000 || this.interactions.size > 500) {
                    this.interactions.delete(k);
                }
            }
        }
        return id;
    }
    toRompotChat(channel, guild) {
        const channelId = String(channel?.id || '');
        const isDM = channel?.isDMBased?.() || channel?.type === discord_js_1.ChannelType.DM;
        const chat = new Chat_1.default(channelId, isDM ? ChatType_1.default.PV : ChatType_1.default.Group);
        chat.name = String(channel?.name || guild?.name || '');
        chat.description = String(channel?.topic || '');
        return chat;
    }
    toRompotUser(author, member) {
        const id = String(author?.id || member?.id || '');
        const displayName = String(member?.displayName || author?.globalName || author?.username || id);
        const avatarUrl = typeof author?.displayAvatarURL === 'function' ? author.displayAvatarURL() : '';
        const user = new User_1.default(id, displayName);
        user.nickname = String(author?.username || '');
        user.profileUrl = avatarUrl || '';
        return user;
    }
    attachEvents(client) {
        client.on(discord_js_1.Events.ClientReady, (readyClient) => {
            this.id = String(readyClient.user?.id || '');
            this.name = String(readyClient.user?.username || '');
            this.profileUrl = readyClient.user?.displayAvatarURL() || '';
            this.status = BotStatus_1.BotStatus.Online;
            this.emit('open', { isNewLogin: false });
        });
        client.on(discord_js_1.Events.MessageCreate, async (dMsg) => {
            if (dMsg.author?.bot)
                return;
            const converted = await this.convertIncomingMessage(dMsg);
            this.emit('message', converted);
        });
        client.on(discord_js_1.Events.MessageUpdate, async (_oldMsg, newMsg) => {
            if (newMsg.partial) {
                try {
                    newMsg = await newMsg.fetch();
                }
                catch {
                    return;
                }
            }
            if (newMsg.author?.bot)
                return;
            const converted = await this.convertIncomingMessage(newMsg);
            converted.isEdited = true;
            this.emit('message', converted);
        });
        client.on(discord_js_1.Events.MessageDelete, (dMsg) => {
            const chat = this.toRompotChat(dMsg.channel, dMsg.guild);
            const user = dMsg.author ? this.toRompotUser(dMsg.author, dMsg.member) : new User_1.default('');
            this.emit('discord-message-delete', {
                messageId: String(dMsg.id || ''),
                channelId: String(dMsg.channelId || ''),
                guildId: dMsg.guildId ? String(dMsg.guildId) : undefined,
                text: String(dMsg.content || ''),
                chat,
                user,
            });
        });
        const handleReaction = async (reaction, dUser, isAdd) => {
            if (dUser?.bot)
                return;
            if (reaction.partial) {
                try {
                    reaction = await reaction.fetch();
                }
                catch { }
            }
            const chat = this.toRompotChat(reaction.message?.channel, reaction.message?.guild);
            const user = this.toRompotUser(dUser);
            const emoji = String(reaction.emoji?.name || reaction.emoji?.id || '');
            this.emit('message-reaction', {
                chat,
                user,
                messageId: String(reaction.message?.id || ''),
                emoji: isAdd ? emoji : '',
                added: isAdd && emoji ? [emoji] : [],
                removed: !isAdd && emoji ? [emoji] : [],
            });
        };
        client.on(discord_js_1.Events.MessageReactionAdd, (reaction, dUser) => {
            void handleReaction(reaction, dUser, true);
        });
        client.on(discord_js_1.Events.MessageReactionRemove, (reaction, dUser) => {
            void handleReaction(reaction, dUser, false);
        });
        client.on(discord_js_1.Events.GuildMemberAdd, (member) => {
            const chat = new Chat_1.default(String(member.guild?.id || ''), ChatType_1.default.Group);
            chat.name = member.guild?.name || '';
            const user = this.toRompotUser(member.user, member);
            this.emit('user', {
                action: 'join',
                event: 'add',
                chat,
                user,
                fromUser: user,
            });
            this.emit('user', {
                action: 'add',
                event: 'add',
                chat,
                user,
                fromUser: user,
            });
        });
        client.on(discord_js_1.Events.GuildMemberRemove, (member) => {
            const chat = new Chat_1.default(String(member.guild?.id || ''), ChatType_1.default.Group);
            chat.name = member.guild?.name || '';
            const user = this.toRompotUser(member.user, member);
            this.emit('user', {
                action: 'leave',
                event: 'remove',
                chat,
                user,
                fromUser: user,
            });
            this.emit('user', {
                action: 'remove',
                event: 'remove',
                chat,
                user,
                fromUser: user,
            });
        });
        client.on(discord_js_1.Events.VoiceStateUpdate, (oldState, newState) => {
            const oldChannelId = oldState.channelId ? String(oldState.channelId) : undefined;
            const newChannelId = newState.channelId ? String(newState.channelId) : '';
            const action = !oldChannelId && newChannelId
                ? 'join'
                : oldChannelId && !newChannelId
                    ? 'leave'
                    : oldChannelId && newChannelId && oldChannelId !== newChannelId
                        ? 'switch'
                        : 'update';
            const channel = newState.channel || oldState.channel;
            const guild = newState.guild || oldState.guild;
            const user = this.toRompotUser(newState.member?.user || { id: newState.id }, newState.member);
            const chat = new Chat_1.default(newChannelId || oldChannelId || String(guild?.id || ''), ChatType_1.default.Group);
            chat.name = channel?.name || guild?.name || '';
            this.emit('discord-voice', {
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
        const emitRole = (role, action) => {
            const chat = new Chat_1.default(String(role.guild?.id || ''), ChatType_1.default.Group);
            chat.name = role.guild?.name || '';
            this.emit('discord-role-update', {
                action,
                guildId: String(role.guild?.id || ''),
                roleId: String(role.id || ''),
                roleName: String(role.name || ''),
                color: String(role.hexColor || ''),
                chat,
            });
        };
        client.on(discord_js_1.Events.GuildRoleCreate, (r) => emitRole(r, 'create'));
        client.on(discord_js_1.Events.GuildRoleUpdate, (_o, n) => emitRole(n, 'update'));
        client.on(discord_js_1.Events.GuildRoleDelete, (r) => emitRole(r, 'delete'));
        client.on(discord_js_1.Events.InteractionCreate, async (interaction) => {
            await this.handleInteraction(interaction);
        });
        client.on(discord_js_1.Events.Error, (err) => {
            this.emit('error', err instanceof Error ? err : new Error(String(err)));
        });
    }
    async handleInteraction(interaction) {
        const interactionId = this.storeInteraction(interaction);
        const channel = interaction.channel || { id: interaction.channelId, type: interaction.guildId ? discord_js_1.ChannelType.GuildText : discord_js_1.ChannelType.DM };
        const chat = this.toRompotChat(channel, interaction.guild);
        const user = this.toRompotUser(interaction.user, interaction.member);
        const guildMeta = {
            guildId: interaction.guildId ? String(interaction.guildId) : '',
            guildName: String(interaction.guild?.name || ''),
            guildIcon: interaction.guild?.iconURL() || '',
            guildMemberCount: Number(interaction.guild?.memberCount ?? 0),
            channelId: String(interaction.channelId || ''),
            channelName: String(channel?.name || ''),
            interactionId,
        };
        if (interaction.isChatInputCommand()) {
            const optionsMap = {};
            const argParts = [];
            for (const opt of interaction.options.data) {
                if (opt.type === 1 || opt.type === 2) {
                    for (const subOpt of opt.options || []) {
                        optionsMap[subOpt.name] = subOpt.value ?? '';
                        if (subOpt.value !== undefined)
                            argParts.push(String(subOpt.value));
                    }
                }
                else {
                    optionsMap[opt.name] = opt.value ?? '';
                    if (opt.value !== undefined)
                        argParts.push(String(opt.value));
                }
            }
            const subcommand = interaction.options.getSubcommand(false) || undefined;
            const commandText = `/${interaction.commandName}${argParts.length ? ` ${argParts.join(' ')}` : ''}`;
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
            const msg = new TextMessage_1.default(chat, commandText, {
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
            const bMsg = new ButtonMessage_1.default(chat, String(interaction.message?.content || ''), [], {
                id: String(interaction.message?.id || interactionId),
                user,
                selected: customId,
                extra: {
                    ...guildMeta,
                    customId,
                    messageId: String(interaction.message?.id || ''),
                },
            });
            this.scheduleAutoDefer(interactionId, interaction);
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
            const lMsg = new ListMessage_1.default(chat, String(interaction.message?.content || ''), [], {
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
            this.scheduleAutoDefer(interactionId, interaction);
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
            const fields = {};
            for (const [key, comp] of interaction.fields.fields.entries()) {
                if ('value' in comp)
                    fields[key] = String(comp.value ?? '');
            }
            this.scheduleAutoDefer(interactionId, interaction);
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
    scheduleAutoDefer(interactionId, interaction) {
        setTimeout(() => {
            if (this.answeredInteractions.has(interactionId))
                return;
            if (!interaction || interaction.replied || interaction.deferred)
                return;
            if (typeof interaction.deferUpdate === 'function') {
                void interaction.deferUpdate().catch(() => { });
            }
        }, 1800);
    }
    async convertIncomingMessage(dMsg) {
        const chat = this.toRompotChat(dMsg.channel, dMsg.guild);
        const user = this.toRompotUser(dMsg.author, dMsg.member);
        const mentions = Array.from(dMsg.mentions.users.keys()).map(String);
        const baseExtra = {
            guildId: dMsg.guildId ? String(dMsg.guildId) : '',
            guildName: String(dMsg.guild?.name || ''),
            guildIcon: dMsg.guild?.iconURL() || '',
            guildMemberCount: Number(dMsg.guild?.memberCount ?? 0),
            channelId: String(dMsg.channelId || ''),
            channelName: String(dMsg.channel?.name || ''),
            threadId: dMsg.channel?.isThread?.() ? String(dMsg.channelId) : '',
        };
        const firstAtt = dMsg.attachments.first();
        let rompotMsg;
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
                rompotMsg = new ImageMessage_1.default(chat, String(dMsg.content || ''), firstAtt.url, common);
            }
            else if (mime.startsWith('video/')) {
                rompotMsg = new VideoMessage_1.default(chat, String(dMsg.content || ''), firstAtt.url, common);
            }
            else if (mime.startsWith('audio/')) {
                rompotMsg = new AudioMessage_1.default(chat, firstAtt.url, common);
            }
            else {
                rompotMsg = new FileMessage_1.default(chat, String(dMsg.content || ''), firstAtt.url, { ...common, name: firstAtt.name || 'file' });
            }
        }
        else {
            rompotMsg = new TextMessage_1.default(chat, String(dMsg.content || ''), {
                id: String(dMsg.id),
                user,
                mentions,
                timestamp: Math.floor(dMsg.createdTimestamp / 1000),
                extra: baseExtra,
            });
        }
        if (dMsg.reference?.messageId) {
            try {
                const refMsg = await dMsg.fetchReference();
                rompotMsg.mention = await this.convertIncomingMessage(refMsg);
            }
            catch { }
        }
        return rompotMsg;
    }
    async connect(auth) {
        this.status = BotStatus_1.BotStatus.Offline;
        this.emit('connecting', {});
        this.auth = auth;
        const token = typeof auth === 'string' ? auth : await auth.get('BOT_TOKEN');
        if (!token)
            throw new Error('Token do Discord não informado.');
        await this.discord.login(String(token).trim());
    }
    async reconnect(_alert) {
        this.status = BotStatus_1.BotStatus.Offline;
        this.emit('reconnecting', {});
        try {
            await this.discord.destroy();
        }
        catch { }
        this.discord = this.createClient(this.options.intents);
        await this.connect(this.auth);
    }
    async stop(_reason) {
        this.status = BotStatus_1.BotStatus.Offline;
        try {
            await this.discord.destroy();
        }
        catch { }
        this.emit('stop', { isLogout: false });
    }
    async logout() {
        this.status = BotStatus_1.BotStatus.Offline;
        try {
            await this.discord.destroy();
        }
        catch { }
        this.emit('stop', { isLogout: true });
    }
    async send(message) {
        const payload = await this.preparePayloadWithMedia(message);
        const interactionId = String(message.extra?.interactionId || message.mention?.extra?.interactionId || '');
        const stored = interactionId ? this.interactions.get(interactionId)?.interaction : undefined;
        if (stored && (message.extra?.replyAsInteraction || message.mention?.extra?.isSlashCommand)) {
            this.answeredInteractions.add(interactionId);
            if (message.extra?.ephemeral) {
                payload.flags = discord_js_1.MessageFlags.Ephemeral;
            }
            let sent;
            if (stored.replied || stored.deferred) {
                sent = await stored.followUp({ ...payload, withResponse: true }).catch(() => stored.editReply(payload));
            }
            else {
                const res = await stored.reply({ ...payload, withResponse: true });
                sent = res?.resource?.message ?? await stored.fetchReply().catch(() => null);
            }
            const msgId = String(sent?.id || interactionId);
            return new Message_1.default(message.chat, payload.content || message.text || '', {
                id: msgId,
                fromMe: true,
                extra: { ...message.extra, channelId: String(message.chat?.id || ''), interactionId },
            });
        }
        const channel = await this.fetchSendableChannel(String(message.chat?.id || ''));
        const sent = await channel.send(payload);
        return new Message_1.default(message.chat, String(sent.content || message.text || ''), {
            id: String(sent.id),
            fromMe: true,
            extra: { ...message.extra, channelId: String(sent.channelId || message.chat?.id || '') },
        });
    }
    async preparePayloadWithMedia(message) {
        const payload = buildDiscordPayload(message);
        if (message instanceof ImageMessage_1.default
            || message instanceof VideoMessage_1.default
            || message instanceof AudioMessage_1.default
            || message instanceof FileMessage_1.default
            || message.type === Message_1.MessageType.Image
            || message.type === Message_1.MessageType.Video
            || message.type === Message_1.MessageType.Audio
            || message.type === Message_1.MessageType.File) {
            const mediaMsg = message;
            const source = typeof mediaMsg.getStream === 'function'
                ? await mediaMsg.getStream().catch(() => mediaMsg.file || message.extra?.url)
                : (mediaMsg.file || message.extra?.url);
            if (source) {
                const fileName = mediaMsg.name || (message.type === Message_1.MessageType.Image ? 'image.png' : message.type === Message_1.MessageType.Video ? 'video.mp4' : message.type === Message_1.MessageType.Audio ? 'audio.mp3' : 'file.bin');
                payload.files = [...(payload.files || []), new discord_js_1.AttachmentBuilder(source, { name: String(fileName) })];
            }
            if (mediaMsg.caption && !payload.content) {
                payload.content = String(mediaMsg.caption).slice(0, 2000);
            }
        }
        return payload;
    }
    async fetchSendableChannel(targetId) {
        if (!targetId)
            throw new Error('ID do canal ou usuário Discord não informado.');
        const ch = await this.discord.channels.fetch(targetId).catch(() => null);
        if (ch && typeof ch.send === 'function')
            return ch;
        const dUser = await this.discord.users.fetch(targetId).catch(() => null);
        if (dUser)
            return await dUser.createDM();
        throw new Error(`Canal ou usuário Discord não encontrado: ${targetId}`);
    }
    async editMessage(message) {
        const payload = await this.preparePayloadWithMedia(message);
        const channel = await this.fetchSendableChannel(String(message.chat?.id || ''));
        const dMsg = await channel.messages?.fetch?.(String(message.id || ''));
        if (!dMsg)
            throw new Error('Mensagem Discord não encontrada para edição.');
        await dMsg.edit(payload);
    }
    async deleteMessage(message) {
        const channel = await this.fetchSendableChannel(String(message.chat?.id || ''));
        const dMsg = await channel.messages?.fetch?.(String(message.id || ''));
        if (dMsg)
            await dMsg.delete();
    }
    async removeMessage(message) {
        await this.deleteMessage(message);
    }
    async addReaction(message) {
        const channel = await this.fetchSendableChannel(String(message.chat?.id || ''));
        const targetId = String(message.extra?.targetId || message.message?.id || message.id || '');
        const dMsg = await channel.messages?.fetch?.(targetId);
        if (dMsg && message.text)
            await dMsg.react(message.text);
    }
    async removeReaction(message) {
        const channel = await this.fetchSendableChannel(String(message.chat?.id || ''));
        const targetId = String(message.extra?.targetId || message.message?.id || message.id || '');
        const dMsg = await channel.messages?.fetch?.(targetId);
        if (!dMsg)
            return;
        if (message.text) {
            const r = dMsg.reactions.resolve(message.text);
            await r?.users.remove(this.id).catch(() => { });
        }
        else {
            await dMsg.reactions.removeAll().catch(() => { });
        }
    }
    async pinMessage(message) {
        const channel = await this.fetchSendableChannel(String(message.chat?.id || ''));
        const dMsg = await channel.messages?.fetch?.(String(message.id || ''));
        if (dMsg)
            await dMsg.pin();
    }
    async unpinMessage(message) {
        const channel = await this.fetchSendableChannel(String(message.chat?.id || ''));
        const dMsg = await channel.messages?.fetch?.(String(message.id || ''));
        if (dMsg)
            await dMsg.unpin();
    }
    async readMessage(_message) { }
    async downloadStreamMessage(media) {
        const url = String(media?.extra?.url || media?.file || '');
        if (!url.startsWith('http'))
            return Buffer.alloc(0);
        const res = await fetch(url);
        return Buffer.from(await res.arrayBuffer());
    }
    async getBotName() {
        return this.discord.user?.username || this.name || '';
    }
    async setBotName(name) {
        await this.discord.user?.setUsername(String(name).slice(0, 32));
        this.name = name;
    }
    async getBotDescription() {
        return '';
    }
    async setBotDescription(_description) { }
    async getBotProfile() {
        const url = await this.getBotProfileUrl();
        if (!url)
            return Buffer.alloc(0);
        const res = await fetch(url);
        return Buffer.from(await res.arrayBuffer());
    }
    async getBotProfileUrl() {
        return this.discord.user?.displayAvatarURL({ size: 512 }) || this.profileUrl || '';
    }
    async setBotProfile(image) {
        await this.discord.user?.setAvatar(image);
    }
    async setBotActivity(text, type = 'playing', status = 'online') {
        const actType = ACTIVITY_TYPES[String(type || 'playing').toLowerCase()] ?? discord_js_1.ActivityType.Playing;
        this.discord.user?.setPresence({
            status,
            activities: text ? [{ name: String(text).slice(0, 128), type: actType }] : [],
        });
    }
    async getChat(chat) {
        const ch = await this.discord.channels.fetch(String(chat.id)).catch(() => null);
        if (!ch)
            return null;
        return this.toRompotChat(ch, ch.guild);
    }
    async updateChat(_chat) { }
    async removeChat(chat) { await this.deleteGuildChannel(String(chat.id)); }
    async addUserInChat(_chat, _user) { }
    async removeUserInChat(chat, user) { await this.kickMember(String(chat.id), String(user.id)); }
    async promoteUserInChat(_chat, _user) { }
    async demoteUserInChat(_chat, _user) { }
    async changeChatStatus(chat, status) {
        if (status === ChatStatus_1.default.Typing) {
            const ch = await this.fetchSendableChannel(String(chat.id)).catch(() => null);
            await ch?.sendTyping?.();
        }
    }
    async createChat(_chat) { }
    async leaveChat(chat) {
        const guild = await this.discord.guilds.fetch(String(chat.id)).catch(() => null);
        await guild?.leave();
    }
    async getChatName(chat) {
        const ch = await this.discord.channels.fetch(String(chat.id)).catch(() => null);
        return String(ch?.name || ch?.guild?.name || '');
    }
    async setChatName(chat, name) {
        const ch = await this.discord.channels.fetch(String(chat.id)).catch(() => null);
        if (ch?.setName)
            await ch.setName(String(name).slice(0, 100));
    }
    async getChatDescription(chat) {
        const ch = await this.discord.channels.fetch(String(chat.id)).catch(() => null);
        return String(ch?.topic || '');
    }
    async setChatDescription(chat, description) {
        await this.setChannelTopic(String(chat.id), description);
    }
    async getChatProfile(chat) {
        const url = await this.getChatProfileUrl(chat);
        if (!url)
            return Buffer.alloc(0);
        const res = await fetch(url);
        return Buffer.from(await res.arrayBuffer());
    }
    async getChatProfileUrl(chat) {
        const ch = await this.discord.channels.fetch(String(chat.id)).catch(() => null);
        if (ch?.guild?.iconURL)
            return ch.guild.iconURL({ size: 512 }) || '';
        const guild = await this.discord.guilds.fetch(String(chat.id)).catch(() => null);
        return guild?.iconURL({ size: 512 }) || '';
    }
    async setChatProfile(_chat, _profile) { }
    async getChatUsers(chat) {
        const ch = await this.discord.channels.fetch(String(chat.id)).catch(() => null);
        const guild = ch?.guild || await this.discord.guilds.fetch(String(chat.id)).catch(() => null);
        if (!guild)
            return [];
        const members = await guild.members.fetch().catch(() => guild.members.cache);
        return Array.from(members.keys()).map(String);
    }
    async getChatAdmins(chat) {
        const ch = await this.discord.channels.fetch(String(chat.id)).catch(() => null);
        const guild = ch?.guild || await this.discord.guilds.fetch(String(chat.id)).catch(() => null);
        if (!guild)
            return [];
        const members = await guild.members.fetch().catch(() => guild.members.cache);
        return Array.from(members.values())
            .filter((m) => m.permissions?.has(discord_js_1.PermissionFlagsBits.Administrator))
            .map((m) => String(m.id));
    }
    async getChatLeader(chat) {
        const ch = await this.discord.channels.fetch(String(chat.id)).catch(() => null);
        const guild = ch?.guild || await this.discord.guilds.fetch(String(chat.id)).catch(() => null);
        return String(guild?.ownerId || '');
    }
    async getChats() {
        return Array.from(this.discord.channels.cache.keys()).map(String);
    }
    async setChats(_chats) { }
    async joinChat(_code) { }
    async getChatInvite(chat) {
        const ch = await this.discord.channels.fetch(String(chat.id)).catch(() => null);
        if (!ch?.createInvite)
            return '';
        const invite = await ch.createInvite({ maxAge: 0, maxUses: 0 });
        return invite?.url || '';
    }
    async revokeChatInvite(_chat) { return ''; }
    async rejectCall(_call) { }
    async getUser(user) {
        const dUser = await this.discord.users.fetch(String(user.id)).catch(() => null);
        if (!dUser)
            return null;
        return this.toRompotUser(dUser);
    }
    async updateUser(_user) { }
    async removeUser(_user) { }
    async getUserName(user) {
        const u = await this.getUser(user);
        return u?.name || '';
    }
    async setUserName(_user, _name) { }
    async getUserDescription(_user) { return ''; }
    async setUserDescription(_user, _description) { }
    async getUserProfile(user) {
        const url = await this.getUserProfileUrl(user);
        if (!url)
            return Buffer.alloc(0);
        const res = await fetch(url);
        return Buffer.from(await res.arrayBuffer());
    }
    async getUserProfileUrl(user) {
        const dUser = await this.discord.users.fetch(String(user.id)).catch(() => null);
        return dUser?.displayAvatarURL({ size: 512 }) || '';
    }
    async setUserProfile(_user, _profile) { }
    async unblockUser(_user) { }
    async blockUser(_user) { }
    async getUsers() {
        return Array.from(this.discord.users.cache.keys()).map(String);
    }
    async setUsers(_users) { }
    // ==================== DISCORD NATIVE EXTENSIONS ====================
    async replyInteraction(interactionId, contentOrPayload, ephemeral = false) {
        const stored = this.interactions.get(String(interactionId))?.interaction;
        if (!stored)
            throw new Error('Interação Discord não encontrada ou expirada.');
        this.answeredInteractions.add(String(interactionId));
        const payload = typeof contentOrPayload === 'string'
            ? { content: contentOrPayload }
            : buildDiscordPayload(contentOrPayload);
        if (ephemeral)
            payload.flags = discord_js_1.MessageFlags.Ephemeral;
        if (stored.replied || stored.deferred) {
            return await stored.followUp(payload).catch(() => stored.editReply(payload));
        }
        return await stored.reply(payload);
    }
    async deferInteraction(interactionId, ephemeral = false) {
        const stored = this.interactions.get(String(interactionId))?.interaction;
        if (!stored || stored.replied || stored.deferred)
            return;
        this.answeredInteractions.add(String(interactionId));
        if (typeof stored.deferReply === 'function') {
            await stored.deferReply(ephemeral ? { flags: discord_js_1.MessageFlags.Ephemeral } : undefined);
        }
        else if (typeof stored.deferUpdate === 'function') {
            await stored.deferUpdate();
        }
    }
    async showDiscordModal(interactionId, modalSpec) {
        const stored = this.interactions.get(String(interactionId))?.interaction;
        if (!stored || typeof stored.showModal !== 'function') {
            throw new Error('$show_modal: esta interação não suporta abrir um modal (ou já foi respondida).');
        }
        this.answeredInteractions.add(String(interactionId));
        const modal = new discord_js_1.ModalBuilder()
            .setCustomId(String(modalSpec.id || 'modal').slice(0, 100))
            .setTitle(String(modalSpec.title || 'Formulário').slice(0, 45));
        for (const input of (modalSpec.inputs || []).slice(0, 5)) {
            const style = String(input.style || 'short').toLowerCase() === 'paragraph'
                ? discord_js_1.TextInputStyle.Paragraph
                : discord_js_1.TextInputStyle.Short;
            const field = new discord_js_1.TextInputBuilder()
                .setCustomId(String(input.id).slice(0, 100))
                .setLabel(String(input.label).slice(0, 45))
                .setStyle(style)
                .setRequired(input.required !== false);
            if (input.placeholder)
                field.setPlaceholder(String(input.placeholder).slice(0, 100));
            if (input.value)
                field.setValue(String(input.value).slice(0, 4000));
            if (input.minLength !== undefined)
                field.setMinLength(Number(input.minLength));
            if (input.maxLength !== undefined)
                field.setMaxLength(Number(input.maxLength));
            modal.addComponents(new discord_js_1.ActionRowBuilder().addComponents(field));
        }
        await stored.showModal(modal);
    }
    async registerSlashCommands(commands, guildId) {
        if (!this.discord.application)
            throw new Error('Aplicação Discord não inicializada.');
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
    async resolveGuild(guildOrChannelId) {
        const id = String(guildOrChannelId || '').trim();
        const direct = await this.discord.guilds.fetch(id).catch(() => null);
        if (direct)
            return direct;
        const ch = await this.discord.channels.fetch(id).catch(() => null);
        if (ch?.guild)
            return ch.guild;
        throw new Error(`Servidor Discord não encontrado para ID ${id}`);
    }
    async addRoleToUser(guildOrChannelId, userId, roleId) {
        const guild = await this.resolveGuild(guildOrChannelId);
        const member = await guild.members.fetch(String(userId));
        await member.roles.add(String(roleId));
    }
    async removeRoleFromUser(guildOrChannelId, userId, roleId) {
        const guild = await this.resolveGuild(guildOrChannelId);
        const member = await guild.members.fetch(String(userId));
        await member.roles.remove(String(roleId));
    }
    async userHasRole(guildOrChannelId, userId, roleId) {
        const guild = await this.resolveGuild(guildOrChannelId);
        const member = await guild.members.fetch(String(userId));
        return member.roles.cache.has(String(roleId));
    }
    async getMemberRoles(guildOrChannelId, userId) {
        const guild = await this.resolveGuild(guildOrChannelId);
        const member = await guild.members.fetch(String(userId));
        return Array.from(member.roles.cache.keys()).map(String);
    }
    async createGuildRole(guildOrChannelId, name, color, hoist, mentionable) {
        const guild = await this.resolveGuild(guildOrChannelId);
        const role = await guild.roles.create({
            name: String(name),
            ...(color ? { color } : {}),
            ...(hoist !== undefined ? { hoist: Boolean(hoist) } : {}),
            ...(mentionable !== undefined ? { mentionable: Boolean(mentionable) } : {}),
        });
        return String(role.id);
    }
    async deleteGuildRole(guildOrChannelId, roleId) {
        const guild = await this.resolveGuild(guildOrChannelId);
        const role = await guild.roles.fetch(String(roleId));
        if (role)
            await role.delete();
    }
    async userHasPermission(guildOrChannelId, userId, permission) {
        const guild = await this.resolveGuild(guildOrChannelId);
        const member = await guild.members.fetch(String(userId));
        return member.permissions.has(permission);
    }
    async timeoutMember(guildOrChannelId, userId, seconds, reason) {
        const guild = await this.resolveGuild(guildOrChannelId);
        const member = await guild.members.fetch(String(userId));
        await member.timeout(seconds > 0 ? seconds * 1000 : null, reason);
    }
    async kickMember(guildOrChannelId, userId, reason) {
        const guild = await this.resolveGuild(guildOrChannelId);
        const member = await guild.members.fetch(String(userId));
        await member.kick(reason);
    }
    async banGuildMember(guildOrChannelId, userId, deleteMessageSeconds, reason) {
        const guild = await this.resolveGuild(guildOrChannelId);
        await guild.members.ban(String(userId), {
            ...(deleteMessageSeconds ? { deleteMessageSeconds } : {}),
            ...(reason ? { reason } : {}),
        });
    }
    async unbanGuildMember(guildOrChannelId, userId) {
        const guild = await this.resolveGuild(guildOrChannelId);
        await guild.members.unban(String(userId));
    }
    async setMemberNickname(guildOrChannelId, userId, nickname) {
        const guild = await this.resolveGuild(guildOrChannelId);
        const member = await guild.members.fetch(String(userId));
        await member.setNickname(nickname || null);
    }
    async purgeMessages(channelId, count) {
        const ch = await this.discord.channels.fetch(String(channelId));
        if (!ch?.bulkDelete)
            throw new Error('Este canal não suporta limpeza em lote ($purge_messages).');
        const deleted = await ch.bulkDelete(Math.min(100, Math.max(1, Math.floor(count))), true);
        return Number(deleted?.size ?? 0);
    }
    async createGuildChannel(guildOrChannelId, name, type = 'text', parentId) {
        const guild = await this.resolveGuild(guildOrChannelId);
        const typeMap = {
            text: discord_js_1.ChannelType.GuildText,
            voice: discord_js_1.ChannelType.GuildVoice,
            category: discord_js_1.ChannelType.GuildCategory,
            forum: discord_js_1.ChannelType.GuildForum,
            announcement: discord_js_1.ChannelType.GuildAnnouncement,
        };
        const created = await guild.channels.create({
            name: String(name).slice(0, 100),
            type: typeMap[String(type).toLowerCase()] ?? discord_js_1.ChannelType.GuildText,
            ...(parentId ? { parent: String(parentId) } : {}),
        });
        return String(created.id);
    }
    async deleteGuildChannel(channelId) {
        const ch = await this.discord.channels.fetch(String(channelId)).catch(() => null);
        if (ch?.delete)
            await ch.delete();
    }
    async setChannelTopic(channelId, topic) {
        const ch = await this.discord.channels.fetch(String(channelId));
        if (ch?.setTopic)
            await ch.setTopic(String(topic));
    }
    async setChannelSlowmode(channelId, seconds) {
        const ch = await this.discord.channels.fetch(String(channelId));
        if (ch?.setRateLimitPerUser)
            await ch.setRateLimitPerUser(Math.max(0, Math.min(21600, Math.floor(seconds))));
    }
    async setChannelPermission(channelId, targetId, allow, permission) {
        const ch = await this.discord.channels.fetch(String(channelId));
        if (!ch?.permissionOverwrites)
            throw new Error('Canal não suporta alteração de permissões.');
        await ch.permissionOverwrites.edit(String(targetId), { [permission]: allow });
    }
    async createThread(channelOrMessageId, name, messageId, autoArchiveMinutes = 1440) {
        const ch = await this.discord.channels.fetch(String(channelOrMessageId));
        if (messageId && ch?.messages) {
            const msg = await ch.messages.fetch(String(messageId));
            const thread = await msg.startThread({ name: String(name).slice(0, 100), autoArchiveDuration: autoArchiveMinutes });
            return String(thread.id);
        }
        const thread = await ch.threads.create({ name: String(name).slice(0, 100), autoArchiveDuration: autoArchiveMinutes });
        return String(thread.id);
    }
    async archiveThread(threadId, archived = true) {
        const th = await this.discord.channels.fetch(String(threadId));
        if (th?.setArchived)
            await th.setArchived(archived);
    }
    async lockThread(threadId, locked = true) {
        const th = await this.discord.channels.fetch(String(threadId));
        if (th?.setLocked)
            await th.setLocked(locked);
    }
    async sendDiscordWebhook(url, contentOrEmbed, username, avatarURL) {
        const webhook = new discord_js_1.WebhookClient({ url: String(url) });
        const payload = typeof contentOrEmbed === 'string'
            ? { content: contentOrEmbed }
            : buildDiscordPayload(contentOrEmbed);
        return await webhook.send({
            ...payload,
            ...(username ? { username: String(username) } : {}),
            ...(avatarURL ? { avatarURL: String(avatarURL) } : {}),
        });
    }
    async moveVoiceMember(guildOrChannelId, userId, voiceChannelId) {
        const guild = await this.resolveGuild(guildOrChannelId);
        const member = await guild.members.fetch(String(userId));
        await member.voice.setChannel(voiceChannelId ? String(voiceChannelId) : null);
    }
    async muteVoiceMember(guildOrChannelId, userId, muted = true) {
        const guild = await this.resolveGuild(guildOrChannelId);
        const member = await guild.members.fetch(String(userId));
        await member.voice.setMute(muted);
    }
    async deafenVoiceMember(guildOrChannelId, userId, deafened = true) {
        const guild = await this.resolveGuild(guildOrChannelId);
        const member = await guild.members.fetch(String(userId));
        await member.voice.setDeaf(deafened);
    }
    async disconnectVoiceMember(guildOrChannelId, userId) {
        await this.moveVoiceMember(guildOrChannelId, userId, '');
    }
}
exports.default = DiscordBot;
//# sourceMappingURL=DiscordBot.js.map