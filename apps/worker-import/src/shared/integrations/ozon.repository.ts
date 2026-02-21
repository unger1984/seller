/**
 * Ozon Seller API — OzonApiRepository с retry/backoff, keepAlive, батчинг.
 * v3/product/list, v3/product/info/list, v4/product/info/attributes,
 * v1/product/info/description, v1/warehouse/list, v2/product/pictures/info,
 * v5/product/info/prices, v1/product/info/stocks-by-warehouse/fbs.
 */
import axios, {
  AxiosError,
  AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';
import https from 'node:https';
import http from 'node:http';
import pLimit from 'p-limit';
import { createLogger } from '@seller/shared';
import type {
  OzonAttributesResponse,
  OzonCredentials,
  OzonDescription,
  OzonPicture,
  OzonPicturesResponse,
  OzonPriceItem,
  OzonPricesResponse,
  OzonProductAttributes,
  OzonProductInfo,
  OzonProductInfoResponse,
  OzonProductItem,
  OzonProductListResponse,
  OzonStocksByWarehouseResponse,
  OzonWarehouse,
  OzonWarehouseListResponse,
} from '../dto/ozon.dto';

const BASE = 'https://api-seller.ozon.ru';
const REQUEST_TIMEOUT_MS = 60_000;
const RETRY_MAX_ATTEMPTS = 5;
const RETRY_BASE_DELAY_MS = 1000;
const RETRY_MAX_DELAY_MS = 60_000;
const LIST_PAGE_LIMIT = 1000;
const INFO_LIST_BATCH_SIZE = 500;
const INFO_LIST_MAX_CONCURRENCY = 3;
const PICTURES_BATCH_SIZE = 100;
const PRICES_BATCH_SIZE = 1000;
const STOCKS_BATCH_SIZE = 100;

function createRetryDelay(
  attempt: number,
  retryAfterHeader?: string | null
): number {
  if (retryAfterHeader) {
    const seconds = parseInt(retryAfterHeader, 10);
    if (!Number.isNaN(seconds) && seconds > 0) {
      return Math.min(seconds * 1000, RETRY_MAX_DELAY_MS);
    }
  }
  const exponential = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
  const jitter = Math.random() * 0.3 * exponential;
  return Math.min(exponential + jitter, RETRY_MAX_DELAY_MS);
}

function shouldRetry(status: number | undefined): boolean {
  if (status == null) return true;
  if (status === 429) return true;
  if (status >= 500 && status < 600) return true;
  return false;
}

type Logger = ReturnType<typeof createLogger>;

function addRetryInterceptor(
  instance: AxiosInstance,
  retryCountRef: { count: number },
  log: Logger
): void {
  instance.interceptors.response.use(
    (res) => res,
    async (err: AxiosError) => {
      const config = err.config as InternalAxiosRequestConfig & {
        _retryCount?: number;
      };
      if (!config) return Promise.reject(err);

      const status = err.response?.status;
      const attempt = config._retryCount ?? 0;

      if (!shouldRetry(status) || attempt >= RETRY_MAX_ATTEMPTS) {
        return Promise.reject(err);
      }

      config._retryCount = attempt + 1;
      retryCountRef.count += 1;

      const retryAfter =
        err.response?.headers?.['retry-after'] ??
        err.response?.headers?.['Retry-After'];
      const delay = createRetryDelay(attempt, retryAfter);

      log.w('Ozon API retry', {
        status,
        attempt: attempt + 1,
        maxAttempts: RETRY_MAX_ATTEMPTS,
        delayMs: Math.round(delay),
        url: config.url,
        retryAfter: retryAfter ?? undefined,
      });

      await new Promise((r) => setTimeout(r, delay));
      return instance.request(config);
    }
  );
}

export class OzonApiRepository {
  private readonly log = createLogger(OzonApiRepository.name);
  private readonly axiosInstance: AxiosInstance;
  private _apiRequestCount = 0;
  private readonly _retryCountRef = { count: 0 };

  constructor(creds: OzonCredentials) {
    const httpsAgent = new https.Agent({ keepAlive: true });
    const httpAgent = new http.Agent({ keepAlive: true });

    this.axiosInstance = axios.create({
      baseURL: BASE,
      timeout: REQUEST_TIMEOUT_MS,
      headers: {
        'Client-Id': creds.clientId,
        'Api-Key': creds.apiKey,
        'Content-Type': 'application/json',
      },
      httpsAgent,
      httpAgent,
    });

    this.axiosInstance.interceptors.request.use((cfg) => {
      this._apiRequestCount += 1;
      return cfg;
    });
    addRetryInterceptor(this.axiosInstance, this._retryCountRef, this.log);
  }

  get apiRequestCount(): number {
    return this._apiRequestCount;
  }

  get retryCount(): number {
    return this._retryCountRef.count;
  }

  private handleApiError(err: unknown, context: string): never {
    if (err instanceof AxiosError) {
      const status = err.response?.status;
      const data = err.response?.data;
      const location =
        err.response?.headers?.['location'] ??
        err.response?.headers?.['Location'];
      this.log.e('Ozon API error', {
        context,
        status,
        message: err.message,
        redirectLocation: location,
        responseData:
          typeof data === 'object'
            ? JSON.stringify(data).slice(0, 500)
            : String(data),
      });
      if (status && status >= 300 && status < 400 && location) {
        throw new Error(
          `Ozon API: редирект ${status} на ${location}. Возможно geo-блокировка — запускайте воркер из РФ или через VPN.`
        );
      }
      throw new Error(
        `Ozon API: ${status ?? 'network'} ${err.message} ${JSON.stringify(data ?? {}).slice(0, 200)}`
      );
    }
    throw err;
  }

  async getProductList(): Promise<OzonProductItem[]> {
    const all: OzonProductItem[] = [];
    let lastId = '';
    let page = 0;

    do {
      page += 1;
      const body: {
        filter?: { visibility?: string };
        limit?: number;
        last_id?: string;
      } = {
        filter: { visibility: 'ALL' },
        limit: LIST_PAGE_LIMIT,
      };
      if (lastId) body.last_id = lastId;

      const url = '/v3/product/list';
      let res: Awaited<
        ReturnType<typeof this.axiosInstance.post<OzonProductListResponse>>
      >;
      try {
        res = await this.axiosInstance.post<OzonProductListResponse>(url, body);
      } catch (err) {
        this.handleApiError(err, 'getProductList');
      }
      const data = res!.data;
      const items = data.result?.items ?? [];
      lastId = data.result?.last_id ?? '';

      this.log.i('Ozon API list response', {
        status: res.status,
        page,
        pageItems: items.length,
        accumulated: all.length + items.length,
        lastId: lastId || '(last page)',
      });

      all.push(...items);
      if (items.length < LIST_PAGE_LIMIT) break;
    } while (lastId);

    return all;
  }

  async getProductInfo(productIds: string[]): Promise<OzonProductInfo[]> {
    if (productIds.length === 0) return [];

    const limit = pLimit(INFO_LIST_MAX_CONCURRENCY);
    const batches: string[][] = [];

    for (let i = 0; i < productIds.length; i += INFO_LIST_BATCH_SIZE) {
      batches.push(productIds.slice(i, i + INFO_LIST_BATCH_SIZE));
    }

    const url = '/v3/product/info/list';
    const tasks = batches.map((batch) =>
      limit(async (): Promise<OzonProductInfo[]> => {
        const res = await this.axiosInstance.post<OzonProductInfoResponse>(
          url,
          { product_id: batch.map(String) }
        );
        return res.data?.items ?? [];
      })
    );

    const results = await Promise.all(tasks);
    const all = results.flat();

    this.log.i('Ozon API info/list done', {
      requested: productIds.length,
      batchCount: batches.length,
      batchSize: INFO_LIST_BATCH_SIZE,
      itemsReturned: all.length,
    });

    return all;
  }

  async getProductAttributesAll(filter: {
    product_id?: string[];
    offer_id?: string[];
  }): Promise<OzonProductAttributes[]> {
    const all: OzonProductAttributes[] = [];
    let lastId: string | undefined;
    const filterWithVisibility = { ...filter, visibility: 'ALL' as const };

    do {
      const body: Record<string, unknown> = {
        filter: filterWithVisibility,
        limit: LIST_PAGE_LIMIT,
      };
      if (lastId) body.last_id = lastId;

      const res = await this.axiosInstance.post<OzonAttributesResponse>(
        '/v4/product/info/attributes',
        body
      );
      const items = res.data.result ?? [];
      const nextLastId = res.data.last_id;
      all.push(...items);
      lastId =
        nextLastId && items.length >= LIST_PAGE_LIMIT ? nextLastId : undefined;
    } while (lastId);

    return all;
  }

  async getProductDescription(
    productId: number | string,
    useOfferId = false
  ): Promise<{
    id: number;
    offer_id: string;
    name: string;
    description: string;
  } | null> {
    const url = '/v1/product/info/description';
    const body = useOfferId
      ? { offer_id: String(productId) }
      : { product_id: Number(productId) };

    try {
      const res = await this.axiosInstance.post<OzonDescription>(url, body);
      return res.data.result;
    } catch (err) {
      if (err instanceof AxiosError) {
        const status = err.response?.status;
        const data = err.response?.data;
        if (
          status === 404 ||
          (status === 400 && String(data).includes('not found'))
        ) {
          return null;
        }
      }
      throw err;
    }
  }

  /** Шаг E — список складов. POST /v1/warehouse/list */
  async getWarehouseList(): Promise<OzonWarehouse[]> {
    const res = await this.axiosInstance.post<OzonWarehouseListResponse>(
      '/v1/warehouse/list',
      {}
    );
    const items = res.data?.result ?? [];
    this.log.i('Ozon API warehouse/list', { count: items.length });
    return items;
  }

  /** Шаг C — фото по product_id. POST /v2/product/pictures/info (батчами) */
  async getProductPictures(
    productIds: string[]
  ): Promise<Map<string, OzonPicture[]>> {
    const map = new Map<string, OzonPicture[]>();
    if (productIds.length === 0) return map;

    for (let i = 0; i < productIds.length; i += PICTURES_BATCH_SIZE) {
      const batch = productIds.slice(i, i + PICTURES_BATCH_SIZE);
      try {
        const res = await this.axiosInstance.post<OzonPicturesResponse>(
          '/v2/product/pictures/info',
          { product_id: batch.map((id) => parseInt(id, 10)) }
        );
        const pictures = res.data?.result?.pictures ?? [];
        for (const pic of pictures) {
          const pid = String(pic.product_id);
          const arr = map.get(pid) ?? [];
          arr.push(pic);
          map.set(pid, arr);
        }
      } catch (err) {
        if (err instanceof AxiosError) {
          const status = err.response?.status;
          const data = err.response?.data;
          if (
            status === 404 ||
            (status === 400 && String(data).includes('not found'))
          ) {
            this.log.w(
              'Ozon v2/product/pictures/info не найден или недоступен',
              {
                batchSize: batch.length,
              }
            );
          } else {
            this.handleApiError(err, 'getProductPictures');
          }
        } else {
          throw err;
        }
      }
    }
    this.log.i('Ozon API pictures/info', {
      requested: productIds.length,
      withPictures: map.size,
    });
    return map;
  }

  /** Шаг D — цены по product_id. POST /v5/product/info/prices (батчами, пагинация) */
  async getProductPrices(
    productIds: string[]
  ): Promise<Map<string, OzonPriceItem>> {
    const map = new Map<string, OzonPriceItem>();
    if (productIds.length === 0) return map;

    for (let i = 0; i < productIds.length; i += PRICES_BATCH_SIZE) {
      const batch = productIds.slice(i, i + PRICES_BATCH_SIZE);
      let lastId: string | undefined;

      do {
        const body: Record<string, unknown> = {
          filter: {
            product_id: batch,
            visibility: 'ALL',
          },
          limit: LIST_PAGE_LIMIT,
        };
        if (lastId) body.last_id = lastId;

        try {
          const res = await this.axiosInstance.post<OzonPricesResponse>(
            '/v5/product/info/prices',
            body
          );
          const items = res.data?.result?.items ?? [];
          for (const item of items) {
            map.set(String(item.product_id), item);
          }
          lastId =
            items.length >= LIST_PAGE_LIMIT
              ? res.data?.result?.last_id
              : undefined;
        } catch (err) {
          if (err instanceof AxiosError) {
            const status = err.response?.status;
            const data = err.response?.data;
            if (
              status === 404 ||
              (status === 400 && String(data).includes('not found'))
            ) {
              this.log.w(
                'Ozon v5/product/info/prices не найден или недоступен'
              );
              break;
            }
          }
          this.handleApiError(err as Error, 'getProductPrices');
        }
      } while (lastId);
    }
    this.log.i('Ozon API prices', {
      requested: productIds.length,
      returned: map.size,
    });
    return map;
  }

  /**
   * Шаг F — остатки FBS по складам.
   * POST /v1/product/info/stocks-by-warehouse/fbs (батчами).
   * API принимает только offer_id — маппинг productIdToOfferId обязателен.
   * Возвращает Map<product_id, Map<warehouse_id, { available, reserved? }>>.
   */
  async getStocksByWarehouse(
    productIds: string[],
    productIdToOfferId: Map<string, string>
  ): Promise<
    Map<string, Map<string, { available: number; reserved?: number }>>
  > {
    const byProduct = new Map<
      string,
      Map<string, { available: number; reserved?: number }>
    >();
    if (productIds.length === 0) return byProduct;

    for (let i = 0; i < productIds.length; i += STOCKS_BATCH_SIZE) {
      const productIdBatch = productIds.slice(i, i + STOCKS_BATCH_SIZE);
      const offerIdBatch = productIdBatch
        .map((pid) => productIdToOfferId.get(pid))
        .filter((id): id is string => id != null);
      if (offerIdBatch.length === 0) continue;

      const batch = offerIdBatch;
      let lastId: string | undefined;

      do {
        // v1/stocks-by-warehouse/fbs требует offer_id/sku/fbs_sku на верхнем уровне, не в filter
        const body: Record<string, unknown> = {
          offer_id: batch,
          limit: LIST_PAGE_LIMIT,
        };
        if (lastId) body.last_id = lastId;

        try {
          const res =
            await this.axiosInstance.post<OzonStocksByWarehouseResponse>(
              '/v1/product/info/stocks-by-warehouse/fbs',
              body
            );
          const items = res.data?.result ?? [];
          for (const item of items) {
            const pid = String(item.product_id);
            const whId = item.warehouse_id ?? 'unknown';
            const available = Number(item.present ?? 0) || 0;
            const reserved = Number(item.aviable ?? 0) || 0;
            let whMap = byProduct.get(pid);
            if (!whMap) {
              whMap = new Map();
              byProduct.set(pid, whMap);
            }
            whMap.set(whId, { available, reserved });
          }
          // lastId =
          //   items.length >= LIST_PAGE_LIMIT
          //     ? res.data?.result?.last_id
          //     : undefined;
        } catch (err) {
          if (err instanceof AxiosError) {
            const status = err.response?.status;
            const data = err.response?.data;
            if (
              status === 404 ||
              (status === 400 && String(data).includes('not found'))
            ) {
              this.log.w(
                'Ozon v1/product/info/stocks-by-warehouse/fbs не найден, остатки из info/list'
              );
              return byProduct;
            }
          }
          this.handleApiError(err as Error, 'getStocksByWarehouse');
        }
      } while (lastId);
    }
    this.log.i('Ozon API stocks-by-warehouse', {
      requested: productIds.length,
      productsWithStocks: byProduct.size,
    });
    return byProduct;
  }
}
