import { apiFetch } from '@/shared/api';

export type Marketplace = 'OZON' | 'WILDBERRIES';

export interface MarketAccountDto {
  id: string;
  marketplace: Marketplace;
  name: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateAccountPayload {
  marketplace: Marketplace;
  name?: string;
  credentials: { clientId?: string; apiKey: string };
}

export interface UpdateAccountPayload {
  marketplace: Marketplace;
  credentials: { clientId?: string; apiKey: string };
}

export async function createAccount(
  companyId: string,
  payload: CreateAccountPayload,
  token: string
): Promise<MarketAccountDto> {
  const res = await apiFetch(`/companies/${companyId}/accounts`, {
    method: 'POST',
    body: JSON.stringify(payload),
    token,
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as {
      message?: string | string[];
    };
    const msg = Array.isArray(err.message)
      ? err.message.join('\n')
      : ((err.message as string) ?? 'Ошибка при сохранении');
    throw new Error(msg);
  }
  return res.json();
}

export async function updateAccount(
  companyId: string,
  accountId: string,
  payload: UpdateAccountPayload,
  token: string
): Promise<void> {
  const res = await apiFetch(`/companies/${companyId}/accounts/${accountId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
    token,
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as {
      message?: string;
    };
    throw new Error(
      Array.isArray(err.message)
        ? err.message.join('\n')
        : (err.message ?? 'Ошибка при сохранении')
    );
  }
}

export async function deleteAccount(
  companyId: string,
  accountId: string,
  token: string
): Promise<void> {
  const res = await apiFetch(`/companies/${companyId}/accounts/${accountId}`, {
    method: 'DELETE',
    token,
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as {
      message?: string;
    };
    throw new Error(err.message ?? 'Аккаунт маркетплейса не найден');
  }
}
