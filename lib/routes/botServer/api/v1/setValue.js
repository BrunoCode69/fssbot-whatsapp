"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("../../../../utils/server");
exports.default = (req, res) => {
    try {
        const { key, args } = req.body;
        if (!key || !args || !Array.isArray(args) || args.length == 0) {
            server_1.ServerResponse.send(res, server_1.ServerResponse.generate(400, "Invalid request", {}), req["botServer"].options);
            return;
        }
        req["botServer"].bot[key] = args[0];
        server_1.ServerResponse.send(res, server_1.ServerResponse.generate(200, "OK", {}), req["botServer"].options);
    }
    catch (error) {
        server_1.ServerResponse.send(res, server_1.ServerResponse.generateError(error), req["botServer"].options);
    }
};
//# sourceMappingURL=setValue.js.map