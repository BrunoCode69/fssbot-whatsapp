"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientUtils = void 0;
var ClientUtils;
(function (ClientUtils) {
    /** Gera um id único */
    function generateId() {
        return `${process.pid}-${Date.now()}-${Object.keys(ClientUtils.getClients()).length}`;
    }
    ClientUtils.generateId = generateId;
    /**
     * Retorna a lista de clientes diponíveis.
     * @returns Clientes ordenados pelo ID.
     */
    function getClients() {
        if (!('rompot-clients' in global) ||
            typeof global['rompot-clients'] != 'object') {
            global['rompot-clients'] = {};
        }
        return global['rompot-clients'];
    }
    ClientUtils.getClients = getClients;
    /**
     * Define todos os clientes diponíveis.
     * @param clients - Clientes que serão definidios.
     */
    function saveClients(clients) {
        global['rompot-clients'] = clients;
    }
    ClientUtils.saveClients = saveClients;
    /**
     * Retorna o cliente pelo seu respectivo ID.
     * @param id - ID do cliente.
     * @returns O cliente associado ao ID.
     */
    function getClient(id) {
        var _a;
        const clients = ClientUtils.getClients();
        if (id in clients && typeof clients[id] == 'object') {
            return clients[id];
        }
        if (global['default-rompot-worker'] ||
            ((_a = global['rompot-cluster-save']) === null || _a === void 0 ? void 0 : _a.worker)) {
            return ClientUtils.getClient(id);
        }
        throw new Error(`Client "${id}" not exists`);
    }
    ClientUtils.getClient = getClient;
    /**
     * Define um cliente disponível
     * @param client - Cliente que será definido
     */
    function saveClient(client) {
        if (!('rompot-clients' in global) ||
            typeof global['rompot-clients'] != 'object') {
            global['rompot-clients'] = {};
        }
        global['rompot-clients'][client.id] = client;
    }
    ClientUtils.saveClient = saveClient;
})(ClientUtils = exports.ClientUtils || (exports.ClientUtils = {}));
//# sourceMappingURL=ClientUtils.js.map