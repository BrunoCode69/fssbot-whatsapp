"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WAStatus = void 0;
const ChatStatus_1 = __importDefault(require("../modules/chat/ChatStatus"));
exports.WAStatus = {
    [ChatStatus_1.default.Typing]: "composing",
    [ChatStatus_1.default.Recording]: "recording",
    [ChatStatus_1.default.Online]: "available",
    [ChatStatus_1.default.Offline]: "unavailable",
    [ChatStatus_1.default.Paused]: "paused",
};
//# sourceMappingURL=WAStatus.js.map