export function extractInteractiveListSelection(response: any): string {
  const rawParams = response?.nativeFlowResponseMessage?.paramsJson;
  if (typeof rawParams !== 'string') return '';

  try {
    const params = JSON.parse(rawParams);
    const selected = params.id ?? params.row_id ?? params.selectedId ?? params.selectedRowId;
    return selected == null ? '' : String(selected);
  } catch {
    return '';
  }
}