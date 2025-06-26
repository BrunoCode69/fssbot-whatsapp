"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Command_1 = require("./Command");
class CommandPermission {
    constructor(id, isPermited = false) {
        this.id = id;
        this.isPermited = isPermited;
    }
    static async check(message, cmdPerm) {
        if (cmdPerm.id == Command_1.CMDPerms.ChatPv) {
            return message.chat.type == "pv";
        }
        if (cmdPerm.id == Command_1.CMDPerms.ChatGroup) {
            return message.chat.type == "group";
        }
        if (cmdPerm.id == Command_1.CMDPerms.BotChatLeader) {
            return await message.chat.isLeader(message.botId);
        }
        if (cmdPerm.id == Command_1.CMDPerms.BotChatAdmin) {
            return await message.chat.isAdmin(message.botId);
        }
        if (cmdPerm.id == Command_1.CMDPerms.BotChatLeader) {
            return await message.chat.isLeader(message.botId);
        }
        if (cmdPerm.id == Command_1.CMDPerms.UserChatAdmin) {
            return await message.chat.isAdmin(message.user.id);
        }
        if (cmdPerm.id == Command_1.CMDPerms.UserChatLeader) {
            return await message.chat.isLeader(message.user.id);
        }
        return true;
    }
}
exports.default = CommandPermission;
//# sourceMappingURL=CommandPermission.js.map