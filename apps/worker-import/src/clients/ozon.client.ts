/**
 * Ozon Seller API — OzonApiClient с retry/backoff, keepAlive, батчинг.
 * POST /v3/product/list, /v3/product/info/list, /v4/product/info/attributes, /v1/product/info/description.
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

const log = createLogger('OzonClient');

const BASE = 'https://api-seller.ozon.ru';
const REQUEST_TIMEOUT_MS = 60_000;
const INFO_LIST_BATCH_SIZE = 500;
const INFO_LIST_MAX_CONCURRENCY = 3;
const RETRY_MAX_ATTEMPTS = 5;
const RETRY_BASE_DELAY_MS = 1000;

export type OzonCredentials = { clientId: string; apiKey: string };

export type OzonProductItem = {
  product_id: string;
  offer_id: string;
};

export type OzonProductListResponse = {
  result: { items: OzonProductItem[]; total: number; last_id: string };
};

export type OzonProductInfo = {
  id: number;
  offer_id: string;
  name?: string;
  description?: string;
  primary_image?: string | Record<string, unknown>;
  images?: Array<string | Record<string, unknown>>;
  images360?: Array<string | Record<string, unknown>>;
  barcodes?: string[];
  barcode?: string;
  category_id?: number;
  sku?: number;
  status?: { status: string };
  visible?: boolean;
  vat?: string;
  price: string;
  old_price?: string;
  marketing_price?: string;
  premium_price?: string;
  recommended_price?: string;
  min_price?: string;
  min_ozon_price?: string;
  currency_code?: string;
  stocks?: {
    coming?: number;
    present?: number;
    reserved?: number;
  };
  sources?: Array<{ source: string; link: string }>;
  source?: string;
};

export type OzonDescription = {
  result: {
    id: number;
    offer_id: string;
    name: string;
    description: string;
  };
};

export type OzonProductAttributes = {
  id: number;
  offer_id: string;
  barcode?: string;
  category_id?: number;
  type_id?: number;
  height?: number;
  width?: number;
  depth?: number;
  dimension_unit?: string;
  weight?: number;
  weight_unit?: string;
  attributes?: Array<{
    attribute_id?: number;
    complex_id?: number;
    values?: Array<{ dictionary_value_id?: number; value?: string }>;
  }>;
};

export type OzonProductInfoResponse = {
  items: OzonProductInfo[];
};

type OzonAttributesResponse = {
  result: OzonProductAttributes[];
  last_id?: string;
  total: number;
};

function createRetryDelay(
  attempt: number,
  retryAfterHeader?: string | null
): number {
  if (retryAfterHeader) {
    const seconds = parseInt(retryAfterHeader, 10);
    if (!Number.isNaN(seconds) && seconds > 0) {
      return Math.min(seconds * 1000, 60_000);
    }
  }
  const exponential = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
  const jitter = Math.random() * 0.3 * exponential;
  return Math.min(exponential + jitter, 60_000);
}

function shouldRetry(status: number | undefined): boolean {
  if (status == null) return true;
  if (status === 429) return true;
  if (status >= 500 && status < 600) return true;
  return false;
}

function addRetryInterceptor(
  instance: AxiosInstance,
  retryCountRef: { count: number }
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

export class OzonApiClient {
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
    addRetryInterceptor(this.axiosInstance, this._retryCountRef);
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
      log.e('Ozon API error', {
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
        limit: 1000,
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

      log.i('Ozon API list response', {
        status: res.status,
        page,
        pageItems: items.length,
        accumulated: all.length + items.length,
        lastId: lastId || '(last page)',
      });

      all.push(...items);
      if (items.length < 1000) break;
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

    log.i('Ozon API info/list done', {
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
        limit: 1000,
      };
      if (lastId) body.last_id = lastId;

      const res = await this.axiosInstance.post<OzonAttributesResponse>(
        '/v4/product/info/attributes',
        body
      );
      const items = res.data.result ?? [];
      const nextLastId = res.data.last_id;
      all.push(...items);
      lastId = nextLastId && items.length >= 1000 ? nextLastId : undefined;
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
}
