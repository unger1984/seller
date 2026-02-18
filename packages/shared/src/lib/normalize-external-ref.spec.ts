/**
 * Тесты normalizeExternalRef — tests-minimum.mdc: "007"/"7"/" 7 " → один ключ; "7.0", "-7", "7e3", "" → 400
 */
import { describe, it, expect } from 'vitest';
import {
  normalizeExternalRef,
  type ExternalRefType,
} from './normalize-external-ref';

const NUMERIC_TYPES: ExternalRefType[] = [
  'OZON_PRODUCT_ID',
  'WB_NM_ID',
  'WB_CHRT_ID',
];

describe('normalizeExternalRef', () => {
  describe('числовые типы — "007"/"7"/" 7 " → один ключ', () => {
    NUMERIC_TYPES.forEach((type) => {
      it(`${type}: "007", "7", " 7 " → "7"`, () => {
        expect(normalizeExternalRef(type, '007')).toBe('7');
        expect(normalizeExternalRef(type, '7')).toBe('7');
        expect(normalizeExternalRef(type, ' 7 ')).toBe('7');
      });
    });
  });

  describe('числовые типы — невалидные вводы → Error', () => {
    const invalid = [
      { raw: '7.0', desc: 'дробное' },
      { raw: '-7', desc: 'отрицательное' },
      { raw: '7e3', desc: 'научная нотация' },
      { raw: '', desc: 'пустая строка' },
      { raw: '  ', desc: 'пробелы' },
      { raw: 'abc', desc: 'буквы' },
    ];

    invalid.forEach(({ raw, desc }) => {
      NUMERIC_TYPES.forEach((type) => {
        it(`${type}: "${raw}" (${desc}) → Error`, () => {
          expect(() => normalizeExternalRef(type, raw)).toThrow();
        });
      });
    });
  });

  describe('OZON_OFFER_ID — trim, не числовая нормализация', () => {
    it('trim пробелов', () => {
      expect(normalizeExternalRef('OZON_OFFER_ID', '  SKU-001  ')).toBe(
        'SKU-001'
      );
    });
    it('сохраняет артикул как есть (после trim)', () => {
      expect(normalizeExternalRef('OZON_OFFER_ID', 'OFFER-123')).toBe(
        'OFFER-123'
      );
    });
  });
});
