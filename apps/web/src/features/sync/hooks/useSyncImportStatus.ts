/**
 * Хук: статус импорта через polling.
 * При mount — GET import/status. При активном импорте — опрос каждые 3 с,
 * при завершении вызывает onImportDone.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from '@/shared/api';

export type ImportStatusItem = {
  active: boolean;
  jobId?: string;
};

export type ImportStatus = Record<string, ImportStatusItem>;

export function useSyncImportStatus(
  companyId: string | null,
  token: string | null,
  options: { onImportDone?: () => void } = {}
) {
  const [importStatus, setImportStatus] = useState<ImportStatus>({});
  const [loading, setLoading] = useState(true);
  const onImportDoneRef = useRef(options.onImportDone);
  onImportDoneRef.current = options.onImportDone;

  const fetchStatus = useCallback(async () => {
    if (!companyId || !token) return;
    setLoading(true);
    try {
      const res = await apiFetch(`/companies/${companyId}/sync/import/status`, {
        token,
      });
      if (res.ok) {
        const data = (await res.json()) as ImportStatus;
        setImportStatus(data);
      }
    } catch {
      setImportStatus({});
    } finally {
      setLoading(false);
    }
  }, [companyId, token]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  /** Polling: при активном импорте опрашиваем статус, при завершении — onImportDone */
  useEffect(() => {
    const anyActive = Object.values(importStatus).some((s) => s.active);
    if (!anyActive || !companyId || !token) return;
    let intervalId: ReturnType<typeof setInterval> | undefined;
    const timeoutId = setTimeout(() => {
      intervalId = setInterval(async () => {
        try {
          const res = await apiFetch(
            `/companies/${companyId}/sync/import/status`,
            { token }
          );
          if (res.ok) {
            const data = (await res.json()) as ImportStatus;
            const stillActive = Object.values(data).some((s) => s.active);
            if (!stillActive) {
              setImportStatus(data);
              onImportDoneRef.current?.();
            }
          }
        } catch {
          /* ignore */
        }
      }, 3000);
    }, 5000);
    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [companyId, token, importStatus]);

  const setImporting = useCallback(
    (marketAccountId: string, active: boolean) => {
      setImportStatus((prev) => ({
        ...prev,
        [marketAccountId]: {
          ...prev[marketAccountId],
          active,
        },
      }));
    },
    []
  );

  return {
    importStatus,
    loading,
    fetchStatus,
    setImporting,
  };
}
