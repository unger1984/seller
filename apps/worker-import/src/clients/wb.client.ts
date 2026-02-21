/**
 * Wildberries Content API — список карточек товаров.
 * POST /content/v2/get/cards/list
 * Документация: dev.wildberries.ru/docs/openapi/work-with-products
 */
import axios, { AxiosError } from 'axios';
import { createLogger } from '@seller/shared';

const log = createLogger('WbClient');

const BASE = 'https://content-api.wildberries.ru';
const REQUEST_TIMEOUT_MS = 60_000;

export type WbCredentials = { apiKey: string };

export type WbCardPhoto = {
  big?: string;
  c246x328?: string;
  c516x688?: string;
  square?: string;
  tm?: string;
};

export type WbCard = {
  nmID: number;
  imtID?: number;
  nmUUID?: string;
  vendorCode: string;
  subjectID?: number;
  subjectName?: string;
  brand?: string;
  title?: string;
  description?: string;
  photos?: WbCardPhoto[];
  video?: string;
  wholesale?: { enabled?: boolean; quantum?: number };
  dimensions?: {
    lengthCm?: number;
    widthCm?: number;
    heightCm?: number;
    weightBrutto?: number;
    isValid?: boolean;
  };
  characteristics?: Array<{ id?: number; name?: string; value?: string[] }>;
  sizes?: Array<{
    chrtID?: number;
    techSize?: string;
    wbSize?: string;
    skus?: string[];
    price?: number;
  }>;
  tags?: Array<{ id?: number; name?: string; color?: string }>;
  needKiz?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type WbCardsListResponse = {
  cards?: WbCard[];
  cursor?: {
    updatedAt?: string;
    nmID?: number;
    limit?: number;
    total?: number;
  };
};

/** Параметры запроса cards/list */
type WbCardsListRequest = {
  settings: {
    sort?: { ascending?: boolean };
    cursor?: {
      limit?: number;
      updatedAt?: string;
      nmID?: number;
    };
    filter?: Record<string, unknown>;
  };
};

function createWbAxios(creds: WbCredentials) {
  return axios.create({
    baseURL: BASE,
    timeout: REQUEST_TIMEOUT_MS,
    headers: {
      Authorization: `${creds.apiKey}`,
      'Content-Type': 'application/json',
    },
  });
}

/** Загрузить карточки с пагинацией. Возвращает полные объекты карточек. */
export async function fetchWbCardsList(
  creds: WbCredentials
): Promise<WbCard[]> {
  const client = createWbAxios(creds);
  const url = '/content/v2/get/cards/list';
  const all: WbCard[] = [];
  let cursor: WbCardsListResponse['cursor'] | undefined;

  do {
    const body: WbCardsListRequest = {
      settings: {
        sort: { ascending: true },
        cursor: cursor
          ? { limit: 100, updatedAt: cursor.updatedAt, nmID: cursor.nmID }
          : { limit: 100 },
        filter: {
          withPhoto: -1,
        },
      },
    };

    try {
      const res = await client.post<WbCardsListResponse>(url, body);
      const data = res.data;
      const cards = data.cards ?? [];
      all.push(...cards);
      cursor = data.cursor;

      log.i('WB cards/list page', {
        pageCards: cards.length,
        accumulated: all.length,
        hasMore: !!cursor && cards.length >= (cursor.limit ?? 100),
      });

      if (cards.length < (cursor?.limit ?? 100)) break;
    } catch (err) {
      if (err instanceof AxiosError) {
        const status = err.response?.status;
        const data = err.response?.data;
        log.e('WB API cards/list error', {
          url: `${BASE}${url}`,
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
  } while (cursor);

  log.i('WB cards/list done', { total: all.length });
  return all;
}
