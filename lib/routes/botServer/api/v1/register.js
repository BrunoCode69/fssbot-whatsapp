"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("../../../../utils/server");
const nonce_1 = __importDefault(require("../../../../utils/nonce"));
exports.default = (req, res) => {
    try {
        const { url, id } = req.body;
        if (!url) {
            server_1.ServerResponse.send(res, server_1.ServerResponse.generate(400, "Invalid url", {}), req["botServer"].options);
            return;
        }
        const webhook = { id: id || (0, nonce_1.default)(), url, ping: 0 };
        req["botServer"].registerWebhook(webhook);
        server_1.ServerResponse.send(res, server_1.ServerResponse.generate(200, "Webhook registered successfully", webhook), req["botServer"].options);
    }
    catch (error) {
        server_1.ServerResponse.send(res, server_1.ServerResponse.generateError(error), req["botServer"].options);
    }
};
//# sourceMappingURL=register.js.map