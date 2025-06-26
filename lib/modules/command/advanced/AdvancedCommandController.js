"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_cache_1 = __importDefault(require("node-cache"));
const AdvancedCommand_1 = __importDefault(require("./AdvancedCommand"));
class AdvancedCommandController {
    constructor(clientId) {
        this.commands = {};
        this.clientId = clientId;
        this.cache = new node_cache_1.default({
            useClones: false,
            stdTTL: 3600,
            checkperiod: 3600,
        });
    }
    prepareCommand(command) {
        command.clientId = this.clientId;
        command.controller = this;
        command.initialContext.commandId = command.id;
        if (command.initialContext.message) {
            command.initialContext.message.clientId = this.clientId;
        }
        return command;
    }
    createCommand(commandData) {
        const command = new AdvancedCommand_1.default({
            ...commandData,
            controller: this,
        });
        this.addCommand(command);
        return command;
    }
    setCommands(...commands) {
        this.commands = {};
        for (const command of commands) {
            this.addCommand(command);
        }
    }
    addCommand(command) {
        if (!command)
            throw new Error('Command is required');
        if (!command.id)
            throw new Error('Command id is required');
        this.commands[command.id] = this.prepareCommand(command);
    }
    addCommands(...commands) {
        for (const command of commands) {
            this.addCommand(command);
        }
    }
    removeCommand(command) {
        const id = typeof command === 'string' ? command : command === null || command === void 0 ? void 0 : command.id;
        if (!id)
            throw new Error('Command id is required');
        if (!this.commands[id])
            return false;
        delete this.commands[id];
        return true;
    }
    removeCommands(...commands) {
        for (const command of commands) {
            this.removeCommand(command);
        }
    }
    getCommand(id) {
        if (!this.commands[id])
            return undefined;
        return this.prepareCommand(this.commands[id]);
    }
    getCommands() {
        return Object.values(this.commands);
    }
    hasCommand(id) {
        return !!this.commands[id];
    }
    async execCommand(commandId, message, options = {}) {
        const command = this.getCommand(commandId);
        if (!command)
            throw new Error('Command not found');
        const chatId = message.chat.id;
        const data = await this.getContext(command, chatId);
        const startOptions = {
            chatId,
            context: { ...command.initialContext, chatId },
            taskId: command.initialContext.taskId ||
                Object.keys(command.tasks).shift() ||
                '',
        };
        if (data) {
            Object.assign(startOptions.context, data);
        }
        if (options.context) {
            Object.assign(startOptions.context, options.context);
        }
        startOptions.context.message = message;
        if (options.taskId) {
            startOptions.taskId = options.taskId;
            startOptions.context.taskId = options.taskId;
        }
        await command.start(startOptions);
    }
    saveContext(command, context) {
        this.cache.set(this.getCacheKey(command.id, context.chatId), context);
    }
    clearContext(command, chatId) {
        this.cache.del(this.getCacheKey(command.id, chatId));
    }
    getContext(command, chatId) {
        return this.cache.get(this.getCacheKey(command.id, chatId));
    }
    getCacheKey(commandId, chatId) {
        return `bot-${this.clientId}-advanced-command-${commandId}-in-${chatId}`;
    }
}
exports.default = AdvancedCommandController;
//# sourceMappingURL=AdvancedCommandController.js.map