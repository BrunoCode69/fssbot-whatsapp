"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractInteractiveListSelection = void 0;
function extractInteractiveListSelection(response) {
    var _a, _b, _c, _d;
    const rawParams = (_a = response === null || response === void 0 ? void 0 : response.nativeFlowResponseMessage) === null || _a === void 0 ? void 0 : _a.paramsJson;
    if (typeof rawParams !== 'string')
        return '';
    try {
        const params = JSON.parse(rawParams);
        const selected = (_d = (_c = (_b = params.id) !== null && _b !== void 0 ? _b : params.row_id) !== null && _c !== void 0 ? _c : params.selectedId) !== null && _d !== void 0 ? _d : params.selectedRowId;
        return selected == null ? '' : String(selected);
    }
    catch (_e) {
        return '';
    }
}
exports.extractInteractiveListSelection = extractInteractiveListSelection;
//# sourceMappingURL=list-selection.js.map