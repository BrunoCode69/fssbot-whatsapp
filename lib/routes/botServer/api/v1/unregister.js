"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("../../../../utils/server");
exports.default = (req, res) => {
    try {
        const { id } = req.body;
        if (!id) {
            server_1.ServerResponse.send(res, server_1.ServerResponse.generate(400, "Invalid id", {}), req["botServer"].options);
            return;
        }
        const removed = req["botServer"].removeWebhook(id);
        if (!removed) {
            server_1.ServerResponse.send(res, server_1.ServerResponse.generate(400, "Webhook not registred", {}), req["botServer"].options);
            return;
        }
        server_1.ServerResponse.send(res, server_1.ServerResponse.generate(200, "Webhook unregistered successfully", { id }), req["botServer"].options);
    }
    catch (error) {
        server_1.ServerResponse.send(res, server_1.ServerResponse.generateError(error), req["botServer"].options);
    }
};
//# sourceMappingURL=unregister.js.map