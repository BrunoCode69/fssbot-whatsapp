"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateBotServerOptions = exports.generateBotServerBase = void 0;
const http_1 = require("http");
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const pino_1 = __importDefault(require("pino"));
const routes_1 = require("../routes/botServer/routes");
const server_1 = require("../utils/server");
const nonce_1 = __importDefault(require("../utils/nonce"));
function BotServer(bot, options = {}) {
    if (!bot || typeof bot !== 'object') {
        throw new Error('Invalid bot');
    }
    const botServer = {
        ...bot,
        ...generateBotServerBase(options),
        configRoutes() {
            const app = (0, express_1.default)();
            app.use(body_parser_1.default.json({ limit: Infinity }));
            app.use(body_parser_1.default.urlencoded({ extended: true }));
            if (botServer.options.version == 'apiV1') {
                app.use(`/${botServer.options.serverId}`, (0, routes_1.apiV1)(botServer));
            }
            else {
                app.use(`/${botServer.options.serverId}`, (0, routes_1.apiV1)(botServer));
            }
            botServer.options.server.on('request', app);
            return botServer.options.server;
        },
        configEvents() {
            const emit = (eventName, arg) => {
                botServer.sendAll(server_1.ServerRequest.generate(server_1.ServerRequest.RequestMethod.EMIT, eventName, arg));
                return bot.ev.emit(eventName, arg);
            };
            bot.emit = emit;
            botServer.emit = emit;
        },
    };
    botServer.configRoutes();
    if (!options.disableAutoStart) {
        botServer.options.server.listen(options.port, () => {
            botServer.options.logger.info(`Bot Server "${botServer.options.serverId}" is running on port ${botServer.options.port}`);
        });
    }
    return botServer;
}
exports.default = BotServer;
function generateBotServerBase(partialOptions = {}) {
    const options = generateBotServerOptions(partialOptions);
    const webhooks = {};
    return {
        options,
        webhooks,
        async sendAll(body) {
            await Promise.all(Object.values(this.webhooks).map(async (webhook) => {
                try {
                    const exists = await this.pingWebhook(webhook.id);
                    if (!exists)
                        return;
                    await server_1.ServerRequest.send(webhook.url, body);
                }
                catch (error) {
                    this.options.logger.error(JSON.stringify(server_1.ServerResponse.generateError(error), undefined, 2));
                }
            }));
        },
        async pingWebhook(id) {
            try {
                await new Promise((res) => setTimeout(res, this.options.pingInterval));
                const webhook = this.webhooks[id];
                if (!webhook)
                    return false;
                if (webhook.ping >= this.options.maxPing) {
                    this.removeWebhook(id);
                    return false;
                }
                await server_1.ServerRequest.ping(webhook.url);
                webhook.ping = 0;
                return true;
            }
            catch (error) {
                const webhook = this.webhooks[id];
                if (!webhook)
                    return false;
                webhook.ping += 1;
            }
            return await this.pingWebhook(id);
        },
        registerWebhook(webhook) {
            this.webhooks[webhook.id] = webhook;
        },
        removeWebhook(id) {
            if (!this.webhooks[id])
                return false;
            delete this.webhooks[id];
            return true;
        },
    };
}
exports.generateBotServerBase = generateBotServerBase;
function generateBotServerOptions(options) {
    const botServerOptions = {
        serverId: options.serverId || (0, nonce_1.default)(),
        server: options.server || (0, http_1.createServer)(),
        port: options.port || 8080,
        disableAutoStart: !!options.disableAutoStart,
        pingInterval: options.pingInterval || 10000,
        maxPing: options.maxPing || 6,
        logger: options.logger || (0, pino_1.default)(),
        version: 'apiV1',
    };
    return botServerOptions;
}
exports.generateBotServerOptions = generateBotServerOptions;
//# sourceMappingURL=BotServer.js.map