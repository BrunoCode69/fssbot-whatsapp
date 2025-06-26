import Message from "../../messages/Message";
export default class CommandPermission {
    /** Identificador da permissão */
    id: string;
    /** Se tem permissão */
    isPermited?: boolean;
    constructor(id: string, isPermited?: boolean);
    static check(message: Message, cmdPerm: CommandPermission): Promise<boolean>;
}
