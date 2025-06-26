"use strict";
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _TelegramAuth_botToken;
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = require("fs/promises");
const fs_1 = require("fs");
const path_1 = require("path");
class TelegramAuth {
    constructor(botToken, sessionsDir = "./telegram-session", autoCreateDir = true) {
        _TelegramAuth_botToken.set(this, void 0);
        this.fixFileName = (file) => { var _a; return (_a = file === null || file === void 0 ? void 0 : file.replace(/\//g, "__")) === null || _a === void 0 ? void 0 : _a.replace(/:/g, "-"); };
        this.sessionsDir = sessionsDir;
        __classPrivateFieldSet(this, _TelegramAuth_botToken, `${botToken || ""}`, "f");
        this.autoCreateDir = autoCreateDir;
        this.prepare();
    }
    getStat(folder) {
        try {
            return (0, fs_1.statSync)(folder);
        }
        catch (err) {
            return null;
        }
    }
    setBotToken(botToken) {
        __classPrivateFieldSet(this, _TelegramAuth_botToken, `${botToken || ""}`, "f");
    }
    prepare() {
        if (this.autoCreateDir) {
            const folderInfo = this.getStat(this.sessionsDir);
            if (folderInfo) {
                if (!folderInfo.isDirectory()) {
                    throw new Error(`found something that is not a directory at "${this.sessionsDir}", either delete it or specify a different location`);
                }
            }
            else {
                if (this.autoCreateDir) {
                    (0, fs_1.mkdirSync)(this.sessionsDir, { recursive: true });
                }
            }
        }
    }
    getSession(...paths) {
        return (0, path_1.join)(`${this.sessionsDir}`, ...paths);
    }
    async get(file) {
        try {
            if (file == "BOT_TOKEN") {
                return __classPrivateFieldGet(this, _TelegramAuth_botToken, "f");
            }
            const data = await (0, promises_1.readFile)(this.getSession(this.fixFileName(`${file}.json`)), { encoding: "utf-8" });
            return JSON.parse(data);
        }
        catch (error) {
            return null;
        }
    }
    async set(file, data) {
        try {
            if (!data) {
                await this.remove(file);
            }
            else {
                await (0, promises_1.writeFile)(this.getSession(this.fixFileName(`${file}.json`)), JSON.stringify(data));
            }
        }
        catch (_a) { }
    }
    async remove(file) {
        try {
            await (0, promises_1.unlink)(this.getSession(this.fixFileName(`${file}.json`)));
        }
        catch (_a) { }
    }
    async listAll(pattern = "") {
        try {
            return (0, fs_1.readdirSync)(this.getSession()).reduce((p, c) => (c.startsWith(pattern) ? [...p, c.replace(".json", "")] : p), []);
        }
        catch (error) {
            return [];
        }
    }
}
exports.default = TelegramAuth;
_TelegramAuth_botToken = new WeakMap();
//# sourceMappingURL=TelegramAuth.js.map