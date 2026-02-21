import { apiFetch } from '@/shared/api';
import type { MarketAccountDto, ProductListItem } from '../types';

export interface ProductsResponse {
  items: ProductListItem[];
  total: number;
  page: number;
  limit: number;
}

export async function fetchProducts(
  companyId: string,
  token: string,
  params: { page: number; limit: number; search?: string }
): Promise<ProductsResponse> {
  const urlParams = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
  });
  if (params.search?.trim()) urlParams.set('search', params.search.trim());
  const res = await apiFetch(`/companies/${companyId}/products?${urlParams}`, {
    token,
  });
  if (!res.ok) throw new Error('Не удалось загрузить товары');
  return res.json();
}

export async function fetchAccounts(
  companyId: string,
  token: string
): Promise<MarketAccountDto[]> {
  const res = await apiFetch(`/companies/${companyId}/accounts`, { token });
  if (!res.ok) throw new Error('Не удалось загрузить аккаунты');
  return res.json();
}
