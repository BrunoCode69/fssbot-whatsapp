"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
class BaseService {
    static async get(path, body = {}) {
        return await axios_1.default.get(path, body);
    }
    static async post(path, body = {}) {
        return await axios_1.default.post(path, body);
    }
    static async patch(path, body = {}) {
        return await axios_1.default.patch(path, body);
    }
}
exports.default = BaseService;
//# sourceMappingURL=BaseService.js.map