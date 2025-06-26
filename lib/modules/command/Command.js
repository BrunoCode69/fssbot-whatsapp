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
const Generic_1 = require("../../utils/Generic");
const CommandPermission_1 = __importDefault(require("./CommandPermission"));
const CommandKey_1 = __importDefault(require("./CommandKey"));
const perms_1 = require("./perms");
class Command {
    constructor() {
        /** Chaves do comando */
        this.keys = [];
        /** Permissões necessárias do comando */
        this.permissions = [];
        /** ID do bot associado ao comando */
        this.botId = '';
        /** ID do client associado ao comando */
        this.clientId = '';
    }
    /** Verifica se o comando pode ser executado
     * @param message Mensagem que está executando o comando
     */
    async checkPerms(message) {
        const permissions = [];
        await Promise.all(this.permissions.map(async (permission) => {
            const perm = (0, perms_1.CMDPerm)(permission);
            if (!(await CommandPermission_1.default.check(message, perm))) {
                perm.isPermited = false;
                permissions.push(perm);
            }
        }));
        if (permissions.length > 0)
            return permissions[0];
        return null;
    }
    /** Quando o comando está sendo procurado
     * @param text Texto que será verificado se incluí o comando
     * @param config Configuração do controlador de comando
     */
    onSearch(text, config) {
        return CommandKey_1.default.search(text, config, ...this.keys);
    }
    /** Quando o comando é lido */
    onRead() { }
    /** Configuração do comando
     * @param message Mensagem que está executando o comando
     */
    onConfig() { }
    /** Execução do comando
     * @param message Mensagem que está executando o comando
     */
    onExec(message) { }
    /** Respota ao comando
     * @param message Mensagem que está executando o comando
     */
    onReply(message) { }
    static async readCommands(dir) {
        const commands = [];
        await (0, Generic_1.readRecursiveDir)(dir, async (filepath, filename, ext) => {
            try {
                if (ext != '.ts' && ext != '.js')
                    return;
                const content = await Promise.resolve().then(() => __importStar(require(filepath)));
                if (!content)
                    return;
                if (typeof content != 'object')
                    return;
                const keys = Object.keys(content);
                await Promise.all(keys.map(async (key) => {
                    try {
                        const data = content[key];
                        if (!data)
                            return;
                        if (Command.isValid(data)) {
                            await data.onRead();
                            commands.push(data);
                        }
                        else {
                            //@ts-ignore
                            const cmd = new data();
                            if (Command.isValid(cmd)) {
                                await cmd.onRead();
                                commands.push(cmd);
                            }
                        }
                    }
                    catch (_a) { }
                }));
            }
            catch (_a) { }
        });
        return commands;
    }
    /**
     * Verifica se um objeto é uma instância válida de Command.
     * @param message - O objeto a ser verificado.
     * @returns Verdadeiro se o objeto for uma instância válida de Command, caso contrário, falso.
     */
    static isValid(command) {
        return (typeof command === 'object' &&
            Object.keys(new Command()).every((key) => key in command));
    }
}
exports.default = Command;
//# sourceMappingURL=Command.js.map