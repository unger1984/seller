import { createHash } from 'crypto';

/**
 * Каноническое представление значения для stable stringify.
 * BigInt → string, Decimal → string, Date → ISO.
 */
function replacer(_key: string, value: unknown): unknown {
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value.toISOString();
  // Prisma Decimal (decimal.js): toString возвращает строковое число
  if (
    value &&
    typeof value === 'object' &&
    typeof (value as { toString?: () => string }).toString === 'function'
  ) {
    const str = (value as { toString: () => string }).toString();
    if (/^-?\d+(\.\d+)?$/.test(str)) return str;
  }
  return value;
}

/**
 * Стабильная сериализация объекта для хеширования.
 * BigInt → string, Date → ISO, Prisma Decimal → string.
 */
export function stableStringify(obj: unknown): string {
  return JSON.stringify(obj, replacer);
}

/**
 * SHA256 hash от stableStringify(obj).
 * Используется для snapshotHash, lastStockHash, lastPriceHash.
 */
export function sha256Hash(obj: unknown): string {
  return createHash('sha256').update(stableStringify(obj)).digest('hex');
}
