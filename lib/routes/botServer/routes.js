"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiV1 = exports.RouterMethod = void 0;
const express_1 = require("express");
const setBotServer_1 = __importDefault(require("./middlewares/setBotServer"));
const ping_1 = __importDefault(require("./api/v1/ping"));
const emitEvent_1 = __importDefault(require("./api/v1/emitEvent"));
const setValue_1 = __importDefault(require("./api/v1/setValue"));
const function_1 = __importDefault(require("./api/v1/function"));
const register_1 = __importDefault(require("./api/v1/register"));
const unregister_1 = __importDefault(require("./api/v1/unregister"));
var RouterMethod;
(function (RouterMethod) {
    RouterMethod["PATCH"] = "patch";
    RouterMethod["POST"] = "post";
    RouterMethod["GET"] = "get";
})(RouterMethod = exports.RouterMethod || (exports.RouterMethod = {}));
function apiV1(botServer) {
    const routes = (0, express_1.Router)();
    const baseUrl = `/api/v1`;
    routes.get(`${baseUrl}/ping`, (0, setBotServer_1.default)(botServer), ping_1.default);
    routes.patch(`${baseUrl}/emitEvent`, (0, setBotServer_1.default)(botServer), emitEvent_1.default);
    routes.patch(`${baseUrl}/setValue`, (0, setBotServer_1.default)(botServer), setValue_1.default);
    routes.patch(`${baseUrl}/function`, (0, setBotServer_1.default)(botServer), function_1.default);
    routes.post(`${baseUrl}/register`, (0, setBotServer_1.default)(botServer), register_1.default);
    routes.post(`${baseUrl}/unregister`, (0, setBotServer_1.default)(botServer), unregister_1.default);
    return routes;
}
exports.apiV1 = apiV1;
//# sourceMappingURL=routes.js.map