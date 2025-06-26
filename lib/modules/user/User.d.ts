/// <reference types="node" />
import type Chat from '../chat/Chat';
export default class User {
    /** ID do bot associado a este usuário */
    botId?: string;
    /** ID do cliente associado a este usuário */
    clientId?: string;
    /** ID do usuário */
    id: string;
    /** Nome do usuário */
    name?: string;
    /** Nome salvado do usuário */
    savedName?: string;
    /** Número de telefone */
    phoneNumber?: string;
    /** Descrição do usuário */
    description?: string;
    /** URL da imagem de perfil do usuário */
    profileUrl?: string;
    /** [Telegram] Apelido do usuário */
    nickname?: string;
    /** Obter o cliente do chat */
    private get client();
    /**
     * Cria uma instância de User.
     * @param id - O ID do usuário.
     * @param name - O nome do usuário (opcional, padrão é uma string vazia).
     */
    constructor(id: string, name?: string);
    /** Bloqueia o usuário. */
    blockUser(): Promise<void>;
    /** Desbloqueia o usuário. */
    unblockUser(): Promise<void>;
    /** Retorna o nome do usuário. */
    getName(): Promise<string | undefined>;
    /**
     * Define o nome do usuário.
     * @param name - O novo nome para definir.
     */
    setName(name: string): Promise<void>;
    /** Retorna a descrição do usuário. */
    getDescription(): Promise<string | undefined>;
    /**
     * Define a descrição do usuário.
     * @param description - A nova descrição para definir.
     */
    setDescription(description: string): Promise<void>;
    /** Retorna o perfil do usuário. */
    getProfile(): Promise<Buffer | undefined>;
    /**
     * Define o perfil do usuário.
     * @param image - O novo perfil para definir como um Buffer.
     */
    setProfile(image: Buffer): Promise<void>;
    /**
     * Verifica se o usuário é um administrador de um chat.
     * @param chat - O chat ou ID do chat a ser verificado.
     */
    isAdmin(chat: Chat | string): Promise<boolean>;
    /**
     * Verifica se o usuário é o líder de um chat.
     * @param chat - O chat ou ID do chat a ser verificado.
     */
    isLeader(chat: Chat | string): Promise<boolean>;
    /**
     * Converte o objeto atual para uma representação em formato JSON.
     * @returns Um objeto JSON que representa o estado atual do objeto.
     */
    toJSON(): any;
    /**
     * Cria uma instância de User a partir de uma representação em formato JSON.
     * @param data - Os dados JSON a serem usados para criar a instância.
     */
    static fromJSON(data: any): User;
    /**
     * Retorna uma instância de User com base em um ID e/ou dados passados.
     * @param user - O ID do usuário ou uma instância existente de User.
     * @param data - Dados que serão aplicados no usuário.
     */
    static apply(user: User | string, data?: Partial<User>): User;
    /**
     * Retorna o ID de um usuário.
     * @param user - O usuário ou ID do usuário de onde obter o ID.
     * @returns O ID do usuário como uma string, ou uma string vazia se o usuário for inválido.
     */
    static getId(user: User | string): string | undefined;
    /**
     * Verifica se um objeto é uma instância válida de User.
     * @param user - O objeto a ser verificado.
     */
    static isValid(user: any): user is User;
}
