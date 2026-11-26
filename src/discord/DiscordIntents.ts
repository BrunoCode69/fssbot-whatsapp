import { GatewayIntentBits } from 'discord.js';

export type DiscordIntentKey =
  | 'Guilds'
  | 'GuildMembers'
  | 'GuildModeration'
  | 'GuildEmojisAndStickers'
  | 'GuildExpressions'
  | 'GuildIntegrations'
  | 'GuildWebhooks'
  | 'GuildInvites'
  | 'GuildVoiceStates'
  | 'GuildPresences'
  | 'GuildMessages'
  | 'GuildMessageReactions'
  | 'GuildMessageTyping'
  | 'DirectMessages'
  | 'DirectMessageReactions'
  | 'DirectMessageTyping'
  | 'MessageContent'
  | 'GuildScheduledEvents'
  | 'AutoModerationConfiguration'
  | 'AutoModerationExecution'
  | 'GuildMessagePolls'
  | 'DirectMessagePolls';

export const DISCORD_INTENT_MAP: Record<DiscordIntentKey, GatewayIntentBits> = {
  Guilds: GatewayIntentBits.Guilds,
  GuildMembers: GatewayIntentBits.GuildMembers,
  GuildModeration: GatewayIntentBits.GuildModeration,
  GuildEmojisAndStickers: GatewayIntentBits.GuildEmojisAndStickers,
  GuildExpressions: (GatewayIntentBits as any).GuildExpressions ?? GatewayIntentBits.GuildEmojisAndStickers,
  GuildIntegrations: GatewayIntentBits.GuildIntegrations,
  GuildWebhooks: GatewayIntentBits.GuildWebhooks,
  GuildInvites: GatewayIntentBits.GuildInvites,
  GuildVoiceStates: GatewayIntentBits.GuildVoiceStates,
  GuildPresences: GatewayIntentBits.GuildPresences,
  GuildMessages: GatewayIntentBits.GuildMessages,
  GuildMessageReactions: GatewayIntentBits.GuildMessageReactions,
  GuildMessageTyping: GatewayIntentBits.GuildMessageTyping,
  DirectMessages: GatewayIntentBits.DirectMessages,
  DirectMessageReactions: GatewayIntentBits.DirectMessageReactions,
  DirectMessageTyping: GatewayIntentBits.DirectMessageTyping,
  MessageContent: GatewayIntentBits.MessageContent,
  GuildScheduledEvents: GatewayIntentBits.GuildScheduledEvents,
  AutoModerationConfiguration: GatewayIntentBits.AutoModerationConfiguration,
  AutoModerationExecution: GatewayIntentBits.AutoModerationExecution,
  GuildMessagePolls: GatewayIntentBits.GuildMessagePolls,
  DirectMessagePolls: GatewayIntentBits.DirectMessagePolls,
};

export const DEFAULT_DISCORD_INTENTS: DiscordIntentKey[] = [
  'Guilds',
  'GuildMessages',
  'DirectMessages',
  'MessageContent',
  'GuildMembers',
  'GuildMessageReactions',
  'GuildVoiceStates',
];

export const PRIVILEGED_DISCORD_INTENTS = new Set<DiscordIntentKey>([
  'GuildMembers',
  'GuildPresences',
  'MessageContent',
]);

/**
 * Converte nomes de intents (ex: ['Guilds', 'MessageContent']) ou bitmask num array de GatewayIntentBits.
 */
export function resolveDiscordIntents(input?: string[] | number | null): GatewayIntentBits[] {
  if (typeof input === 'number' && Number.isFinite(input) && input > 0) {
    const resolved = new Set<GatewayIntentBits>();
    for (const bit of Object.values(DISCORD_INTENT_MAP)) {
      if ((input & Number(bit)) === Number(bit)) {
        resolved.add(bit);
      }
    }
    return resolved.size > 0 ? Array.from(resolved) : DEFAULT_DISCORD_INTENTS.map((k) => DISCORD_INTENT_MAP[k]);
  }

  if (Array.isArray(input) && input.length > 0) {
    const out: GatewayIntentBits[] = [];
    for (const raw of input) {
      const key = String(raw || '').trim() as DiscordIntentKey;
      const bit = DISCORD_INTENT_MAP[key];
      if (bit !== undefined && !out.includes(bit)) {
        out.push(bit);
      }
    }
    if (out.length > 0) return out;
  }

  return DEFAULT_DISCORD_INTENTS.map((key) => DISCORD_INTENT_MAP[key]);
}
