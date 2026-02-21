/**
 * Ozon Seller API — список товаров.
 * POST /v3/product/list (пагинация last_id), POST /v3/product/info/list для деталей.
 */
import axios, { AxiosError } from 'axios';
import { createLogger } from '@seller/shared';

const log = createLogger('OzonClient');

/** Базовый URL Ozon Seller API (docs.ozon.ru/api/seller) */
const BASE = 'https://api-seller.ozon.ru';
const REQUEST_TIMEOUT_MS = 60_000;

export type OzonCredentials = { clientId: string; apiKey: string };

export type OzonProductItem = {
  product_id: string;
  offer_id: string;
};

export type OzonProductListResponse = {
  result: { items: OzonProductItem[]; total: number; last_id: string };
};

/** Ответ /v3/product/info/list — имя, фото, штрихкоды, цена, остатки */
export type OzonProductInfo = {
  id: number;
  offer_id: string;
  name?: string;
  description?: string;
  /** Ozon может вернуть string или object { "url": "" } — нормализуем в import service */
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

/** Элемент из /v4/product/info/attributes */
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

function createOzonAxios(creds: OzonCredentials) {
  return axios.create({
    baseURL: BASE,
    timeout: REQUEST_TIMEOUT_MS,
    headers: {
      'Client-Id': creds.clientId,
      'Api-Key': creds.apiKey,
      'Content-Type': 'application/json',
    },
  });
}

/** Загрузить список product_id и offer_id с пагинацией */
export async function fetchOzonProductList(
  creds: OzonCredentials
): Promise<OzonProductItem[]> {
  const client = createOzonAxios(creds);
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
    log.i('Ozon API request', {
      method: 'POST',
      url: `${BASE}${url}`,
      body: {
        filter: body.filter,
        limit: body.limit,
        last_id: lastId || undefined,
      },
    });

    try {
      const res = await client.post<OzonProductListResponse>(url, body);
      const data = res.data;
      const items = data.result?.items ?? [];
      const totalFromApi = data.result?.total ?? 0;
      lastId = data.result?.last_id ?? '';

      log.i('Ozon API response', {
        status: res.status,
        page,
        pageItems: items.length,
        accumulated: all.length + items.length,
        totalFromApi,
        lastId: lastId || '(empty, last page)',
      });

      all.push(...items);

      if (items.length < 1000) break;
    } catch (err) {
      if (err instanceof AxiosError) {
        const status = err.response?.status;
        const data = err.response?.data;
        const location =
          err.response?.headers?.['location'] ??
          err.response?.headers?.['Location'];
        const message = err.message;
        log.e('Ozon API error', {
          url: `${BASE}${url}`,
          status,
          message,
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
          `Ozon API: ${status ?? 'network'} ${message} ${JSON.stringify(data ?? {}).slice(0, 200)}`
        );
      }
      log.e('Ozon API unexpected error', { err });
      throw err;
    }
  } while (lastId);

  log.i('Ozon product/list done', { total: all.length });
  return all;
}

const OZON_INFO_LIST_DELAY_MS = 100;

/** Загрузить детали товаров (цена, остаток). API v3/product/info/list принимает 1 товар на запрос. */
export async function fetchOzonProductInfo(
  creds: OzonCredentials,
  productIds: string[]
): Promise<OzonProductInfo[]> {
  if (productIds.length === 0) return [];

  const client = createOzonAxios(creds);
  const url = '/v3/product/info/list';
  const all: OzonProductInfo[] = [];

  for (let i = 0; i < productIds.length; i += 1) {
    if (i > 0) {
      await new Promise((r) => setTimeout(r, OZON_INFO_LIST_DELAY_MS));
    }
    const productId = productIds[i];
    const body = { product_id: [String(productId)] };

    try {
      const res = await client.post<OzonProductInfoResponse>(url, body);
      const items = res.data?.items ?? [];
      all.push(...items);
    } catch (err) {
      if (err instanceof AxiosError) {
        const status = err.response?.status;
        const data = err.response?.data;
        log.e('Ozon API info/list error', {
          url: `${BASE}${url}`,
          productId,
          status,
          responseData:
            typeof data === 'object'
              ? JSON.stringify(data).slice(0, 500)
              : String(data),
        });
        throw new Error(
          `Ozon API info/list: ${status ?? 'network'} ${err.message} ${JSON.stringify(data ?? {}).slice(0, 200)}`
        );
      }
      throw err;
    }
  }

  log.i('Ozon API info/list done', {
    requested: productIds.length,
    itemsReturned: all.length,
  });
  return all;
}

/** Ответ /v4/product/info/attributes */
type OzonAttributesResponse = {
  result: OzonProductAttributes[];
  last_id?: string;
  total: number;
};

/** Загрузить атрибуты и габариты товаров (с пагинацией) */
export async function fetchOzonProductAttributes(
  creds: OzonCredentials,
  filter: { product_id?: string[]; offer_id?: string[]; visibility?: string },
  limit = 1000,
  lastId?: string
): Promise<OzonProductAttributes[]> {
  const client = createOzonAxios(creds);
  const url = '/v4/product/info/attributes';
  const filterWithVisibility = {
    ...filter,
    visibility: filter.visibility ?? 'ALL',
  };
  const body: Record<string, unknown> = { filter: filterWithVisibility, limit };
  if (lastId) body.last_id = lastId;

  try {
    const res = await client.post<OzonAttributesResponse>(url, body);
    return res.data.result ?? [];
  } catch (err) {
    if (err instanceof AxiosError) {
      const status = err.response?.status;
      const data = err.response?.data;
      log.e('Ozon API attributes error', {
        url: `${BASE}${url}`,
        status,
        responseData:
          typeof data === 'object'
            ? JSON.stringify(data).slice(0, 500)
            : String(data),
      });
      throw new Error(
        `Ozon API attributes: ${status ?? 'network'} ${err.message} ${JSON.stringify(data ?? {}).slice(0, 200)}`
      );
    }
    throw err;
  }
}

/** Загрузить все атрибуты с пагинацией last_id */
export async function fetchOzonProductAttributesAll(
  creds: OzonCredentials,
  filter: { product_id?: string[]; offer_id?: string[] }
): Promise<OzonProductAttributes[]> {
  const all: OzonProductAttributes[] = [];
  let lastId: string | undefined;
  const filterWithVisibility = { ...filter, visibility: 'ALL' as const };

  do {
    const client = createOzonAxios(creds);
    const body: Record<string, unknown> = {
      filter: filterWithVisibility,
      limit: 1000,
    };
    if (lastId) body.last_id = lastId;

    const res = await client.post<OzonAttributesResponse>(
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

/** Загрузить HTML-описание товара. v1/product/info/description */
export async function fetchOzonProductDescription(
  creds: OzonCredentials,
  productId: number | string,
  useOfferId = false
): Promise<{
  id: number;
  offer_id: string;
  name: string;
  description: string;
} | null> {
  const client = createOzonAxios(creds);
  const url = '/v1/product/info/description';
  const body = useOfferId
    ? { offer_id: String(productId) }
    : { product_id: Number(productId) };

  try {
    const res = await client.post<OzonDescription>(url, body);
    return res.data.result;
  } catch (err) {
    if (err instanceof AxiosError) {
      const status = err.response?.status;
      const data = err.response?.data;
      log.e('Ozon API description error', {
        url: `${BASE}${url}`,
        productId,
        status,
      });
      if (
        status === 404 ||
        (status === 400 && String(data).includes('not found'))
      ) {
        return null;
      }
      throw new Error(
        `Ozon API description: ${status ?? 'network'} ${err.message} ${JSON.stringify(data ?? {}).slice(0, 200)}`
      );
    }
    throw err;
  }
}
