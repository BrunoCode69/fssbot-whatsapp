"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CMDRunType = exports.CMDKeyType = void 0;
/** Tipo da chave do comando */
var CMDKeyType;
(function (CMDKeyType) {
    /** Chaves simples (includes all) */
    CMDKeyType["Sample"] = "sample";
    /** Chave exata (startsWith) */
    CMDKeyType["Exact"] = "exact";
})(CMDKeyType = exports.CMDKeyType || (exports.CMDKeyType = {}));
/** Tipo da execução do comando */
var CMDRunType;
(function (CMDRunType) {
    /** Execução normal */
    CMDRunType["Exec"] = "exec";
    /** Resposta ao comando */
    CMDRunType["Reply"] = "reply";
})(CMDRunType = exports.CMDRunType || (exports.CMDRunType = {}));
//# sourceMappingURL=CommandEnums.js.map