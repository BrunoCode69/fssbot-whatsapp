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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalRompotCluster = void 0;
const fs_1 = require("fs");
const Defaults_1 = require("../configs/Defaults");
const Message_1 = __importStar(require("../messages/Message"));
const ReactionMessage_1 = __importDefault(require("../messages/ReactionMessage"));
const ErrorMessage_1 = __importDefault(require("../messages/ErrorMessage"));
const ChatStatus_1 = __importDefault(require("../modules/chat/ChatStatus"));
const Chat_1 = __importDefault(require("../modules/chat/Chat"));
const User_1 = __importDefault(require("../modules/user/User"));
const CommandEnums_1 = require("../modules/command/CommandEnums");
const CommandController_1 = __importDefault(require("../modules/command/CommandController"));
const AdvancedCommandController_1 = __importDefault(require("../modules/command/advanced/AdvancedCommandController"));
const QuickResponseController_1 = __importDefault(require("../modules/quickResponse/QuickResponseController"));
const QuickResponse_1 = __importDefault(require("../modules/quickResponse/QuickResponse"));
const ClientEvents_1 = __importDefault(require("../client/ClientEvents"));
const ClientFunctionHandler_1 = __importDefault(require("../client/ClientFunctionHandler"));
const WorkerMessage_1 = __importStar(require("./WorkerMessage"));
const BotStatus_1 = require("../bot/BotStatus");
const BotBase_1 = __importDefault(require("../bot/BotBase"));
const MessageHandler_1 = __importDefault(require("../utils/MessageHandler"));
const Generic_1 = require("../utils/Generic");
const MessageUtils_1 = require("../utils/MessageUtils");
const Call_1 = __importDefault(require("../models/Call"));
const ChatNotDefinedError_1 = __importDefault(require("../errors/ChatNotDefinedError"));
/** ID dos dados globais do cluster gerenciado pelo Rompot */
exports.GlobalRompotCluster = 'rompot-client-cluster';
class ClientCluster extends ClientEvents_1.default {
    constructor(id, worker, config = {}, isMain = false) {
        super();
        /** Tratador de mensagens */
        this.messageHandler = new MessageHandler_1.default();
        /** Controlador de comandos  */
        this.commandController = new CommandController_1.default();
        this.quickResponseController = new QuickResponseController_1.default();
        /** Bot */
        this.bot = new BotBase_1.default();
        /** Vezes que o bot reconectou */
        this.reconnectTimes = 0;
        /** Autenticação do bot */
        this.auth = './session';
        /** Requisições */
        this.requests = {};
        /** Tratador de funções */
        this.funcHandler = new ClientFunctionHandler_1.default(this, {
            bot: [],
            chat: [],
            user: [],
            message: [],
            sendMessage: [],
            sendMediaMessage: [],
            downloadMedia: [],
        });
        this.id = id;
        this.worker = worker;
        this.isMain = isMain;
        this.config = {
            ...Defaults_1.DEFAULT_CONNECTION_CONFIG,
            maxTimeout: 60000,
            ...config,
        };
        this.setWorker(worker);
        this.advancedCommandController = new AdvancedCommandController_1.default(this.id);
        if (!isMain) {
            this.configEvents();
        }
        ClientCluster.saveClient(this);
    }
    setWorker(worker) {
        this.worker = worker;
        if (!global['default-rompot-worker'] && worker) {
            global['default-rompot-worker'] = worker;
        }
        this.worker.on('message', async (message) => {
            const workerMessage = WorkerMessage_1.default.fromJSON(message);
            try {
                if (workerMessage.uid != 'rompot')
                    return;
                if (workerMessage.clientId != this.id)
                    return;
                if (workerMessage.tag == WorkerMessage_1.WorkerMessageTag.Void)
                    return;
                if (workerMessage.isMain == this.isMain)
                    return;
                const data = workerMessage.getData();
                if (workerMessage.tag == WorkerMessage_1.WorkerMessageTag.Event) {
                    this.bot.emit(data.name || '', data.arg);
                }
                else if (workerMessage.tag == WorkerMessage_1.WorkerMessageTag.Patch) {
                    (0, Generic_1.injectJSON)(data, this, true);
                }
                else if (workerMessage.tag == WorkerMessage_1.WorkerMessageTag.Func) {
                    const clonedMessage = workerMessage.clone({
                        tag: WorkerMessage_1.WorkerMessageTag.Result,
                        data: { result: await this[data.name](...(data.args || [])) },
                    });
                    await this.sendWorkerMessage(clonedMessage);
                }
                else if (workerMessage.id in this.requests) {
                    this.requests[workerMessage.id](workerMessage);
                }
            }
            catch (error) {
                await this.sendWorkerMessage(workerMessage.clone({
                    tag: WorkerMessage_1.WorkerMessageTag.Error,
                    data: { reason: (error === null || error === void 0 ? void 0 : error.message) || 'Internal error' },
                }));
            }
        });
    }
    /**
     * * Gera um ID combase uma tag.
     * @param tag - Tag que será usada.
     * @returns ID gerado.
     */
    generateIdByTag(tag) {
        return `${tag}-${Date.now()}-${this.worker.process.pid}-${this.worker.id}-${Object.keys(this.requests).length}`;
    }
    /**
     * * Envia uma mensagem no worker.
     * @param tag - Tag da mensagem.
     * @param data - Data da mensagem.
     * @returns Mensagem de resposta do worker.
     */
    async sendWorkerMessage(workerMessage) {
        var _a;
        const id = workerMessage.id || this.generateIdByTag(workerMessage.tag);
        const message = await new Promise((resolve) => {
            try {
                this.requests[id] = resolve;
                workerMessage.apply({
                    uid: 'rompot',
                    clientId: this.id,
                    isMain: this.isMain,
                    id,
                });
                process.send(workerMessage.toJSON());
                if (workerMessage.isPrimary ||
                    workerMessage.tag == WorkerMessage_1.WorkerMessageTag.Event ||
                    workerMessage.tag == WorkerMessage_1.WorkerMessageTag.Patch ||
                    workerMessage.tag == WorkerMessage_1.WorkerMessageTag.Result ||
                    workerMessage.tag == WorkerMessage_1.WorkerMessageTag.Void ||
                    workerMessage.tag == WorkerMessage_1.WorkerMessageTag.Error) {
                    resolve(workerMessage.clone({
                        tag: WorkerMessage_1.WorkerMessageTag.Result,
                        data: { result: undefined },
                    }));
                }
                else if (workerMessage.autoCancel) {
                    setTimeout(() => {
                        if (!(id in this.requests))
                            return;
                        resolve(workerMessage.clone({
                            tag: WorkerMessage_1.WorkerMessageTag.Error,
                            data: { reason: 'Timeout' },
                        }));
                    }, this.config.maxTimeout);
                }
            }
            catch (error) {
                resolve(workerMessage.clone({
                    tag: WorkerMessage_1.WorkerMessageTag.Error,
                    data: { reason: (error === null || error === void 0 ? void 0 : error.message) || 'Internal error' },
                }));
            }
        });
        delete this.requests[id];
        if (message.tag == 'error') {
            throw new Error(((_a = message.data) === null || _a === void 0 ? void 0 : _a.reason) || 'Internal error');
        }
        return message;
    }
    /** Configura os eventos do cliente */
    configEvents() {
        this.bot.on('message', async (message) => {
            try {
                if (this.isMain) {
                    await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Event, {
                        name: 'message',
                        arg: message,
                    }));
                }
                else {
                    message = (0, MessageUtils_1.getMessageFromJSON)(message);
                    message.inject({ clientId: this.id, botId: this.bot.id });
                    if (!message.fromMe && !this.config.disableAutoRead) {
                        if (!message.isDeleted && !message.isUpdate) {
                            await message.read();
                        }
                    }
                    message.user = (await this.getUser(message.user)) || message.user;
                    message.chat = (await this.getChat(message.chat)) || message.chat;
                    if (!message.chat.timestamp ||
                        message.timestamp > message.chat.timestamp) {
                        message.chat.timestamp = message.timestamp;
                    }
                    if (message.mention) {
                        if (message.mention.chat.id != message.chat.id) {
                            message.mention.chat =
                                (await this.getChat(message.mention.chat)) ||
                                    message.mention.chat;
                        }
                        else {
                            message.mention.chat = message.chat;
                        }
                        if (message.mention.user.id != message.user.id) {
                            message.mention.user =
                                (await this.getUser(message.mention.user)) ||
                                    message.mention.user;
                        }
                        else {
                            message.mention.user = message.user;
                        }
                    }
                    if (this.messageHandler.resolveMessage(message))
                        return;
                    this.emit('message', message);
                    if (this.config.disableAutoCommand)
                        return;
                    if (this.config.disableAutoCommandForOldMessage && message.isOld)
                        return;
                    if (this.config.disableAutoCommandForUnofficialMessage &&
                        message.isUnofficial)
                        return;
                    await this.quickResponseController.searchAndExecute(message);
                    const command = this.searchCommand(message.text);
                    if (command != null) {
                        this.runCommand(command, message, CommandEnums_1.CMDRunType.Exec);
                    }
                }
            }
            catch (err) {
                this.emit('message', new ErrorMessage_1.default(message.chat, err));
            }
        });
        this.on('conn', async (update) => {
            try {
                if (this.isMain) {
                    await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Event, {
                        name: 'conn',
                        arg: update,
                    }));
                }
            }
            catch (err) {
                this.emit('error', (0, Generic_1.getError)(err));
            }
        });
        this.on('error', async (update) => {
            try {
                if (this.isMain) {
                    await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Event, {
                        name: 'error',
                        arg: update,
                    }));
                }
            }
            catch (err) {
                this.emit('error', (0, Generic_1.getError)(err));
            }
        });
        this.bot.on('open', async (update) => {
            try {
                if (this.isMain) {
                    await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Event, {
                        name: 'open',
                        arg: update,
                    }));
                }
                else {
                    this.reconnectTimes = 0;
                    this.emit('open', update);
                }
            }
            catch (err) {
                this.emit('error', (0, Generic_1.getError)(err));
            }
        });
        this.bot.on('reconnecting', async (update) => {
            try {
                if (this.isMain) {
                    await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Event, {
                        name: 'reconnecting',
                        arg: update,
                    }));
                }
                else {
                    this.emit('reconnecting', update);
                }
            }
            catch (err) {
                this.emit('error', (0, Generic_1.getError)(err));
            }
        });
        this.bot.on('connecting', async (update) => {
            try {
                if (this.isMain) {
                    await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Event, {
                        name: 'connecting',
                        arg: update,
                    }));
                }
                else {
                    this.emit('connecting', update);
                }
            }
            catch (err) {
                this.emit('error', (0, Generic_1.getError)(err));
            }
        });
        this.bot.on('close', async (update) => {
            try {
                if (this.isMain) {
                    await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Event, {
                        name: 'close',
                        arg: update,
                    }));
                }
                else {
                    this.emit('close', update);
                    if (this.reconnectTimes < this.config.maxReconnectTimes) {
                        this.reconnectTimes++;
                        await (0, Generic_1.sleep)(this.config.reconnectTimeout);
                        this.reconnect();
                    }
                }
            }
            catch (err) {
                this.emit('error', (0, Generic_1.getError)(err));
            }
        });
        this.bot.on('stop', async (update) => {
            try {
                if (this.isMain) {
                    await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Event, {
                        name: 'stop',
                        arg: update,
                    }));
                }
                else {
                    this.emit('stop', update);
                }
            }
            catch (err) {
                this.emit('error', (0, Generic_1.getError)(err));
            }
        });
        this.bot.on('qr', async (update) => {
            try {
                if (this.isMain) {
                    await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Event, {
                        name: 'qr',
                        arg: update,
                    }));
                }
                else {
                    this.emit('qr', update);
                }
            }
            catch (err) {
                this.emit('error', (0, Generic_1.getError)(err));
            }
        });
        this.bot.on('code', async (update) => {
            try {
                if (this.isMain) {
                    await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Event, {
                        name: 'code',
                        arg: update,
                    }));
                }
                else {
                    this.emit('code', update);
                }
            }
            catch (err) {
                this.emit('error', (0, Generic_1.getError)(err));
            }
        });
        this.bot.on('chat', async (update) => {
            try {
                if (this.isMain) {
                    await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Event, {
                        name: 'chat',
                        arg: update,
                    }));
                }
                else {
                    this.emit('chat', {
                        ...update,
                        chat: { ...update.chat, clientId: this.id, botId: this.bot.id },
                    });
                }
            }
            catch (err) {
                this.emit('error', (0, Generic_1.getError)(err));
            }
        });
        this.bot.on('user', async (update) => {
            try {
                if (this.isMain) {
                    await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Event, {
                        name: 'user',
                        arg: update,
                    }));
                }
                else {
                    this.emit('user', {
                        event: update.event,
                        action: update.action,
                        chat: Chat_1.default.apply(update.chat, {
                            clientId: this.id,
                            botId: this.bot.id,
                        }),
                        user: User_1.default.apply(update.user, {
                            clientId: this.id,
                            botId: this.bot.id,
                        }),
                        fromUser: User_1.default.apply(update.fromUser, {
                            clientId: this.id,
                            botId: this.bot.id,
                        }),
                    });
                }
            }
            catch (err) {
                this.emit('error', (0, Generic_1.getError)(err));
            }
        });
        this.bot.on('call', async (call) => {
            try {
                if (this.isMain) {
                    await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Event, {
                        name: 'call',
                        arg: call,
                    }));
                }
                else {
                    this.emit('call', Call_1.default.apply(call, { clientId: this.id, botId: this.bot.id }));
                }
            }
            catch (err) {
                this.emit('error', (0, Generic_1.getError)(err));
            }
        });
        this.bot.on('error', async (update) => {
            try {
                if (this.isMain) {
                    await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Event, {
                        name: 'error',
                        arg: update,
                    }));
                }
                else {
                    this.emit('error', (0, Generic_1.getError)(update));
                }
            }
            catch (err) {
                this.emit('error', (0, Generic_1.getError)(err));
            }
        });
    }
    /** Conectar bot
     * @param auth Autenticação do bot
     */
    async connect(auth) {
        if (this.isMain) {
            await this.bot.connect(typeof auth != 'string' || !auth ? this.auth : auth);
        }
        else {
            await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Func, { name: 'connect', args: [auth] }, false));
        }
    }
    /** Reconectar bot
     * @param alert Alerta que está reconectando
     */
    async reconnect(alert) {
        if (this.isMain) {
            await this.bot.reconnect(alert);
        }
        else {
            await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Func, { name: 'reconnect', args: [alert] }, false));
        }
    }
    /** Parar bot
     * @param reason Razão por parar bot
     */
    async stop(reason) {
        if (this.isMain) {
            await this.bot.stop(reason);
        }
        else {
            await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Func, {
                name: 'stop',
                args: [reason],
            }));
        }
    }
    /**
     * Desconecta o bot
     */
    async logout() {
        if (this.isMain) {
            await this.bot.logout();
        }
        else {
            await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Func, { name: 'logout', args: [] }));
        }
    }
    /**
     * * Aguarda um evento ser chamado.
     * @param eventName - Nome do evento que será aguardado.
     * @returns {Promise<ClientEventsMap[T]>} Argumento retornado do evento esperado.
     */
    async awaitEvent(eventName, maxTimeout) {
        return new Promise((res, rej) => {
            let timeout;
            if (maxTimeout) {
                timeout = setTimeout(() => {
                    rej('Wait event time out');
                }, maxTimeout);
            }
            const listener = (arg) => {
                if (timeout) {
                    clearTimeout(timeout);
                }
                this.ev.removeListener(eventName, listener);
                res(arg);
            };
            this.ev.on(eventName, listener);
        });
    }
    /**
     * * Aguarda a conexão for aberta.
     */
    async awaitConnectionOpen() {
        if (this.bot.status != BotStatus_1.BotStatus.Online) {
            await this.awaitEvent('open');
        }
    }
    /** @returns Controlador de comando do cliente */
    getCommandController() {
        if (this.commandController.clientId != this.id) {
            this.commandController.clientId = this.id;
        }
        if (this.commandController.botId != this.bot.id) {
            this.commandController.botId = this.bot.id;
        }
        return this.commandController;
    }
    /** Define o controlador de comando do cliente */
    setCommandController(controller) {
        controller.botId = this.bot.id;
        controller.clientId = this.id;
        this.commandController = controller;
    }
    /** Define os comandos do bot
     * @param commands Comandos que será injetado
     */
    setCommands(commands) {
        this.commandController.setCommands(commands);
    }
    /** @returns Retorna os comandos do bot */
    getCommands() {
        return this.commandController.getCommands();
    }
    /** Adiciona um comando na lista de comandos
     * @param command Comando que será adicionado
     */
    addCommand(command) {
        this.commandController.addCommand(command);
    }
    /** Remove um comando na lista de comandos
     * @param command Comando que será removido
     */
    removeCommand(command) {
        return this.commandController.removeCommand(command);
    }
    /**
     * Procura um comando no texto.
     * @param text - Texto que contem o comando.
     * */
    searchCommand(text) {
        const command = this.commandController.searchCommand(text);
        if (command == null)
            return null;
        command.clientId = this.id;
        command.botId = this.bot.id;
        return command;
    }
    /**
     * Execução do comando.
     * @param command - Comando que será executado.
     * @param message - Mensagem associada ao comando.
     */
    runCommand(command, message, type) {
        return this.commandController.runCommand(command, message, type);
    }
    setAdvancedCommandController(advancedCommandController) {
        advancedCommandController.clientId = this.id;
        this.advancedCommandController = advancedCommandController;
    }
    getAdvancedCommandController() {
        return this.advancedCommandController;
    }
    setAdvancedCommands(commands) {
        this.advancedCommandController.setCommands(...commands);
    }
    createAdvancedCommand(id, context) {
        return this.advancedCommandController.createCommand({ id, context });
    }
    getAdvancedCommands() {
        return this.advancedCommandController.getCommands();
    }
    addAdvancedCommand(command) {
        this.advancedCommandController.addCommand(command);
    }
    removeAdvancedCommand(command) {
        return this.advancedCommandController.removeCommand(command);
    }
    execAdvancedCommand(command, message) {
        if (typeof command == 'string') {
            const cmd = this.advancedCommandController.getCommand(command);
            if (!cmd) {
                throw new Error('Command not found');
            }
            command = cmd;
        }
        const options = {
            chatId: message.chat.id,
            context: {
                ...command.initialContext,
                chatId: message.chat.id,
                clientId: this.id,
            },
        };
        return this.advancedCommandController.execCommand(command.id, message, options);
    }
    addQuickResponse(content, reply, options) {
        if (content instanceof QuickResponse_1.default) {
            this.quickResponseController.add(content);
            return content;
        }
        //@ts-ignore
        const quickResponse = new QuickResponse_1.default(content, reply, options);
        this.quickResponseController.add(quickResponse);
        return quickResponse;
    }
    removeQuickResponse(quickResponse) {
        this.quickResponseController.remove(quickResponse);
    }
    /**
     * Deletar mensagem
     * @param message Mensagem que será deletada da sala de bate-papos
     */
    async deleteMessage(message) {
        if (this.isMain) {
            await this.bot.deleteMessage((0, MessageUtils_1.getMessageFromJSON)(message));
        }
        else {
            await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Func, {
                name: 'deleteMessage',
                args: [message],
            }));
        }
    }
    /** Remover mensagem
     * @param message Mensagem que será removida da sala de bate-papo
     */
    async removeMessage(message) {
        if (this.isMain) {
            await this.bot.readMessage((0, MessageUtils_1.getMessageFromJSON)(message));
        }
        else {
            await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Func, {
                name: 'removeMessage',
                args: [message],
            }));
        }
    }
    /** Marca uma mensagem como visualizada
     * @param message Mensagem que será visualizada
     */
    async readMessage(message) {
        if (this.isMain) {
            await this.bot.readMessage((0, MessageUtils_1.getMessageFromJSON)(message));
        }
        else {
            await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Func, {
                name: 'readMessage',
                args: [message],
            }));
            if (message.status == Message_1.MessageStatus.Sending ||
                message.status == Message_1.MessageStatus.Sended ||
                message.status == Message_1.MessageStatus.Received) {
                if (message.type == Message_1.MessageType.Audio) {
                    message.status = Message_1.MessageStatus.Played;
                }
                else {
                    message.status = Message_1.MessageStatus.Readed;
                }
            }
            if (message.timestamp == message.chat.timestamp) {
                message.chat.unreadCount = (message.chat.unreadCount || 0) - 1 || 0;
            }
        }
    }
    /** Edita o texto de uma mensagem enviada
     * @param message Mensagem que será editada
     * @param text Novo texto da mensagem
     */
    async editMessage(message, text) {
        if (this.isMain) {
            await this.bot.editMessage((0, MessageUtils_1.getMessageFromJSON)({ ...(message || {}), text, isEdited: true }));
        }
        else {
            message.text = text;
            message.isEdited = true;
            await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Func, {
                name: 'editMessage',
                args: [message, text],
            }));
        }
    }
    /** Adiciona uma reação na mensagem
     * @param message Mensagem
     * @param reaction Reação
     */
    async addReaction(message, reaction) {
        if (this.isMain) {
            message = (0, MessageUtils_1.getMessageFromJSON)(message);
            await this.bot.addReaction(new ReactionMessage_1.default(message.chat, reaction, message, {
                user: message.user,
            }));
        }
        else {
            await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Func, {
                name: 'addReaction',
                args: [message, reaction],
            }));
        }
    }
    /** Remove a reação da mensagem
     * @param message Mensagem que terá sua reação removida
     */
    async removeReaction(message) {
        if (this.isMain) {
            message = (0, MessageUtils_1.getMessageFromJSON)(message);
            await this.bot.removeReaction(new ReactionMessage_1.default(message.chat, '', message, { user: message.user }));
        }
        else {
            await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Func, {
                name: 'removeReaction',
                args: [message],
            }));
        }
    }
    /** Adiciona animações na reação da mensagem
     * @param message Mensagem que receberá a animação
     * @param reactions Reações em sequência
     * @param interval Intervalo entre cada reação
     * @param maxTimeout Maximo de tempo reagindo
     */
    addAnimatedReaction(message, reactions, interval = 2000, maxTimeout = 60000) {
        let isStoped = false;
        const now = Date.now();
        const stop = async (reactionStop) => {
            if (isStoped)
                return;
            isStoped = true;
            if (!reactionStop) {
                await this.removeReaction(message);
            }
            else {
                await this.addReaction(message, reactionStop);
            }
        };
        const addReaction = async (index) => {
            if (isStoped || now + maxTimeout < Date.now()) {
                return stop();
            }
            if (reactions[index]) {
                await this.addReaction(message, reactions[index]);
            }
            await (0, Generic_1.sleep)(interval);
            addReaction(index + 1 >= reactions.length ? 0 : index + 1);
        };
        addReaction(0);
        return stop;
    }
    /** Envia uma mensagem
     * @param message Menssagem que será enviada
     * @returns Retorna o conteudo enviado
     */
    async send(message) {
        if (this.isMain) {
            return Message_1.default.apply(await this.bot.send((0, MessageUtils_1.getMessageFromJSON)(message)), {
                clientId: this.id,
                botId: this.bot.id,
            });
        }
        else {
            if (!this.config.disableAutoTyping) {
                await this.changeChatStatus(message.chat, message.type == 'audio' ? ChatStatus_1.default.Recording : ChatStatus_1.default.Typing);
            }
            const workerMessage = await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Func, {
                name: 'send',
                args: [message],
            }));
            return (0, MessageUtils_1.getMessageFromJSON)(workerMessage.getData().result || message);
        }
    }
    /** Envia uma mensagem
     * @param chat Sala de bate-papo onde irá ser enviado a mensagem
     * @param message Mensagem que será enviada
     * @param mention Mensagem que será mencionada
     */
    async sendMessage(chat, message, mention) {
        if (Message_1.default.isValid(message)) {
            message = Message_1.default.apply(message, {
                clientId: this.id,
                botId: this.bot.id,
            });
            message.chat = Chat_1.default.apply(chat, {
                clientId: this.id,
                botId: this.bot.id,
            });
            message.mention = mention;
            return await this.send(message);
        }
        return await this.send(new Message_1.default(chat, message, { mention }));
    }
    /** Aguarda uma mensagem ser recebida em uma sala de bate-papo
     * @param chat Sala de bate-papo que irá receber a mensagem
     * @param config Configuração do aguardo da mensagem
     */
    async awaitMessage(chat, config = {}) {
        const chatId = Chat_1.default.getId(chat);
        if (!chatId) {
            throw new ChatNotDefinedError_1.default();
        }
        const message = await this.messageHandler.addMessage(chatId, config);
        return Message_1.default.apply(message, { clientId: this.id, botId: this.bot.id });
    }
    /**
     * Retorna a stream da mídia
     * @param message Mídia que será baixada
     * @returns Stream da mídia
     */
    async downloadStreamMessage(message) {
        if (!message.file)
            return Buffer.from('');
        if (Buffer.isBuffer(message.file))
            return message.file;
        if (typeof message.file == 'string') {
            return (0, fs_1.readFileSync)(message.file);
        }
        if (this.isMain) {
            return await this.bot.downloadStreamMessage(message.file);
        }
        else {
            const workerMessage = await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Func, {
                name: 'downloadStreamMessage',
                args: [message],
            }));
            return workerMessage.getData().result || Buffer.from('');
        }
    }
    /** @returns Retorna o nome do bot */
    async getBotName() {
        if (this.isMain) {
            return await this.bot.getBotName();
        }
        else {
            const workerMessage = await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Func, {
                name: 'getBotName',
                args: [],
            }));
            return workerMessage.getData().result || '';
        }
    }
    /** Define o nome do bot
     * @param name Nome do bot
     */
    async setBotName(name) {
        if (this.isMain) {
            await this.bot.setBotName(name);
        }
        else {
            await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Func, {
                name: 'setBotName',
                args: [name],
            }));
        }
    }
    /** @returns Retorna a descrição do bot */
    async getBotDescription() {
        if (this.isMain) {
            return await this.bot.getBotDescription();
        }
        else {
            const workerMessage = await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Func, {
                name: 'getBotDescription',
                args: [],
            }));
            return workerMessage.getData().result || '';
        }
    }
    /** Define a descrição do bot
     * @param description Descrição do bot
     */
    async setBotDescription(description) {
        if (this.isMain) {
            await this.bot.setBotDescription(description);
        }
        else {
            await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Func, {
                name: 'setBotDescription',
                args: [description],
            }));
        }
    }
    /** @returns Retorna foto de perfil do bot */
    async getBotProfile(lowQuality) {
        if (this.isMain) {
            return await this.bot.getBotProfile(lowQuality);
        }
        else {
            const workerMessage = await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Func, {
                name: 'getBotProfile',
                args: [lowQuality],
            }));
            return workerMessage.getData().result || Buffer.from('');
        }
    }
    /** Define a imagem de perfil do bot
     * @param image Imagem de perfil do bot
     */
    async setBotProfile(profile) {
        if (this.isMain) {
            await this.bot.setBotProfile(profile);
        }
        else {
            await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Func, {
                name: 'setBotProfile',
                args: [profile],
            }));
        }
    }
    /**
     * @param chat Sala de bate-papo
     * @returns Retorna uma sala de bate-papo
     */
    async getChat(chat) {
        if (this.isMain) {
            const chatData = await this.bot.getChat(Chat_1.default.apply(chat, { clientId: this.id, botId: this.bot.id }));
            if (chatData == null)
                return null;
            return Chat_1.default.apply(chatData, { clientId: this.id, botId: this.bot.id });
        }
        else {
            const workerMessage = await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Func, {
                name: 'getChat',
                args: [chat],
            }));
            const chatData = workerMessage.getData().result || null;
            if (chatData == null)
                return null;
            return Chat_1.default.fromJSON(chatData);
        }
    }
    /**
     * Atualiza os dados de um chat.
     * @param id - Id do chat que será atualizado.
     * @param chat - Dados do chat que será atualizado.
     */
    async updateChat(id, chat) {
        if (this.isMain) {
            await this.bot.updateChat({ ...chat, id });
        }
        else {
            await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Func, {
                name: 'updateChat',
                args: [id, chat],
            }));
        }
    }
    /** @returns Retorna as sala de bate-papo que o bot está */
    async getChats() {
        if (this.isMain) {
            const ids = await this.bot.getChats();
            const chats = [];
            await Promise.all(ids.map(async (id) => {
                const chat = await this.bot.getChat(new Chat_1.default(id));
                if (chat == null)
                    return;
                chats.push(Chat_1.default.apply(chat, { clientId: this.id, botId: this.bot.id }));
            }));
            return chats;
        }
        else {
            const workerMessage = await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Func, {
                name: 'getChats',
                args: [],
            }));
            return (workerMessage.getData().result || []).map((chat) => Chat_1.default.fromJSON(chat));
        }
    }
    /** Define as salas de bate-papo que o bot está
     * @param chats Salas de bate-papo
     */
    async setChats(chats) {
        if (this.isMain) {
            await this.bot.setChats((chats || []).map((chat) => Chat_1.default.fromJSON(chat)));
        }
        else {
            await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Func, {
                name: 'setChats',
                args: [chats],
            }));
        }
    }
    /** Remove uma sala de bate-papo
     * @param chat Sala de bate-papo
     */
    async removeChat(chat) {
        if (this.isMain) {
            await this.bot.removeChat(Chat_1.default.apply(chat, { clientId: this.id, botId: this.bot.id }));
        }
        else {
            await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Func, {
                name: 'removeChat',
                args: [chat],
            }));
        }
    }
    /** Cria uma sala de bate-papo
     * @param chat Sala de bate-papo
     */
    async createChat(chat) {
        if (this.isMain) {
            await this.bot.createChat(Chat_1.default.apply(chat, { clientId: this.id, botId: this.bot.id }));
        }
        else {
            await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Func, {
                name: 'createChat',
                args: [chat],
            }));
        }
    }
    /** Sai de uma sala de bate-papo
     * @param chat Sala de bate-papo
     */
    async leaveChat(chat) {
        if (this.isMain) {
            await this.bot.leaveChat(Chat_1.default.apply(chat, { clientId: this.id, botId: this.bot.id }));
        }
        else {
            await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Func, {
                name: 'leaveChat',
                args: [chat],
            }));
        }
    }
    /**
     * @param chat Sala de bate-papo
     * @returns Retorna o nome da sala de bate-papo
     */
    async getChatName(chat) {
        if (this.isMain) {
            return await this.bot.getChatName(Chat_1.default.apply(chat, { clientId: this.id, botId: this.bot.id }));
        }
        else {
            const workerMessage = await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Func, {
                name: 'getChatName',
                args: [chat],
            }));
            return workerMessage.getData().result || '';
        }
    }
    /** Define o nome da sala de bate-papo
     * @param chat Sala de bate-papo
     * @param name Nome da sala de bate-papo
     */
    async setChatName(chat, name) {
        if (this.isMain) {
            await this.bot.setChatName(Chat_1.default.apply(chat, { clientId: this.id, botId: this.bot.id }), name);
        }
        else {
            await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Func, {
                name: 'setChatName',
                args: [chat, name],
            }));
        }
    }
    /**
     * @param chat Sala de bate-papo
     * @returns Retorna a descrição da sala de bate-papo
     */
    async getChatDescription(chat) {
        if (this.isMain) {
            return await this.bot.getChatDescription(Chat_1.default.apply(chat, { clientId: this.id, botId: this.bot.id }));
        }
        else {
            const workerMessage = await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Func, {
                name: 'getChatDescription',
                args: [chat],
            }));
            return workerMessage.getData().result || '';
        }
    }
    /** Define a descrição da sala de bate-papo
     * @param chat Sala de bate-papo
     * @param description Descrição da sala de bate-papo
     */
    async setChatDescription(chat, description) {
        if (this.isMain) {
            await this.bot.setChatDescription(Chat_1.default.apply(chat, { clientId: this.id, botId: this.bot.id }), description);
        }
        else {
            await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Func, {
                name: 'setChatDescription',
                args: [chat, description],
            }));
        }
    }
    /**
     * @param chat Sala de bate-papo
     * @returns Retorna a imagem de perfil da sala de bate-papo
     */
    async getChatProfile(chat, lowQuality) {
        if (this.isMain) {
            return await this.bot.getChatProfile(Chat_1.default.apply(chat, { clientId: this.id, botId: this.bot.id }), lowQuality);
        }
        else {
            const workerMessage = await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Func, {
                name: 'getChatProfile',
                args: [chat, lowQuality],
            }));
            return workerMessage.getData().result || Buffer.from('');
        }
    }
    /** Define a imagem de perfil da sala de bate-papo
     * @param chat Sala de bate-papo
     * @param profile Imagem de perfil da sala de bate-papo
     */
    async setChatProfile(chat, profile) {
        if (this.isMain) {
            await this.bot.setChatProfile(Chat_1.default.apply(chat, { clientId: this.id, botId: this.bot.id }), profile);
        }
        else {
            await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Func, {
                name: 'setChatProfile',
                args: [chat, profile],
            }));
        }
    }
    /**
     * @param chat Sala de bate-papo
     * @returns Retorna o lider da sala de bate-papo
     */
    async getChatLeader(chat) {
        if (this.isMain) {
            return User_1.default.apply(await this.bot.getChatLeader(Chat_1.default.apply(chat, { clientId: this.id, botId: this.bot.id })), { clientId: this.id, botId: this.bot.id });
        }
        else {
            const workerMessage = await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Func, {
                name: 'getChatLeader',
                args: [chat],
            }));
            return User_1.default.fromJSON(workerMessage.getData().result || {});
        }
    }
    /**
     * @param chat Sala de bate-papo
     * @returns Retorna os usuários de uma sala de bate-papo
     */
    async getChatUsers(chat) {
        if (this.isMain) {
            return await this.bot.getChatUsers(Chat_1.default.apply(chat, { clientId: this.id, botId: this.bot.id }));
        }
        else {
            const workerMessage = await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Func, {
                name: 'getChatUsers',
                args: [chat],
            }));
            return workerMessage.getData().result || [];
        }
    }
    /**
     * @param chat Sala de bate-papo
     * @returns Retorna os administradores de uma sala de bate-papo
     */
    async getChatAdmins(chat) {
        if (this.isMain) {
            return await this.bot.getChatAdmins(Chat_1.default.apply(chat, { clientId: this.id, botId: this.bot.id }));
        }
        else {
            const workerMessage = await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Func, {
                name: 'getChatAdmins',
                args: [chat],
            }));
            return workerMessage.getData().result || [];
        }
    }
    /** Adiciona um novo usuário a uma sala de bate-papo
     * @param chat Sala de bate-papo
     * @param user Usuário
     */
    async addUserInChat(chat, user) {
        if (this.isMain) {
            await this.bot.addUserInChat(Chat_1.default.apply(chat, { clientId: this.id, botId: this.bot.id }), User_1.default.apply(user, { clientId: this.id, botId: this.bot.id }));
        }
        else {
            await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Func, {
                name: 'addUserInChat',
                args: [chat, user],
            }));
        }
    }
    /** Adiciona um novo usuário a uma sala de bate-papo
     * @param chat Sala de bate-papo
     * @param user Usuário
     */
    async removeUserInChat(chat, user) {
        if (this.isMain) {
            await this.bot.removeUserInChat(Chat_1.default.apply(chat, { clientId: this.id, botId: this.bot.id }), User_1.default.apply(user, { clientId: this.id, botId: this.bot.id }));
        }
        else {
            await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Func, {
                name: 'removeUserInChat',
                args: [chat, user],
            }));
        }
    }
    /** Promove há administrador um usuário da sala de bate-papo
     * @param chat Sala de bate-papo
     * @param user Usuário
     */
    async promoteUserInChat(chat, user) {
        if (this.isMain) {
            await this.bot.promoteUserInChat(Chat_1.default.apply(chat, { clientId: this.id, botId: this.bot.id }), User_1.default.apply(user, { clientId: this.id, botId: this.bot.id }));
        }
        else {
            await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Func, {
                name: 'promoteUserInChat',
                args: [chat, user],
            }));
        }
    }
    /** Remove a administração um usuário da sala de bate-papo
     * @param chat Sala de bate-papo
     * @param user Usuário
     */
    async demoteUserInChat(chat, user) {
        if (this.isMain) {
            await this.bot.demoteUserInChat(Chat_1.default.apply(chat, { clientId: this.id, botId: this.bot.id }), User_1.default.apply(user, { clientId: this.id, botId: this.bot.id }));
        }
        else {
            await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Func, {
                name: 'demoteUserInChat',
                args: [chat, user],
            }));
        }
    }
    /** Altera o status da sala de bate-papo
     * @param chat Sala de bate-papo
     * @param status Status da sala de bate-papo
     */
    async changeChatStatus(chat, status) {
        if (this.isMain) {
            await this.bot.changeChatStatus(Chat_1.default.apply(chat, { clientId: this.id, botId: this.bot.id }), status);
        }
        else {
            await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Func, {
                name: 'changeChatStatus',
                args: [chat, status],
            }));
        }
    }
    /**
     * Entra no chat pelo código de convite.
     * @param code - Código de convite do chat.
     */
    async joinChat(code) {
        if (this.isMain) {
            await this.bot.joinChat(code);
        }
        else {
            await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Func, {
                name: 'joinChat',
                args: [code],
            }));
        }
    }
    /**
     * Obtem o código de convite do chat.
     * @param chat - Chat que será obtido o código de convite.
     * @returns O código de convite do chat.
     */
    async getChatInvite(chat) {
        if (this.isMain) {
            return await this.bot.getChatInvite(Chat_1.default.apply(chat, { clientId: this.id, botId: this.bot.id }));
        }
        else {
            const workerMessage = await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Func, {
                name: 'getChatInvite',
                args: [chat],
            }));
            return workerMessage.getData().result || '';
        }
    }
    /**
     * Revoga o código de convite do chat.
     * @param chat - Chat que terá seu código de convite revogado.
     * @returns O novo código de convite do chat.
     */
    async revokeChatInvite(chat) {
        if (this.isMain) {
            return await this.bot.revokeChatInvite(Chat_1.default.apply(chat, { clientId: this.id, botId: this.bot.id }));
        }
        else {
            const workerMessage = await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Func, {
                name: 'revokeChatInvite',
                args: [chat],
            }));
            return workerMessage.getData().result || '';
        }
    }
    async rejectCall(call) {
        if (this.isMain) {
            await this.bot.rejectCall(Call_1.default.apply(call, { clientId: this.id, botId: this.bot.id }));
        }
        else {
            await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Func, {
                name: 'rejectCall',
                args: [call],
            }));
        }
    }
    /** @returns Retorna a lista de usuários do bot */
    async getUsers() {
        if (this.isMain) {
            const ids = await this.bot.getUsers();
            const users = [];
            await Promise.all(ids.map(async (id) => {
                const user = await this.bot.getUser(new User_1.default(id));
                if (user == null)
                    return;
                users.push(User_1.default.apply(user, { clientId: this.id, botId: this.bot.id }));
            }));
            return users;
        }
        else {
            const workerMessage = await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Func, {
                name: 'getUsers',
                args: [],
            }));
            return (workerMessage.getData().result || []).map((user) => User_1.default.fromJSON(user));
        }
    }
    /**
     * Obter lista de usuários salvos.
     * @returns Lista de usuários salvos.
     */
    async getSavedUsers() {
        if (this.isMain) {
            const ids = await this.bot.getUsers();
            const users = [];
            await Promise.all(ids.map(async (id) => {
                const user = await this.bot.getUser(new User_1.default(id));
                if (user == null || !user.savedName)
                    return;
                users.push(User_1.default.apply(user, { clientId: this.id, botId: this.bot.id }));
            }));
            return users;
        }
        else {
            const workerMessage = await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Func, {
                name: 'getSavedUsers',
                args: [],
            }));
            return (workerMessage.getData().result || []).map((user) => User_1.default.fromJSON(user));
        }
    }
    /** Define a lista de usuários do bot
     * @param users Usuários
     */
    async setUsers(users) {
        if (this.isMain) {
            await this.bot.setUsers(users);
        }
        else {
            await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Func, {
                name: 'setUsers',
                args: [users],
            }));
        }
    }
    /**
     * @param user Usuário
     * @returns Retorna um usuário
     */
    async getUser(user) {
        if (this.isMain) {
            const userData = await this.bot.getUser(User_1.default.apply(user, { clientId: this.id, botId: this.bot.id }));
            if (userData == null)
                return null;
            return User_1.default.apply(userData, { clientId: this.id, botId: this.bot.id });
        }
        else {
            const workerMessage = await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Func, {
                name: 'getUser',
                args: [user],
            }));
            const userData = workerMessage.getData().result || null;
            if (userData == null)
                return null;
            return User_1.default.fromJSON(userData);
        }
    }
    /**
     * Atualiza os dados de um usuário.
     * @param id - Id do usuário que será atualizado.
     * @param user - Dados do usuário que será atualizado.
     */
    async updateUser(id, user) {
        if (this.isMain) {
            await this.bot.updateUser({ ...user, id });
        }
        else {
            await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Func, {
                name: 'updateUser',
                args: [id, user],
            }));
        }
    }
    /** Remove um usuário
     * @param user Usuário
     */
    async removeUser(user) {
        if (this.isMain) {
            await this.bot.removeUser(User_1.default.apply(user, { clientId: this.id, botId: this.bot.id }));
        }
        else {
            await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Func, {
                name: 'removeUser',
                args: [user],
            }));
        }
    }
    /**
     * @param user Usuário
     * @returns Retorna o nome do usuário
     */
    async getUserName(user) {
        if (this.isMain) {
            if (User_1.default.getId(user) == this.id)
                return this.getBotName();
            return await this.bot.getUserName(User_1.default.apply(user, { clientId: this.id, botId: this.bot.id }));
        }
        else {
            const workerMessage = await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Func, {
                name: 'getUserName',
                args: [user],
            }));
            return workerMessage.getData().result || '';
        }
    }
    /** Define o nome do usuário
     * @param user Usuário
     * @param name Nome do usuário
     */
    async setUserName(user, name) {
        if (this.isMain) {
            if (User_1.default.getId(user) == this.id) {
                await this.setBotName(name);
            }
            await this.bot.setUserName(User_1.default.apply(user, { clientId: this.id, botId: this.bot.id }), name);
        }
        else {
            await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Func, {
                name: 'setUserName',
                args: [user, name],
            }));
        }
    }
    /**
     * @param user Usuário
     * @returns Retorna a descrição do usuário
     */
    async getUserDescription(user) {
        if (this.isMain) {
            if (User_1.default.getId(user) == this.id) {
                return await this.getBotDescription();
            }
            return await this.bot.getUserDescription(User_1.default.apply(user, { clientId: this.id, botId: this.bot.id }));
        }
        else {
            const workerMessage = await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Func, {
                name: 'getUserDescription',
                args: [user],
            }));
            return workerMessage.getData().result || '';
        }
    }
    /** Define a descrição do usuário
     * @param user Usuário
     * @param description Descrição do usuário
     */
    async setUserDescription(user, description) {
        if (this.isMain) {
            if (User_1.default.getId(user) == this.id) {
                await this.setBotDescription(description);
            }
            await this.bot.setUserDescription(User_1.default.apply(user, { clientId: this.id, botId: this.bot.id }), description);
        }
        else {
            await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Func, {
                name: 'setUserDescription',
                args: [user, description],
            }));
        }
    }
    /**
     * @param user Usuário
     * @returns Retorna a foto de perfil do usuário
     */
    async getUserProfile(user, lowQuality) {
        if (this.isMain) {
            if (User_1.default.getId(user) == this.id) {
                return await this.getBotProfile(lowQuality);
            }
            return await this.bot.getUserProfile(User_1.default.apply(user, { clientId: this.id, botId: this.bot.id }), lowQuality);
        }
        else {
            const workerMessage = await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Func, {
                name: 'getUserProfile',
                args: [user, lowQuality],
            }));
            return workerMessage.getData().result || Buffer.from('');
        }
    }
    /** Define a imagem de perfil do usuário
     * @param user Usuário
     * @param profile Imagem de perfil do usuário
     */
    async setUserProfile(user, profile) {
        if (this.isMain) {
            if (User_1.default.getId(user) == this.id) {
                await this.setBotProfile(profile);
            }
            await this.bot.setUserProfile(User_1.default.apply(user, { clientId: this.id, botId: this.bot.id }), profile);
        }
        else {
            await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Func, {
                name: 'setUserProfile',
                args: [user, profile],
            }));
        }
    }
    /** Desbloqueia um usuário
     * @param user Usuário
     */
    async unblockUser(user) {
        if (this.isMain) {
            await this.bot.unblockUser(User_1.default.apply(user, { clientId: this.id, botId: this.bot.id }));
        }
        else {
            await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Func, {
                name: 'unblockUser',
                args: [user],
            }));
        }
    }
    /** Bloqueia um usuário
     * @param user Usuário
     */
    async blockUser(user) {
        if (this.isMain) {
            await this.bot.blockUser(User_1.default.apply(user, { clientId: this.id, botId: this.bot.id }));
        }
        else {
            await this.sendWorkerMessage(new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Func, {
                name: 'blockUser',
                args: [user],
            }));
        }
    }
    /**
     * Retorna a lista de clientes diponíveis.
     * @returns Clientes ordenados pelo ID.
     */
    static getClients() {
        if (!('rompot-clients-cluster' in global) ||
            typeof global['rompot-clients-cluster'] != 'object') {
            global['rompot-clients-cluster'] = {};
        }
        return global['rompot-clients-cluster'];
    }
    /**
     * Define todos os clientes diponíveis.
     * @param clients - Clientes que serão definidios.
     */
    static saveClients(clients) {
        global['rompot-clients-cluster'] = clients;
    }
    /**
     * Retorna o cliente pelo seu respectivo ID.
     * @param id - ID do cliente.
     * @returns O cliente associado ao ID.
     */
    static getClient(id) {
        var _a;
        const clients = ClientCluster.getClients();
        if (id in clients && typeof clients[id] == 'object') {
            return clients[id];
        }
        return new ClientCluster(id, global['default-rompot-worker'] || ((_a = global['rompot-cluster-save']) === null || _a === void 0 ? void 0 : _a.worker));
    }
    /**
     * Define um cliente disponível
     * @param client - Cliente que será definido
     */
    static saveClient(client) {
        if (!('rompot-clients-cluster' in global) ||
            typeof global['rompot-clients-cluster'] != 'object') {
            global['rompot-clients-cluster'] = {};
        }
        global['rompot-clients-cluster'][client.id] = client;
        const workerMessage = new WorkerMessage_1.default(WorkerMessage_1.WorkerMessageTag.Patch, {});
        workerMessage.id = 'save-client';
        workerMessage.isPrimary = true;
        client.sendWorkerMessage(workerMessage);
    }
    /** Gera um id único */
    static generateId() {
        return `${process.pid}-${Date.now()}-${Object.keys(ClientCluster.getClients()).length}`;
    }
    /**
     * * Cria um cliente principal para o bot.
     * @param id - ID do cliente.
     * @param worker - Worker do cliente.
     * @param bot - Bot do cliente.
     * @param auth - Autenticação do bot.
     * @returns Instância principal do cliente.
     */
    static createMain(id, worker, bot, auth, config) {
        const clientMain = new ClientCluster(id, worker, config, true);
        clientMain.bot = bot;
        clientMain.auth = auth;
        clientMain.configEvents();
        return clientMain;
    }
    /** Configura o cluster para o cliente */
    static configCluster(cluster) {
        var _a, _b;
        global['rompot-cluster-save'] = cluster;
        global[exports.GlobalRompotCluster] = {
            workers: { ...(((_a = global[exports.GlobalRompotCluster]) === null || _a === void 0 ? void 0 : _a.workers) || {}) },
            clients: { ...(((_b = global[exports.GlobalRompotCluster]) === null || _b === void 0 ? void 0 : _b.clients) || {}) },
        };
        cluster.on('fork', (worker) => {
            global[exports.GlobalRompotCluster].workers[`${worker.id}`] = worker;
        });
        cluster.on('message', (worker, message) => {
            var _a, _b, _c;
            const workerMessage = WorkerMessage_1.default.fromJSON(message);
            try {
                if (workerMessage.uid != 'rompot')
                    return;
                if (!((_a = global[exports.GlobalRompotCluster].clients[worker.id]) === null || _a === void 0 ? void 0 : _a.includes(workerMessage.clientId))) {
                    global[exports.GlobalRompotCluster].clients[worker.id] = [
                        ...(global[exports.GlobalRompotCluster].clients[worker.id] || []),
                        workerMessage.clientId,
                    ];
                }
                if (workerMessage.isPrimary)
                    return;
                for (const workerId of Object.keys(((_b = global[exports.GlobalRompotCluster]) === null || _b === void 0 ? void 0 : _b.clients) || {})) {
                    try {
                        for (const clientId of ((_c = global[exports.GlobalRompotCluster]) === null || _c === void 0 ? void 0 : _c.clients[workerId]) || []) {
                            if (clientId != workerMessage.clientId)
                                continue;
                            const workerReceive = global[exports.GlobalRompotCluster].workers[workerId];
                            if (!workerReceive)
                                continue;
                            workerReceive.send(workerMessage);
                        }
                    }
                    catch (_d) {
                        worker.send(workerMessage.clone({
                            tag: WorkerMessage_1.WorkerMessageTag.Error,
                            data: { reason: 'Error in send message from worker' },
                        }));
                    }
                }
            }
            catch (_e) {
                worker.send(workerMessage.clone({
                    tag: WorkerMessage_1.WorkerMessageTag.Error,
                    data: { reason: 'Error in receive message from worker' },
                }));
            }
        });
    }
}
exports.default = ClientCluster;
//# sourceMappingURL=ClientCluster.js.map