import { apiFetch } from '@/shared/api';

export async function createCompany(
  name: string,
  token: string
): Promise<void> {
  const res = await apiFetch('/companies', {
    method: 'POST',
    body: JSON.stringify({ name }),
    token,
  });
  const data = (await res.json().catch(() => ({}))) as { message?: string };
  if (!res.ok) {
    if (res.status === 409) {
      throw new Error(
        data.message ?? 'Такое название уже занято. Выберите другое.'
      );
    }
    throw new Error(data.message ?? 'Ошибка создания компании');
  }
}

export interface AuthMeResponse {
  id: string;
  email?: string;
  activeCompanyId?: string;
  memberships?: {
    companyId: string;
    companyName: string;
    role: string;
    isActive: boolean;
  }[];
  requiresCompany?: boolean;
}

export async function fetchAuthMe(token: string): Promise<AuthMeResponse> {
  const res = await apiFetch('/auth/me', { token });
  const data = (await res.json().catch(() => null)) as AuthMeResponse | null;
  if (!res.ok || !data?.id) throw new Error('Не удалось получить данные');
  return data;
}
