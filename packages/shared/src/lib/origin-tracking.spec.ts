/**
 * Тесты origin tracking — tests-minimum.mdc: import + push (hash, skip echo).
 */
import { describe, it, expect } from 'vitest';
import {
  shouldSkipStockUpdateOnImport,
  shouldSkipStockUpdateOnPush,
  type SyncOrigin,
} from './origin-tracking';

describe('shouldSkipStockUpdateOnImport', () => {
  it('lastStockOrigin null → не пропускать', () => {
    expect(shouldSkipStockUpdateOnImport('OZON', null)).toBe(false);
    expect(shouldSkipStockUpdateOnImport('WILDBERRIES', null)).toBe(false);
  });

  it('импорт с той же площадки что lastStockOrigin → пропускать (избегаем echo)', () => {
    expect(shouldSkipStockUpdateOnImport('OZON', 'OZON')).toBe(true);
    expect(shouldSkipStockUpdateOnImport('WILDBERRIES', 'WILDBERRIES')).toBe(
      true
    );
  });

  it('импорт с другой площадки → не пропускать', () => {
    expect(shouldSkipStockUpdateOnImport('OZON', 'WILDBERRIES')).toBe(false);
    expect(shouldSkipStockUpdateOnImport('WILDBERRIES', 'OZON')).toBe(false);
  });

  it('lastStockOrigin MASTER, импорт OZON → не пропускать', () => {
    expect(shouldSkipStockUpdateOnImport('OZON', 'MASTER')).toBe(false);
  });
});

describe('shouldSkipStockUpdateOnPush', () => {
  it('lastPushedHash null → не пропускать', () => {
    expect(shouldSkipStockUpdateOnPush('abc123', null)).toBe(false);
  });

  it('hash совпадает → пропускать (echo, избегаем цикл)', () => {
    expect(shouldSkipStockUpdateOnPush('abc123', 'abc123')).toBe(true);
  });

  it('hash различается → не пропускать', () => {
    expect(shouldSkipStockUpdateOnPush('abc123', 'xyz789')).toBe(false);
  });
});
