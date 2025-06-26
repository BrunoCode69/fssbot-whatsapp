import ICommandControllerConfig from "./ICommandControllerConfig";
import CommandControllerEvent from "./CommandControllerEvent";
import Message from "../../messages/Message";
import Command from "./Command";
export default class CommandController extends CommandControllerEvent {
    /** Configuração do controlador */
    config: ICommandControllerConfig;
    /** Comandos */
    commands: Command[];
    /** ID do bot associado ao controlador de comandos */
    botId: string;
    /** ID do client associado ao controlador de comandos */
    clientId: string;
    constructor(config?: Partial<ICommandControllerConfig>);
    /** Define os comandos
     * @param commands Novos comandos
     * */
    setCommands(commands: Command[]): void;
    /** @retuns Retorna os comandos */
    getCommands(): Command[];
    /** Adiciona um comando
     * @param command Novo comando
     */
    addCommand(command: Command): void;
    /**
     * Remove um comando
     * @param command Comando que será removido
     * */
    removeCommand(command: Command): boolean;
    /** Busca pelo comando
     * @param text Texto onde será verificado se inclui o comando
     */
    searchCommand(text: string): Command | null;
    /** Execução do comando
     * @param command Comando que será executado
     * @param message Mensagem que chamou o comando
     * @param type Tipo da execução doo comando
     */
    runCommand(command: Command, message: Message, type?: string): Promise<any>;
    /** Executa o comando
     * @param message Mensagem que chamou o comando
     * @param command Comando que será executado
     */
    execCommand(message: Message, command: Command): Promise<any>;
    /** Resposta ao comando
     * @param message Mensagem que chamou o comando
     * @param command Comando que receberá a resposta
     */
    replyCommand(message: Message, command: Command): Promise<any>;
}
