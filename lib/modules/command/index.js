"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Command = exports.CommandKey = exports.CommandPermission = exports.CommandControllerEvent = exports.CommandController = void 0;
const CommandControllerEvent_1 = __importDefault(require("./CommandControllerEvent"));
exports.CommandControllerEvent = CommandControllerEvent_1.default;
const CommandController_1 = __importDefault(require("./CommandController"));
exports.CommandController = CommandController_1.default;
const CommandPermission_1 = __importDefault(require("./CommandPermission"));
exports.CommandPermission = CommandPermission_1.default;
const CommandKey_1 = __importDefault(require("./CommandKey"));
exports.CommandKey = CommandKey_1.default;
const Command_1 = __importDefault(require("./Command"));
exports.Command = Command_1.default;
__exportStar(require("./Command"), exports);
__exportStar(require("./defaults"), exports);
__exportStar(require("./perms"), exports);
__exportStar(require("./CommandEnums"), exports);
__exportStar(require("./keys"), exports);
//# sourceMappingURL=index.js.map