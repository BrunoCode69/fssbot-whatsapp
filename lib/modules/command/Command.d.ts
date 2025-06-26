import ICommandControllerConfig from './ICommandControllerConfig';
import CommandPermission from './CommandPermission';
import Message from '../../messages/Message';
import CommandKey from './CommandKey';
/** Permissões do comando */
export declare enum CMDPerms {
    /** Permitido apenas ser executado no pv */
    ChatPv = "chat-pv",
    /** Permitido apenas ser executado em grupos */
    ChatGroup = "chat-group",
    /** Permitido apenas se o usuário for admin do chat */
    UserChatAdmin = "chat-admin",
    /** Permitido apenas se o usuário for líder do chat */
    UserChatLeader = "chat-leader",
    /** Permitido apenas se o bot for admin do chat */
    BotChatAdmin = "bot-chat-admin",
    /** Permitido apenas se o  bot for líder do chat */
    BotChatLeader = "bot-chat-leader"
}
export declare type CommandControllerEventsMap = {
    /** Permissão negada */
    ['no-allowed']: {
        message: Message;
        command: Command;
        permission: CommandPermission;
    };
};
export default class Command {
    /** Chaves do comando */
    keys: CommandKey[];
    /** Permissões necessárias do comando */
    permissions: string[];
    /** ID do bot associado ao comando */
    botId: string;
    /** ID do client associado ao comando */
    clientId: string;
    /** Verifica se o comando pode ser executado
     * @param message Mensagem que está executando o comando
     */
    checkPerms(message: Message): Promise<CommandPermission | null>;
    /** Quando o comando está sendo procurado
     * @param text Texto que será verificado se incluí o comando
     * @param config Configuração do controlador de comando
     */
    onSearch(text: string, config: ICommandControllerConfig): CommandKey | null;
    /** Quando o comando é lido */
    onRead(): any;
    /** Configuração do comando
     * @param message Mensagem que está executando o comando
     */
    onConfig(): any;
    /** Execução do comando
     * @param message Mensagem que está executando o comando
     */
    onExec(message: Message): any;
    /** Respota ao comando
     * @param message Mensagem que está executando o comando
     */
    onReply(message: Message): any;
    static readCommands(dir: string): Promise<Command[]>;
    /**
     * Verifica se um objeto é uma instância válida de Command.
     * @param message - O objeto a ser verificado.
     * @returns Verdadeiro se o objeto for uma instância válida de Command, caso contrário, falso.
     */
    static isValid(command: any): command is Command;
}
