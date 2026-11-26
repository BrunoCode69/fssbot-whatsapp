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
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveDiscordIntents = exports.PRIVILEGED_DISCORD_INTENTS = exports.DISCORD_INTENT_MAP = exports.DEFAULT_DISCORD_INTENTS = exports.toDiscordEmbed = exports.buildDiscordPayload = exports.DiscordBot = void 0;
const DiscordBot_1 = __importStar(require("./DiscordBot"));
exports.DiscordBot = DiscordBot_1.default;
Object.defineProperty(exports, "buildDiscordPayload", { enumerable: true, get: function () { return DiscordBot_1.buildDiscordPayload; } });
Object.defineProperty(exports, "toDiscordEmbed", { enumerable: true, get: function () { return DiscordBot_1.toDiscordEmbed; } });
const DiscordIntents_1 = require("./DiscordIntents");
Object.defineProperty(exports, "DEFAULT_DISCORD_INTENTS", { enumerable: true, get: function () { return DiscordIntents_1.DEFAULT_DISCORD_INTENTS; } });
Object.defineProperty(exports, "DISCORD_INTENT_MAP", { enumerable: true, get: function () { return DiscordIntents_1.DISCORD_INTENT_MAP; } });
Object.defineProperty(exports, "PRIVILEGED_DISCORD_INTENTS", { enumerable: true, get: function () { return DiscordIntents_1.PRIVILEGED_DISCORD_INTENTS; } });
Object.defineProperty(exports, "resolveDiscordIntents", { enumerable: true, get: function () { return DiscordIntents_1.resolveDiscordIntents; } });
//# sourceMappingURL=index.js.map