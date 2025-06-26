"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkerMessageTag = void 0;
const Generic_1 = require("../utils/Generic");
/** Tag da mensagem do worker */
var WorkerMessageTag;
(function (WorkerMessageTag) {
    WorkerMessageTag["Void"] = "";
    WorkerMessageTag["Error"] = "error";
    WorkerMessageTag["Func"] = "func";
    WorkerMessageTag["Result"] = "result";
    WorkerMessageTag["Event"] = "event";
    WorkerMessageTag["Patch"] = "patch";
})(WorkerMessageTag = exports.WorkerMessageTag || (exports.WorkerMessageTag = {}));
/** Mensagem do worker */
class WorkerMessage {
    constructor(tag = WorkerMessageTag.Void, data = {}, autoCancel = true) {
        /** Identificador único da mensagem */
        this.uid = '';
        /** ID do cliente da mensagem */
        this.clientId = '';
        /** É de um cliente principal */
        this.isMain = false;
        /** É uma mensagem para o processo principal */
        this.isPrimary = false;
        /** ID da mensagem */
        this.id = '';
        this.tag = tag;
        this.data = data;
        this.autoCancel = autoCancel;
    }
    getData() {
        const data = this.data || {};
        if (this.tag == WorkerMessageTag.Error) {
            return { reason: data.reason || '' };
        }
        if (this.tag == WorkerMessageTag.Result) {
            return { result: data.result };
        }
        if (this.tag == WorkerMessageTag.Event) {
            return { name: data.name || '', arg: data.arg };
        }
        if (this.tag == WorkerMessageTag.Func) {
            return { name: data.name || '', args: data.args || [] };
        }
        if (this.tag == WorkerMessageTag.Patch) {
            return { key: data.key || '', value: data.value };
        }
        return {};
    }
    clone(data = {}) {
        return WorkerMessage.fromJSON({ ...this.toJSON(), ...data });
    }
    apply(data) {
        if (typeof data != 'object') {
            return this;
        }
        for (const key of Object.keys(data)) {
            this[key] = data[key];
        }
        return this;
    }
    toJSON() {
        const data = {};
        for (const key of Object.keys(this)) {
            if (key == 'toJSON')
                continue;
            data[key] = this[key];
        }
        return JSON.parse(JSON.stringify(data));
    }
    static fromJSON(data) {
        return (0, Generic_1.injectJSON)(JSON.parse(JSON.stringify(data), (_, value) => {
            if (typeof value === 'object' &&
                !!value &&
                (value.buffer === true || value.type === 'Buffer')) {
                return Buffer.from(value.data || value.value || []);
            }
            return value;
        }), new WorkerMessage());
    }
}
exports.default = WorkerMessage;
//# sourceMappingURL=WorkerMessage.js.map