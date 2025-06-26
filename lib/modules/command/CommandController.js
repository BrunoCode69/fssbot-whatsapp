"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const defaults_1 = require("./defaults");
const CommandControllerEvent_1 = __importDefault(require("./CommandControllerEvent"));
const CommandEnums_1 = require("./CommandEnums");
class CommandController extends CommandControllerEvent_1.default {
    constructor(config = {}) {
        super();
        /** Comandos */
        this.commands = [];
        /** ID do bot associado ao controlador de comandos */
        this.botId = "";
        /** ID do client associado ao controlador de comandos */
        this.clientId = "";
        this.config = { ...defaults_1.DEFAULT_COMMAND_CONTROLLER_CONFIG, ...config };
    }
    /** Define os comandos
     * @param commands Novos comandos
     * */
    setCommands(commands) {
        const cmds = [];
        for (const command of commands) {
            command.clientId = this.clientId;
            command.botId = this.botId;
            cmds.push(command);
        }
        this.commands = cmds;
    }
    /** @retuns Retorna os comandos */
    getCommands() {
        return this.commands;
    }
    /** Adiciona um comando
     * @param command Novo comando
     */
    addCommand(command) {
        command.clientId = this.clientId;
        command.botId = this.botId;
        this.commands.push(command);
    }
    /**
     * Remove um comando
     * @param command Comando que será removido
     * */
    removeCommand(command) {
        const commands = [];
        const commandKeys = command.keys.map((key) => key.values.join("")).join("");
        for (const cmd of this.commands) {
            const keys = cmd.keys.map((key) => key.values.join("")).join("");
            if (keys == commandKeys)
                continue;
            commands.push(cmd);
        }
        if (this.commands.length == commands.length)
            return false;
        this.commands = commands;
        return true;
    }
    /** Busca pelo comando
     * @param text Texto onde será verificado se inclui o comando
     */
    searchCommand(text) {
        const commands = [];
        for (const command of this.commands) {
            const key = command.onSearch(`${text}`, this.config);
            if (key != null) {
                commands.push({ key, command });
            }
        }
        let commandResult = null;
        for (const { key, command } of commands) {
            if (commandResult == null) {
                commandResult = { key, command };
                continue;
            }
            if (key.values.join("").length > commandResult.key.values.join("").length) {
                commandResult = { key, command };
            }
        }
        if (commandResult == null)
            return null;
        return commandResult.command;
    }
    /** Execução do comando
     * @param command Comando que será executado
     * @param message Mensagem que chamou o comando
     * @param type Tipo da execução doo comando
     */
    async runCommand(command, message, type = CommandEnums_1.CMDRunType.Exec) {
        const permission = await command.checkPerms(message);
        if (permission != null && !permission.isPermited) {
            this.emit("no-allowed", { message, command, permission });
            return;
        }
        if (type == CommandEnums_1.CMDRunType.Reply) {
            return await this.replyCommand(message, command);
        }
        return this.execCommand(message, command);
    }
    /** Executa o comando
     * @param message Mensagem que chamou o comando
     * @param command Comando que será executado
     */
    async execCommand(message, command) {
        return await command.onExec(message);
    }
    /** Resposta ao comando
     * @param message Mensagem que chamou o comando
     * @param command Comando que receberá a resposta
     */
    async replyCommand(message, command) {
        return await command.onReply(message);
    }
}
exports.default = CommandController;
//# sourceMappingURL=CommandController.js.map