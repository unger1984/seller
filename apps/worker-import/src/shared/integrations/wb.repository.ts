/**
 * Wildberries API — WbApiRepository.
 * Content API (cards), Marketplace API (warehouses, stocks), Discounts-Prices API.
 * Документация: dev.wildberries.ru/docs/openapi
 */
import axios, { AxiosError, AxiosInstance } from 'axios';
import { createLogger } from '@seller/shared';
import type {
  WbCard,
  WbCardsListRequest,
  WbCardsListResponse,
  WbCredentials,
  WbPricesFilterResponse,
  WbStockResponseItem,
  WbStocksByWarehousesResult,
  WbWarehouse,
} from '../dto/wb.dto';

const CONTENT_BASE = 'https://content-api.wildberries.ru';
const MARKETPLACE_BASE = 'https://marketplace-api.wildberries.ru';
const PRICES_BASE = 'https://discounts-prices-api.wildberries.ru';
const REQUEST_TIMEOUT_MS = 60_000;
const CARDS_PAGE_LIMIT = 100;
const PRICES_PAGE_LIMIT = 1000;
const CHRT_IDS_BATCH_SIZE = 1000;

export class WbApiRepository {
  private readonly log = createLogger(WbApiRepository.name);
  private readonly contentClient: AxiosInstance;
  private readonly marketplaceClient: AxiosInstance;
  private readonly pricesClient: AxiosInstance;

  constructor(creds: WbCredentials) {
    const authHeader = creds.apiKey.startsWith('Bearer ')
      ? creds.apiKey
      : `Bearer ${creds.apiKey}`;

    this.contentClient = axios.create({
      baseURL: CONTENT_BASE,
      timeout: REQUEST_TIMEOUT_MS,
      headers: {
        Authorization: creds.apiKey,
        'Content-Type': 'application/json',
      },
    });

    this.marketplaceClient = axios.create({
      baseURL: MARKETPLACE_BASE,
      timeout: REQUEST_TIMEOUT_MS,
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
    });

    this.pricesClient = axios.create({
      baseURL: PRICES_BASE,
      timeout: REQUEST_TIMEOUT_MS,
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
    });
  }

  private handleError(err: unknown, context: string, url?: string): never {
    if (err instanceof AxiosError) {
      const status = err.response?.status;
      const data = err.response?.data;
      this.log.e(`WB API ${context}`, {
        url: url ?? err.config?.url,
        status,
        responseData:
          typeof data === 'object'
            ? JSON.stringify(data).slice(0, 500)
            : String(data),
      });
      throw new Error(
        `WB API: ${status ?? 'network'} ${err.message} ${JSON.stringify(data ?? {}).slice(0, 200)}`
      );
    }
    throw err;
  }

  /** Карточки с пагинацией. POST /content/v2/get/cards/list */
  async getCardsList(): Promise<WbCard[]> {
    const url = '/content/v2/get/cards/list';
    const all: WbCard[] = [];
    let cursor: WbCardsListResponse['cursor'] | undefined;

    do {
      const body: WbCardsListRequest = {
        settings: {
          sort: { ascending: true },
          cursor: cursor
            ? {
                limit: CARDS_PAGE_LIMIT,
                updatedAt: cursor.updatedAt,
                nmID: cursor.nmID,
              }
            : { limit: CARDS_PAGE_LIMIT },
          filter: { withPhoto: -1 },
        },
      };

      try {
        const res = await this.contentClient.post<WbCardsListResponse>(
          url,
          body
        );
        const data = res.data;
        const cards = data.cards ?? [];
        all.push(...cards);
        cursor = data.cursor;

        this.log.i('WB cards/list page', {
          pageCards: cards.length,
          accumulated: all.length,
          hasMore:
            !!cursor && cards.length >= (cursor.limit ?? CARDS_PAGE_LIMIT),
        });

        if (cards.length < (cursor?.limit ?? CARDS_PAGE_LIMIT)) break;
      } catch (err) {
        this.handleError(err, 'cards/list', `${CONTENT_BASE}${url}`);
      }
    } while (cursor);

    this.log.i('WB cards/list done', { total: all.length });
    return all;
  }

  /** Цены. GET /api/v2/list/goods/filter */
  async getPrices(): Promise<Map<string, number>> {
    const url = '/api/v2/list/goods/filter';
    const byNmId = new Map<string, number>();
    let lastId: string | undefined;

    do {
      try {
        const params: Record<string, string> = {
          limit: String(PRICES_PAGE_LIMIT),
        };
        if (lastId) params.lastId = lastId;

        const res = await this.pricesClient.get<WbPricesFilterResponse>(url, {
          params,
        });
        const data = res.data.data;
        const goods = data.listGoods ?? (Array.isArray(data) ? data : []);
        for (const item of goods) {
          const nmId =
            item.nmId ?? (item as unknown as { nmID?: number }).nmID ?? null;
          if (nmId == null) continue;
          const key = String(nmId);

          let val: number | null = null;

          const sizes = item.sizes ?? [];
          if (sizes.length > 0) {
            for (const sz of sizes) {
              const effective =
                sz.price ??
                sz.discountedPrice ??
                sz.clubDiscountedPrice ??
                null;
              if (effective != null) {
                const n = Number(effective);
                if (!Number.isNaN(n) && (val == null || n < val)) val = n;
              }
            }
          }

          if (val == null) {
            const topLevel =
              item.price ??
              (item as unknown as { Price?: number }).Price ??
              null;
            if (topLevel != null) {
              const n = Number(topLevel);
              if (!Number.isNaN(n)) val = n;
            }
          }

          if (val != null) {
            const existing = byNmId.get(key);
            if (existing == null || val < existing) {
              byNmId.set(key, val);
            }
          }
        }
        lastId = (data.cursor as { lastId?: string } | undefined)?.lastId;
        this.log.i('WB prices/filter page', {
          pageGoods: goods.length,
          accumulated: byNmId.size,
          hasMore: !!lastId,
        });
        if (goods.length === 0 || !lastId) break;
      } catch (err) {
        this.handleError(err, 'prices/filter', `${PRICES_BASE}${url}`);
      }
    } while (lastId);

    this.log.i('WB prices loaded', { uniqueNmIds: byNmId.size });
    return byNmId;
  }

  /** Список складов. GET /api/v3/warehouses */
  async getWarehouses(): Promise<WbWarehouse[]> {
    const url = '/api/v3/warehouses';
    try {
      const res = await this.marketplaceClient.get<
        WbWarehouse[] | { warehouses?: WbWarehouse[] }
      >(url);
      const data = res.data;
      const list = Array.isArray(data) ? data : (data?.warehouses ?? []);
      this.log.i('WB warehouses loaded', { count: list.length });
      return list;
    } catch (err) {
      this.handleError(err, 'warehouses', `${MARKETPLACE_BASE}${url}`);
    }
  }

  /** Остатки по складу. POST /api/v3/stocks/{warehouseId} */
  async getStocksForWarehouse(
    warehouseId: string,
    chrtIds: number[]
  ): Promise<Array<{ chrtId: number; amount: number }>> {
    const url = `/api/v3/stocks/${warehouseId}`;
    const result: Array<{ chrtId: number; amount: number }> = [];

    for (let i = 0; i < chrtIds.length; i += CHRT_IDS_BATCH_SIZE) {
      const batch = chrtIds.slice(i, i + CHRT_IDS_BATCH_SIZE);
      if (batch.length === 0) continue;
      try {
        const res = await this.marketplaceClient.post<
          { stocks?: WbStockResponseItem[] } | WbStockResponseItem[]
        >(url, { chrtIds: batch });
        const data = res.data;
        const rows = Array.isArray(data)
          ? data
          : ((data as { stocks?: WbStockResponseItem[] })?.stocks ?? []);
        for (const row of rows) {
          const chrtId = row.chrtId ?? null;
          if (chrtId == null) continue;
          const amount = Number(row.amount ?? 0) || 0;
          result.push({ chrtId, amount });
        }
      } catch (err) {
        this.handleError(err, 'stocks/warehouse', `${MARKETPLACE_BASE}${url}`);
      }
    }
    return result;
  }

  /** Остатки по всем складам */
  async getStocksByWarehouses(
    chrtIds: number[],
    chrtIdToNmId: Map<number, string>
  ): Promise<WbStocksByWarehousesResult> {
    const warehouses = await this.getWarehouses();
    if (warehouses.length === 0) {
      this.log.i('WB warehouses пуст, остатки не загружены');
      return { warehouses: [], stocksByWarehouses: new Map() };
    }
    if (chrtIds.length === 0) {
      this.log.i('WB chrtIds пуст, остатки не загружены');
      return { warehouses, stocksByWarehouses: new Map() };
    }

    const byNmId = new Map<string, Record<string, number>>();
    for (const wh of warehouses) {
      const wid =
        wh.id ?? (wh as unknown as { warehouseId?: number }).warehouseId;
      if (wid == null) continue;
      const widStr = String(wid);
      const stocks = await this.getStocksForWarehouse(widStr, chrtIds);
      for (const { chrtId, amount } of stocks) {
        const nmId = chrtIdToNmId.get(chrtId);
        if (!nmId) continue;
        const cur = byNmId.get(nmId) ?? {};
        cur[widStr] = (cur[widStr] ?? 0) + amount;
        byNmId.set(nmId, cur);
      }
    }
    this.log.i('WB stocks by warehouses loaded', {
      warehouses: warehouses.length,
      uniqueNmIds: byNmId.size,
    });
    return { warehouses, stocksByWarehouses: byNmId };
  }

  /** chrtId -> nmId из карточек (sizes[].chrtID) */
  static buildChrtIdToNmIdIndex(cards: WbCard[]): Map<number, string> {
    const index = new Map<number, string>();
    for (const card of cards) {
      const nmId = String(card.nmID);
      for (const sz of card.sizes ?? []) {
        const chrtId = sz.chrtID ?? sz.chrtId;
        if (chrtId != null) {
          index.set(Number(chrtId), nmId);
        }
      }
    }
    return index;
  }
}
