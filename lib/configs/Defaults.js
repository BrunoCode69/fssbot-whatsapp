"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CONNECTION_CONFIG = void 0;
exports.DEFAULT_CONNECTION_CONFIG = {
    disableAutoCommand: false,
    disableAutoCommandForOldMessage: true,
    disableAutoCommandForUnofficialMessage: true,
    disableAutoTyping: false,
    disableAutoRead: false,
    maxReconnectTimes: 12,
    reconnectTimeout: 1000,
    // 1 s, 2 s, 4 s ... até 60 s: as 12 tentativas cobrem uns 6 minutos de queda.
    maxReconnectTimeout: 60000,
    maxRequests: 3,
    requestsDelay: 100,
    maxTimeout: 10000, // 10 seconds
};
//# sourceMappingURL=Defaults.js.map