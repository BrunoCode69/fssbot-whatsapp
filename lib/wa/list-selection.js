"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractInteractiveListSelection = extractInteractiveListSelection;
function extractInteractiveListSelection(response) {
    var _a, _b;
    const rawParams = (_b = (_a = response === null || response === void 0 ? void 0 : response.nativeFlowResponseMessage) === null || _a === void 0 ? void 0 : _a.paramsJson) !== null && _b !== void 0 ? _b : undefined;
    if (typeof rawParams !== 'string')
        return '';
    try {
        const params = JSON.parse(rawParams);
        const selected = params.id ?? params.row_id ?? params.selectedId ?? params.selectedRowId;
        return selected == null ? '' : String(selected);
    }
    catch (_c) {
        return '';
    }
}