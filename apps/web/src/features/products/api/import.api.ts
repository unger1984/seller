import { apiFetch } from '@/shared/api';

export type ImportStatus = Record<string, { active: boolean; jobId?: string }>;

export async function fetchImportStatus(
  companyId: string,
  token: string
): Promise<ImportStatus> {
  const res = await apiFetch(`/companies/${companyId}/sync/import/status`, {
    token,
  });
  if (!res.ok) throw new Error('Не удалось получить статус импорта');
  return res.json();
}

export async function startImport(
  companyId: string,
  marketAccountId: string,
  token: string
): Promise<void> {
  const res = await apiFetch(`/companies/${companyId}/sync/import`, {
    method: 'POST',
    body: JSON.stringify({ marketAccountId }),
    token,
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message ?? 'Ошибка запуска импорта');
  }
}
