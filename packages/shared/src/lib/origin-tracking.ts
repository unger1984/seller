/**
 * Origin tracking — защита от ping-pong при sync.
 * tests-minimum.mdc: при импорте не перезаписывать master, если lastStockOrigin уже с этой площадки.
 */

/** Источник данных (соответствует Prisma SyncOrigin) */
export type SyncOrigin = 'MASTER' | 'OZON' | 'WILDBERRIES';

/**
 * Следует ли пропустить обновление остатка при импорте с площадки.
 * Возвращает true если импорт с того же источника, что и lastStockOrigin — избегаем echo.
 */
export function shouldSkipStockUpdateOnImport(
  importOrigin: SyncOrigin,
  lastStockOrigin: SyncOrigin | null
): boolean {
  if (!lastStockOrigin) return false;
  return importOrigin === lastStockOrigin;
}

/**
 * Следует ли пропустить обновление при push (защита от echo).
 * Если hash импортированных данных совпадает с hash того, что мы только что отправили — это echo, пропускаем.
 */
export function shouldSkipStockUpdateOnPush(
  importedHash: string,
  lastPushedHash: string | null
): boolean {
  if (!lastPushedHash) return false;
  return importedHash === lastPushedHash;
}
