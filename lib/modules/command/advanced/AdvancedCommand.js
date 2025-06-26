"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const MessageUtils_1 = require("../../../utils/MessageUtils");
const nonce_1 = __importDefault(require("../../../utils/nonce"));
class AdvancedCommand {
    constructor(data) {
        this.id = (0, nonce_1.default)();
        this.initialContext = {};
        this.tasks = {};
        this.options = {};
        if (data === null || data === void 0 ? void 0 : data.context) {
            Object.assign(this.initialContext, data.context);
        }
        this.injectContext(data);
    }
    injectContext(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Data must be an object');
        }
        if (data.controller) {
            this.controller = data.controller;
        }
        if (data.options) {
            this.options = { ...this.options, ...data.options };
        }
        if (data.initialContext) {
            this.initialContext = { ...this.initialContext, ...data.initialContext };
        }
        if (data.tasks) {
            this.tasks = { ...this.tasks, ...data.tasks };
        }
        if (data.id) {
            this.id = data.id;
        }
        this.clientId = this.controller.clientId;
        this.initialContext.clientId = this.clientId;
        this.initialContext.commandId = this.id;
        if (this.initialContext.message) {
            this.initialContext.message = (0, MessageUtils_1.getMessageFromJSON)(this.initialContext.message);
            this.initialContext.message.clientId = this.clientId;
        }
    }
    async saveContext(nowContext, data) {
        const context = { ...nowContext, ...data };
        await this.controller.saveContext(this, context);
    }
    addTask(id, task) {
        this.tasks[id] = task;
    }
    async start(options) {
        var _a;
        const taskId = options.taskId ||
            ((_a = options.context) === null || _a === void 0 ? void 0 : _a.taskId) ||
            Object.keys(this.tasks).shift() ||
            '';
        const context = (await this.controller.getContext(this, options.chatId)) ||
            this.initialContext;
        if (options.context && typeof options.context === 'object') {
            Object.assign(context, options.context);
        }
        if (taskId) {
            context.taskId = taskId;
        }
        context.isRun = true;
        context.commandId = this.id;
        context.chatId = options.chatId;
        context.clientId = this.clientId;
        const task = this.tasks[taskId];
        if (!task) {
            throw new Error('Task not found');
        }
        await this.saveContext(context);
        const saveTaskContext = async (data) => {
            await this.saveContext(context, data);
        };
        const nextTask = async (options) => {
            if ((options === null || options === void 0 ? void 0 : options.context) && typeof options.context === 'object') {
                Object.assign(context, options.context);
            }
            if (options === null || options === void 0 ? void 0 : options.taskId) {
                context.taskId = options.taskId;
            }
            await this.next(context, options);
        };
        const stopTask = async (options) => {
            await this.stop(context, options);
        };
        const job = {
            context,
            saveTaskContext,
            nextTask,
            stopTask,
        };
        task(job);
    }
    async next(nowContext, options) {
        let taskId = options === null || options === void 0 ? void 0 : options.taskId;
        if (!taskId) {
            const nowTaskIndex = Object.keys(this.tasks).findIndex((t) => t === nowContext.taskId);
            if (nowTaskIndex === -1) {
                throw new Error('Task not found');
            }
            const newTaskId = Object.keys(this.tasks)[nowTaskIndex + 1];
            // Stop command, no many tasks
            if (!newTaskId)
                return;
            taskId = newTaskId;
        }
        const context = { ...nowContext };
        if ((options === null || options === void 0 ? void 0 : options.context) && typeof options.context === 'object') {
            Object.assign(context, options.context);
        }
        const chatId = context.chatId;
        const startOptions = {
            chatId,
            taskId,
            context,
        };
        await this.controller.execCommand(this.id, nowContext.message, startOptions);
    }
    async stop(nowContext, options) {
        if ((options === null || options === void 0 ? void 0 : options.noRemove) === true)
            return;
        await this.controller.clearContext(this, nowContext.chatId);
    }
}
exports.default = AdvancedCommand;
//# sourceMappingURL=AdvancedCommand.js.map