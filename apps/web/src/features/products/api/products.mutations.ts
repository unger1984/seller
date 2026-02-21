import { apiFetch } from '@/shared/api';

export interface ClearResult {
  deleted: number;
}

export async function clearCatalog(
  companyId: string,
  token: string
): Promise<ClearResult> {
  const res = await apiFetch(`/companies/${companyId}/products/clear`, {
    method: 'POST',
    token,
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message ?? 'Ошибка очистки');
  }
  return res.json();
}

export async function updateProductWbMarket(
  companyId: string,
  productId: string,
  payload: { price?: number; stock?: number },
  token: string
): Promise<void> {
  const res = await apiFetch(
    `/companies/${companyId}/products/${productId}/market/wb`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
      token,
    }
  );
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message ?? 'Не удалось обновить');
  }
}

export async function updateProductOzonMarket(
  companyId: string,
  productId: string,
  payload: { price?: number; stock?: number },
  token: string
): Promise<void> {
  const res = await apiFetch(
    `/companies/${companyId}/products/${productId}/market/ozon`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
      token,
    }
  );
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message ?? 'Не удалось обновить');
  }
}

export async function createProduct(
  companyId: string,
  payload: { name: string; brand?: string },
  token: string
): Promise<void> {
  const res = await apiFetch(`/companies/${companyId}/products`, {
    method: 'POST',
    body: JSON.stringify({
      name: payload.name,
      brand: payload.brand || undefined,
    }),
    token,
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as {
      message?: string | string[];
    };
    throw new Error(
      Array.isArray(err.message)
        ? err.message.join('\n')
        : (err.message ?? 'Ошибка создания')
    );
  }
}
