"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRIVILEGED_DISCORD_INTENTS = exports.DEFAULT_DISCORD_INTENTS = exports.DISCORD_INTENT_MAP = void 0;
exports.resolveDiscordIntents = resolveDiscordIntents;
const discord_js_1 = require("discord.js");
exports.DISCORD_INTENT_MAP = {
    Guilds: discord_js_1.GatewayIntentBits.Guilds,
    GuildMembers: discord_js_1.GatewayIntentBits.GuildMembers,
    GuildModeration: discord_js_1.GatewayIntentBits.GuildModeration,
    GuildEmojisAndStickers: discord_js_1.GatewayIntentBits.GuildEmojisAndStickers,
    GuildIntegrations: discord_js_1.GatewayIntentBits.GuildIntegrations,
    GuildWebhooks: discord_js_1.GatewayIntentBits.GuildWebhooks,
    GuildInvites: discord_js_1.GatewayIntentBits.GuildInvites,
    GuildVoiceStates: discord_js_1.GatewayIntentBits.GuildVoiceStates,
    GuildPresences: discord_js_1.GatewayIntentBits.GuildPresences,
    GuildMessages: discord_js_1.GatewayIntentBits.GuildMessages,
    GuildMessageReactions: discord_js_1.GatewayIntentBits.GuildMessageReactions,
    GuildMessageTyping: discord_js_1.GatewayIntentBits.GuildMessageTyping,
    DirectMessages: discord_js_1.GatewayIntentBits.DirectMessages,
    DirectMessageReactions: discord_js_1.GatewayIntentBits.DirectMessageReactions,
    DirectMessageTyping: discord_js_1.GatewayIntentBits.DirectMessageTyping,
    MessageContent: discord_js_1.GatewayIntentBits.MessageContent,
    GuildScheduledEvents: discord_js_1.GatewayIntentBits.GuildScheduledEvents,
    AutoModerationConfiguration: discord_js_1.GatewayIntentBits.AutoModerationConfiguration,
    AutoModerationExecution: discord_js_1.GatewayIntentBits.AutoModerationExecution,
};
exports.DEFAULT_DISCORD_INTENTS = [
    'Guilds',
    'GuildMessages',
    'DirectMessages',
    'MessageContent',
    'GuildMembers',
    'GuildMessageReactions',
    'GuildVoiceStates',
];
exports.PRIVILEGED_DISCORD_INTENTS = new Set([
    'GuildMembers',
    'GuildPresences',
    'MessageContent',
]);
/**
 * Converte nomes de intents (ex: ['Guilds', 'MessageContent']) ou bitmask num array de GatewayIntentBits.
 */
function resolveDiscordIntents(input) {
    if (typeof input === 'number' && Number.isFinite(input) && input > 0) {
        const resolved = [];
        for (const bit of Object.values(exports.DISCORD_INTENT_MAP)) {
            if ((input & Number(bit)) === Number(bit)) {
                resolved.push(bit);
            }
        }
        return resolved.length > 0 ? resolved : exports.DEFAULT_DISCORD_INTENTS.map((k) => exports.DISCORD_INTENT_MAP[k]);
    }
    if (Array.isArray(input) && input.length > 0) {
        const out = [];
        for (const raw of input) {
            const key = String(raw || '').trim();
            const bit = exports.DISCORD_INTENT_MAP[key];
            if (bit !== undefined && !out.includes(bit)) {
                out.push(bit);
            }
        }
        if (out.length > 0)
            return out;
    }
    return exports.DEFAULT_DISCORD_INTENTS.map((key) => exports.DISCORD_INTENT_MAP[key]);
}
//# sourceMappingURL=DiscordIntents.js.map