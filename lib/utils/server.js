"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerResponse = exports.ServerRequest = void 0;
const axios_1 = __importDefault(require("axios"));
var ServerRequest;
(function (ServerRequest) {
    let RequestMethod;
    (function (RequestMethod) {
        RequestMethod["EMIT"] = "emit";
        RequestMethod["SET"] = "set";
        RequestMethod["POST"] = "post";
    })(RequestMethod = ServerRequest.RequestMethod || (ServerRequest.RequestMethod = {}));
    async function ping(url) {
        await axios_1.default.get(`${url}/ping`);
    }
    ServerRequest.ping = ping;
    async function send(url, body) {
        if (body.method == ServerRequest.RequestMethod.EMIT) {
            await axios_1.default.patch(`${url}/emit`, body);
        }
        else if (body.method == ServerRequest.RequestMethod.SET) {
            await axios_1.default.patch(`${url}/set`, body);
        }
        else if (body.method == ServerRequest.RequestMethod.POST) {
            await axios_1.default.post(`${url}/post`, body);
        }
    }
    ServerRequest.send = send;
    function generate(method, key, ...args) {
        const response = {
            method,
            key,
            args,
        };
        return response;
    }
    ServerRequest.generate = generate;
})(ServerRequest = exports.ServerRequest || (exports.ServerRequest = {}));
var ServerResponse;
(function (ServerResponse) {
    function send(response, body, options) {
        try {
            return response.status(body.status).send(body);
        }
        catch (error) {
            try {
                body = ServerResponse.generateError(error);
                return response.status(body.status).send(body);
            }
            catch (error) {
                options.logger.error(JSON.stringify(ServerResponse.generateError(error), undefined, 2));
            }
        }
    }
    ServerResponse.send = send;
    function generate(status, message, data) {
        const response = {
            status: Number(status) || 500,
            message,
            data,
        };
        return response;
    }
    ServerResponse.generate = generate;
    function generateError(err, status = 500, message = 'Internal error') {
        const error = JSON.stringify(err === null || err === void 0 ? void 0 : err.message, undefined, 2);
        const stack = JSON.stringify((err === null || err === void 0 ? void 0 : err.stack) || '', undefined, 2);
        return generate(status, message, { error, stack });
    }
    ServerResponse.generateError = generateError;
})(ServerResponse = exports.ServerResponse || (exports.ServerResponse = {}));
//# sourceMappingURL=server.js.map