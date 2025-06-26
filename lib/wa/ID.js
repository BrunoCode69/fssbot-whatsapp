"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getID = exports.getPhoneNumber = exports.fixID = void 0;
function fixID(id) {
    return id.replace(/:(.*)@/, "@");
}
exports.fixID = fixID;
function getPhoneNumber(id) {
    return (id === null || id === void 0 ? void 0 : id.replace(/\D+/g, "")) || "0";
}
exports.getPhoneNumber = getPhoneNumber;
/** * Obter o id de um número */
function getID(id) {
    id = String(`${id}`);
    if (!id.includes("@"))
        id = `${id}@s.whatsapp.net`;
    return id.trim();
}
exports.getID = getID;
//# sourceMappingURL=ID.js.map