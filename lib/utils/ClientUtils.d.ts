import IClient from '../client/IClient';
import IBot from '../bot/IBot';
export declare namespace ClientUtils {
    /** Gera um id único */
    function generateId(): string;
    /**
     * Retorna a lista de clientes diponíveis.
     * @returns Clientes ordenados pelo ID.
     */
    function getClients(): Record<string, IClient<IBot>>;
    /**
     * Define todos os clientes diponíveis.
     * @param clients - Clientes que serão definidios.
     */
    function saveClients(clients: Record<string, IClient<IBot>>): void;
    /**
     * Retorna o cliente pelo seu respectivo ID.
     * @param id - ID do cliente.
     * @returns O cliente associado ao ID.
     */
    function getClient(id: string): IClient<IBot>;
    /**
     * Define um cliente disponível
     * @param client - Cliente que será definido
     */
    function saveClient(client: IClient<IBot>): void;
}
