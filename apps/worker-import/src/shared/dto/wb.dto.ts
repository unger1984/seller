/** DTO Wildberries API */

export interface WbCredentials {
  apiKey: string;
}

export interface WbCardPhoto {
  big?: string;
  c246x328?: string;
  c516x688?: string;
  square?: string;
  tm?: string;
}

export interface WbCard {
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
    chrtId?: number;
    techSize?: string;
    wbSize?: string;
    skus?: string[];
    price?: number;
  }>;
  tags?: Array<{ id?: number; name?: string; color?: string }>;
  needKiz?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface WbCardsListResponse {
  cards?: WbCard[];
  cursor?: {
    updatedAt?: string;
    nmID?: number;
    limit?: number;
    total?: number;
  };
}

export interface WbCardsListRequest {
  settings: {
    sort?: { ascending?: boolean };
    cursor?: { limit?: number; updatedAt?: string; nmID?: number };
    filter?: Record<string, unknown>;
  };
}

export interface WbPriceSize {
  sizeID?: number;
  price?: number;
  discountedPrice?: number;
  clubDiscountedPrice?: number;
  techSizeName?: string;
}

export interface WbPriceItem {
  nmId?: number;
  nmID?: number;
  price?: number;
  Price?: number;
  discount?: number;
  sizes?: WbPriceSize[];
  [key: string]: unknown;
}

export interface WbPricesFilterResponse {
  data: {
    listGoods?: WbPriceItem[];
    cursor?: { limit?: number; lastId?: string; total?: number };
    [key: string]: unknown;
  };
}

export interface WbWarehouse {
  id?: number;
  name?: string;
  officeId?: number;
  [key: string]: unknown;
}

export interface WbStockResponseItem {
  chrtId?: number;
  amount?: number;
  sku?: string;
  [key: string]: unknown;
}

export interface WbStocksByWarehousesResult {
  warehouses: WbWarehouse[];
  stocksByWarehouses: Map<string, Record<string, number>>;
}
