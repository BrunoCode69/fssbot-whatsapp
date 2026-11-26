import { GatewayIntentBits } from 'discord.js';
export type DiscordIntentKey = 'Guilds' | 'GuildMembers' | 'GuildModeration' | 'GuildEmojisAndStickers' | 'GuildIntegrations' | 'GuildWebhooks' | 'GuildInvites' | 'GuildVoiceStates' | 'GuildPresences' | 'GuildMessages' | 'GuildMessageReactions' | 'GuildMessageTyping' | 'DirectMessages' | 'DirectMessageReactions' | 'DirectMessageTyping' | 'MessageContent' | 'GuildScheduledEvents' | 'AutoModerationConfiguration' | 'AutoModerationExecution';
export declare const DISCORD_INTENT_MAP: Record<DiscordIntentKey, GatewayIntentBits>;
export declare const DEFAULT_DISCORD_INTENTS: DiscordIntentKey[];
export declare const PRIVILEGED_DISCORD_INTENTS: Set<DiscordIntentKey>;
/**
 * Converte nomes de intents (ex: ['Guilds', 'MessageContent']) ou bitmask num array de GatewayIntentBits.
 */
export declare function resolveDiscordIntents(input?: string[] | number | null): GatewayIntentBits[];
