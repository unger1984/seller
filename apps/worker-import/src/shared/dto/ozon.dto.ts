/** DTO Ozon Seller API */

export interface OzonCredentials {
  clientId: string;
  apiKey: string;
}

export interface OzonProductItem {
  product_id: string;
  offer_id: string;
}

export interface OzonProductInfo {
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
  }[];
  sources?: Array<{ source: string; link: string }>;
  source?: string;
}

export interface OzonProductListResponse {
  result: { items: OzonProductItem[]; total: number; last_id: string };
}

export interface OzonDescription {
  result: {
    id: number;
    offer_id: string;
    name: string;
    description: string;
  };
}

export interface OzonProductAttributes {
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
}

export interface OzonProductInfoResponse {
  items: OzonProductInfo[];
}

export interface OzonAttributesResponse {
  result: OzonProductAttributes[];
  last_id?: string;
  total: number;
}

export interface OzonWarehouse {
  warehouse_id: string;
  name?: string;
  [key: string]: unknown;
}

export interface OzonWarehouseListResponse {
  result: OzonWarehouse[];
}

export interface OzonPicture {
  product_id: number;
  url?: string;
  is_primary?: boolean;
  [key: string]: unknown;
}

export interface OzonPicturesResponse {
  result: { pictures?: OzonPicture[] };
}

export interface OzonPriceItem {
  product_id: number;
  offer_id?: string;
  price?: string;
  old_price?: string;
  [key: string]: unknown;
}

export interface OzonPricesResponse {
  result: { items?: OzonPriceItem[]; last_id?: string; total?: number };
}

export interface OzonStockByWarehouseItem {
  product_id: number;
  offer_id?: string;
  warehouse_id?: string;
  item_code?: string;
  present?: number;
  aviable?: number;
  [key: string]: unknown;
}

export interface OzonStocksByWarehouseResponse {
  result: OzonStockByWarehouseItem[];
}
