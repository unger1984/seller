/**
 * Тесты матчинга — tests-minimum.mdc: barcode → Variant, vendorCode → Variant, приоритеты, CONFLICT.
 */
import { describe, it, expect } from 'vitest';
import { findMatchingVariant, type VariantForMatch } from './matching.js';

function v(id: string, vendorCode: string, barcodes: string[]): VariantForMatch {
  return { id, vendorCode, barcodes };
}

describe('findMatchingVariant', () => {
  const variants: VariantForMatch[] = [
    v('v1', 'SKU-001', ['4601234567890']),
    v('v2', 'SKU-002', ['4601234567891', '4601234567892']),
    v('v3', 'SKU-003', []),
  ];

  describe('barcode → Variant (приоритет над vendorCode)', () => {
    it('находит по barcode', () => {
      const r = findMatchingVariant('4601234567890', null, variants);
      expect(r).toEqual({ status: 'MATCHED', variantId: 'v1' });
    });

    it('barcode приоритетнее vendorCode при совпадении обоих', () => {
      const r = findMatchingVariant('4601234567890', 'SKU-002', variants);
      expect(r).toEqual({ status: 'MATCHED', variantId: 'v1' });
    });

    it('trim пробелов в barcode', () => {
      const r = findMatchingVariant('  4601234567890  ', null, variants);
      expect(r).toEqual({ status: 'MATCHED', variantId: 'v1' });
    });
  });

  describe('vendorCode → Variant (fallback)', () => {
    it('находит по vendorCode когда barcode нет', () => {
      const r = findMatchingVariant(null, 'SKU-002', variants);
      expect(r).toEqual({ status: 'MATCHED', variantId: 'v2' });
    });

    it('находит по vendorCode когда barcode не матчится', () => {
      const r = findMatchingVariant('999', 'SKU-003', variants);
      expect(r).toEqual({ status: 'MATCHED', variantId: 'v3' });
    });
  });

  describe('CONFLICT — несколько вариантов с одним barcode', () => {
    it('возвращает CONFLICT когда два варианта с одинаковым barcode', () => {
      const withConflict = [
        v('v1', 'SKU-A', ['460111']),
        v('v2', 'SKU-B', ['460111']),
      ];
      const r = findMatchingVariant('460111', null, withConflict);
      expect(r).toEqual({ status: 'CONFLICT' });
    });
  });

  describe('NO_MATCH', () => {
    it('нет совпадений', () => {
      const r = findMatchingVariant('999', 'UNKNOWN', variants);
      expect(r).toEqual({ status: 'NO_MATCH' });
    });

    it('пустые barcode и vendorCode', () => {
      const r = findMatchingVariant('', '', variants);
      expect(r).toEqual({ status: 'NO_MATCH' });
    });

    it('только пробелы', () => {
      const r = findMatchingVariant('  ', '  ', variants);
      expect(r).toEqual({ status: 'NO_MATCH' });
    });
  });
});
