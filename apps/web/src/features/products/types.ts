export type Marketplace = 'OZON' | 'WILDBERRIES';

export interface MarketAccountDto {
  id: string;
  marketplace: Marketplace;
  name: string;
  isActive: boolean;
  createdAt: string;
}

export interface VariantRow {
  id: string;
  vendorCode: string;
  masterPrice: number;
  masterStock: number;
  barcodes: string[];
  ozonOfferId: string | null;
  ozonProductId: string | null;
  wbNmId: string | null;
  primaryImage: string | null;
  placementStatusOzon: string | null;
  placementStatusWb: string | null;
  priceOzon: number | null;
  stockOzon: number | null;
  priceWb: number | null;
  stockWb: number | null;
}

export interface ProductListItem {
  id: string;
  name: string;
  brand: string | null;
  description: string | null;
  primaryImage: string | null;
  images: string[];
  variants: VariantRow[];
}
