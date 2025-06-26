"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBaileysAuth = exports.MultiFileAuthState = void 0;
const baileys_1 = require("@whiskeysockets/baileys");
const promises_1 = require("fs/promises");
const fs_1 = require("fs");
const path_1 = require("path");
class MultiFileAuthState {
    constructor(folder, botPhoneNumber = '', autoCreateDir = true) {
        this.fixFileName = (file) => { var _a; return (_a = file === null || file === void 0 ? void 0 : file.replace(/\//g, '__')) === null || _a === void 0 ? void 0 : _a.replace(/:/g, '-'); };
        this.folder = folder;
        this.botPhoneNumber = botPhoneNumber;
        this.autoCreateDir = autoCreateDir;
        this.prepare();
    }
    getStat(folder) {
        try {
            return (0, fs_1.statSync)(folder);
        }
        catch (_a) {
            return null;
        }
    }
    prepare() {
        if (this.autoCreateDir) {
            const folderInfo = this.getStat(this.folder);
            if (folderInfo) {
                if (!folderInfo.isDirectory()) {
                    throw new Error(`found something that is not a directory at "${this.folder}", either delete it or specify a different location`);
                }
            }
            else {
                if (this.autoCreateDir) {
                    (0, fs_1.mkdirSync)(this.folder, { recursive: true });
                }
            }
        }
    }
    async get(file) {
        try {
            const data = await (0, promises_1.readFile)((0, path_1.join)(this.folder, this.fixFileName(`${file}.json`)), { encoding: 'utf-8' });
            return JSON.parse(data, baileys_1.BufferJSON.reviver);
        }
        catch (_a) {
            return null;
        }
    }
    async set(file, data) {
        try {
            if (!data) {
                await (0, promises_1.unlink)((0, path_1.join)(this.folder, this.fixFileName(`${file}.json`)));
            }
            else {
                await (0, promises_1.writeFile)((0, path_1.join)(this.folder, this.fixFileName(`${file}.json`)), JSON.stringify(data, baileys_1.BufferJSON.replacer));
            }
        }
        catch (_a) { }
    }
    async remove(file) {
        try {
            await (0, promises_1.unlink)((0, path_1.join)(this.folder, this.fixFileName(`${file}.json`)));
        }
        catch (_a) { }
    }
    async listAll(pattern = '') {
        try {
            return (0, fs_1.readdirSync)((0, path_1.join)(this.folder)).reduce((p, c) => (c.startsWith(pattern) ? [...p, c.replace('.json', '')] : p), []);
        }
        catch (_a) {
            return [];
        }
    }
}
exports.MultiFileAuthState = MultiFileAuthState;
const getBaileysAuth = async (auth) => {
    auth.prepare();
    const replacer = (data) => {
        try {
            const json = JSON.parse(JSON.stringify(data, baileys_1.BufferJSON.replacer), baileys_1.BufferJSON.reviver);
            return json;
        }
        catch (_a) {
            return data;
        }
    };
    const creds = replacer(await auth.get('creds')) || (0, baileys_1.initAuthCreds)();
    return {
        state: {
            creds,
            keys: {
                async get(type, ids) {
                    const data = {};
                    await Promise.all(ids.map(async (id) => {
                        let value = await replacer(await auth.get(`${type}-${id}`));
                        if (type === 'app-state-sync-key' && value) {
                            value = baileys_1.proto.Message.AppStateSyncKeyData.fromObject(value);
                        }
                        data[id] = value;
                    }));
                    return data;
                },
                async set(data) {
                    await Promise.all(Object.keys(data).map((category) => {
                        return Promise.all(Object.keys(data[category]).map(async (id) => {
                            const value = data[category][id];
                            if (!value) {
                                return auth.remove(`${category}-${id}`);
                            }
                            else {
                                return auth.set(`${category}-${id}`, value);
                            }
                        }));
                    }));
                },
            },
        },
        async saveCreds() {
            return await auth.set('creds', creds);
        },
    };
};
exports.getBaileysAuth = getBaileysAuth;
//# sourceMappingURL=Auth.js.map