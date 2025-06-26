"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("../../../../utils/server");
exports.default = (req, res) => {
    try {
        server_1.ServerResponse.send(res, server_1.ServerResponse.generate(200, `PING ${new Date().toISOString()}`, {}), req["botServer"].options);
    }
    catch (error) {
        server_1.ServerResponse.send(res, server_1.ServerResponse.generateError(error), req["botServer"].options);
    }
};
//# sourceMappingURL=ping.js.map