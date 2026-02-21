import type { VariantRow } from '../types';

export function formatPlacementStatus(
  v: VariantRow,
  hasOzon: boolean,
  hasWb: boolean
): string {
  const parts: string[] = [];
  if (hasOzon && v.placementStatusOzon) {
    parts.push(`Ozon: ${v.placementStatusOzon}`);
  }
  if (hasWb && v.placementStatusWb) {
    parts.push(`ВБ: ${v.placementStatusWb}`);
  }
  return parts.length > 0 ? parts.join(', ') : '—';
}
