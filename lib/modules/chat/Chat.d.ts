/// <reference types="node" />
import User from '../../modules/user/User';
import Message from '../../messages/Message';
import ChatType from './ChatType';
import ChatStatus from './ChatStatus';
export default class Chat {
    /** ID do bot associado a este chat */
    botId?: string;
    /** ID do cliente associado a este chat */
    clientId?: string;
    /** ID do chat */
    id: string;
    /** Tipo do chat */
    type: ChatType;
    /** Nome do chat */
    name?: string;
    /** Número de telefone */
    phoneNumber?: string;
    /** Descrição do chat */
    description?: string;
    /** URL da imagem de perfil do chat */
    profileUrl?: string;
    /** Quantidade de mensagens não lidas */
    unreadCount?: number;
    /** Tempo da última interação com o chat */
    timestamp?: number;
    /** [Group] Admins do chat */
    admins?: string[];
    /** [Group] Líder do chat */
    leader?: string;
    /** [Group] Usuários do chat */
    users?: string[];
    /** [Telegram] Apelido do chat */
    nickname?: string;
    /** Obter o cliente do chat */
    private get client();
    /**
     * Cria uma instância de Chat.
     * @param id - O ID do chat.
     * @param type - O tipo do chat (opcional, padrão é ChatType.PV).
     * @param name - O nome do chat (opcional, padrão é uma string vazia).
     */
    constructor(id?: string, type?: ChatType, name?: string);
    /** Retorna o nome do chat. */
    getName(): Promise<string | undefined>;
    /**
     * Define o nome do chat.
     * @param name - O novo nome para definir.
     */
    setName(name: string): Promise<void>;
    /** Retorna a descrição do chat. */
    getDescription(): Promise<string> | undefined;
    /**
     * Define a descrição do chat.
     * @param description - A nova descrição para definir.
     */
    setDescription(description: string): Promise<void>;
    /** Retorna o perfil do chat. */
    getProfile(): Promise<Buffer | undefined>;
    /**
     * Define o perfil do chat.
     * @param image - O novo perfil para definir como um Buffer.
     */
    setProfile(image: Buffer): Promise<void>;
    /**
     * Verifica se um usuário é um administrador do chat.
     * @param user - O usuário ou ID do usuário a ser verificado.
     * @returns Verdadeiro se o usuário é um administrador, caso contrário, falso.
     */
    isAdmin(user: User | string): Promise<boolean>;
    /**
     * Verifica se um usuário é o líder do chat.
     * @param user - O usuário ou ID do usuário a ser verificado.
     * @returns verdadeiro se o usuário é o líder, caso contrário, falso.
     */
    isLeader(user: User | string): Promise<boolean>;
    /** Retorna o ID dos administradores do chat. */
    getAdmins(): Promise<string[]>;
    /** Retorna o ID dos usuários do chat. */
    getUsers(): Promise<string[]>;
    /**
     * Adiciona um usuário a este chat.
     * @param user - O usuário ou ID do usuário a ser adicionado.
     */
    addUser(user: User | string): Promise<void>;
    /**
     * Remove um usuário do chat.
     * @param user - O usuário ou ID do usuário a ser removido.
     */
    removeUser(user: User | string): Promise<void>;
    /**
     * Promove um usuário a administrador do chat.
     * @param user - O usuário ou ID do usuário a ser promovido.
     */
    promote(user: User | string): Promise<void>;
    /**
     * Rebaixa um administrador a membro do chat.
     * @param user - O usuário ou ID do usuário a ser rebaixado.
     */
    demote(user: User | string): Promise<void>;
    /** Sai do chat. */
    leave(): Promise<void>;
    /**
     * Envia uma mensagem para este chat.
     * @param message - A mensagem ou objeto Message a ser enviado.
     * @returns Uma Promise que resolve para a mensagem enviada.
     */
    send(message: Message | string): Promise<Message>;
    /**
     * Altera o status do chat.
     * @param status - O novo status a ser definido.
     * @returns Uma Promise que resolve quando o status do chat é alterado com sucesso.
     */
    changeStatus(status: ChatStatus): Promise<void>;
    /**
     * Converte o objeto atual para uma representação em formato JSON.
     * @returns Um objeto JSON que representa o estado atual do objeto.
     */
    toJSON(): any;
    /**
     * Cria uma instância de Chat a partir de uma representação em formato JSON.
     * @param data - Os dados JSON a serem usados para criar a instância.
     * @returns Uma instância de Chat criada a partir dos dados JSON.
     */
    static fromJSON(data: any): Chat;
    /**
     * Retorna o ID de um chat.
     * @param chat - O chat ou ID do chat de onde obter o ID.
     */
    static getId(chat: Chat | string): string | undefined;
    /**
     * Retorna uma instância de Chat com base em um ID e/ou dados passados.
     * @param chat - O ID do chat ou uma instância existente de Chat.
     * @param data - Dados que serão aplicados no chat.
     */
    static apply(chat: Chat | string, data?: Partial<Chat>): Chat;
    /**
     * Verifica se um objeto é uma instância válida de Chat.
     * @param chat - O objeto a ser verificado.
     * @returns Verdadeiro se o objeto for uma instância válida de Chat, caso contrário, falso.
     */
    static isValid(chat: any): chat is Chat;
}
