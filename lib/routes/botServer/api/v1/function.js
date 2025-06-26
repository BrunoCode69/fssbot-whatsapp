"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("../../../../utils/server");
exports.default = async (req, res) => {
    try {
        const { key, args } = req.body;
        if (!key || !args || !Array.isArray(args)) {
            server_1.ServerResponse.send(res, server_1.ServerResponse.generate(400, "Invalid request", {}), req["botServer"].options);
            return;
        }
        if (typeof req["botServer"].bot[key] != "function") {
            server_1.ServerResponse.send(res, server_1.ServerResponse.generate(400, "Key not is function", {}), req["botServer"].options);
            return;
        }
        const value = await req["botServer"].bot[key](...args);
        server_1.ServerResponse.send(res, server_1.ServerResponse.generate(200, "OK", { value }), req["botServer"].options);
    }
    catch (error) {
        server_1.ServerResponse.send(res, server_1.ServerResponse.generateError(error), req["botServer"].options);
    }
};
//# sourceMappingURL=function.js.map