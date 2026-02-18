/**
 * Матчинг товаров с площадки по barcode/vendorCode.
 * tests-minimum.mdc: barcode → Variant, vendorCode → Variant, приоритеты, CONFLICT.
 */

export type MatchResult =
  | { status: 'MATCHED'; variantId: string }
  | { status: 'CONFLICT' }
  | { status: 'NO_MATCH' };

/** Вариант для матчинга (упрощённое представление) */
export interface VariantForMatch {
  id: string;
  vendorCode: string;
  barcodes: string[];
}

/**
 * Найти вариант по barcode (приоритет) или vendorCode (fallback).
 * barcode имеет приоритет над vendorCode.
 * При нескольких вариантах с одним barcode → CONFLICT.
 */
export function findMatchingVariant(
  barcode: string | null,
  vendorCode: string | null,
  variants: VariantForMatch[]
): MatchResult {
  const barcodeTrimmed = barcode?.trim();
  const vendorCodeTrimmed = vendorCode?.trim();

  if (barcodeTrimmed) {
    const byBarcode = variants.filter((v) =>
      v.barcodes.some((b) => b.trim() === barcodeTrimmed)
    );
    if (byBarcode.length > 1) return { status: 'CONFLICT' };
    if (byBarcode.length === 1)
      return { status: 'MATCHED', variantId: byBarcode[0].id };
  }

  if (vendorCodeTrimmed) {
    const byVendorCode = variants.filter(
      (v) => v.vendorCode.trim() === vendorCodeTrimmed
    );
    if (byVendorCode.length > 1) return { status: 'CONFLICT' };
    if (byVendorCode.length === 1)
      return { status: 'MATCHED', variantId: byVendorCode[0].id };
  }

  return { status: 'NO_MATCH' };
}
