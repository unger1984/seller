/**
 * WB Marketplace API — обновление остатков по складу.
 * PUT /api/v3/stocks/{warehouseId}
 * Документация: dev.wildberries.ru
 */
import { createLogger } from '@seller/shared';

const log = createLogger('WbStocksClient');

const BASE = 'https://marketplace-api.wildberries.ru';
const TIMEOUT_MS = 30_000;

export type WbStockItem = { nmId: number; quantity: number };

/** Обновить остатки по складу WB. */
export async function putWbStocksForWarehouse(
  apiKey: string,
  warehouseId: string,
  items: WbStockItem[]
): Promise<void> {
  if (items.length === 0) {
    log.i('PUT WB stocks: пустой список, пропускаем', { warehouseId });
    return;
  }

  const auth = apiKey.startsWith('Bearer ') ? apiKey : `Bearer ${apiKey}`;
  const url = `${BASE}/api/v3/stocks/${warehouseId}`;
  const body = items.map(({ nmId, quantity }) => ({ nmId, quantity }));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: auth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const text = await res.text();
      let errData: string;
      try {
        errData = JSON.stringify(JSON.parse(text)).slice(0, 300);
      } catch {
        errData = text.slice(0, 300);
      }
      log.e('PUT WB stocks error', {
        warehouseId,
        status: res.status,
        response: errData,
      });
      throw new Error(`WB API обновление остатков: ${res.status} ${errData}`);
    }

    log.i('PUT WB stocks успешно', {
      warehouseId,
      itemsCount: items.length,
    });
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('WB API: таймаут при обновлении остатков');
    }
    throw err;
  }
}
