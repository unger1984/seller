export type ExternalRefType =
  | 'OZON_PRODUCT_ID'
  | 'OZON_OFFER_ID'
  | 'WB_NM_ID'
  | 'WB_CHRT_ID';

/**
 * Нормализация externalRef для MatchCandidate.
 * Числовые (OZON_PRODUCT_ID, WB_NM_ID, WB_CHRT_ID): "007" / "7" / " 7 " → "7"
 * Строковые (OZON_OFFER_ID): trim
 */
const NUMERIC_REF_TYPES: ExternalRefType[] = [
  'OZON_PRODUCT_ID',
  'WB_NM_ID',
  'WB_CHRT_ID',
];

/** Нормализовать externalRef перед записью в БД */
export function normalizeExternalRef(
  type: ExternalRefType,
  raw: string
): string {
  const trimmed = String(raw).trim();
  if (NUMERIC_REF_TYPES.includes(type)) {
    if (!/^\d+$/.test(trimmed)) {
      throw new Error(`Invalid numeric external ref: ${raw}`);
    }
    return String(BigInt(trimmed));
  }
  return trimmed;
}
