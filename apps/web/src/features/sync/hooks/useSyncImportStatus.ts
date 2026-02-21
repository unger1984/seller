/**
 * Хук: статус импорта через polling.
 * useQuery + refetchInterval при активном импорте.
 * При завершении импорта вызывает onImportDone.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api';
import { fetchImportStatus, type ImportStatus } from '@/features/products/api';

export type ImportStatusItem = {
  active: boolean;
  jobId?: string;
};

export function useSyncImportStatus(
  companyId: string | null,
  token: string | null,
  options: { onImportDone?: () => void } = {}
) {
  const [optimisticImporting, setOptimisticImporting] = useState<
    Record<string, boolean>
  >({});
  const optimisticRef = useRef(optimisticImporting);
  optimisticRef.current = optimisticImporting;
  const prevDataRef = useRef<ImportStatus>({});
  const hadActiveRef = useRef(false);
  const onImportDoneRef = useRef(options.onImportDone);
  onImportDoneRef.current = options.onImportDone;

  const query = useQuery({
    queryKey: queryKeys.syncImportStatus(companyId ?? ''),
    queryFn: () => fetchImportStatus(companyId!, token!),
    enabled: !!companyId && !!token,
    refetchInterval: (q) => {
      const apiActive =
        q.state.data && Object.values(q.state.data).some((s) => s.active);
      // ref — избегаем stale closure: refetchInterval может вызываться с устаревшим optimisticImporting
      const optActive = Object.values(optimisticRef.current).some(Boolean);
      return apiActive || optActive ? 3000 : false;
    },
  });

  const data = query.data ?? {};
  const anyActive =
    Object.values(data).some((s) => s.active) ||
    Object.values(optimisticImporting).some(Boolean);

  // Синхронизируем optimistic с API и вызываем onImportDone по завершении каждого импорта.
  useEffect(() => {
    const apiData = query.data;
    if (!apiData) return;
    const prev = prevDataRef.current;
    const toRemove: string[] = [];
    for (const [id, item] of Object.entries(apiData)) {
      const wasActive = prev[id]?.active || optimisticImporting[id];
      if (wasActive && !item.active) {
        toRemove.push(id);
      }
    }
    prevDataRef.current = apiData;

    if (toRemove.length > 0) {
      setOptimisticImporting((optPrev) => {
        const next = { ...optPrev };
        for (const id of toRemove) delete next[id];
        return next;
      });
      onImportDoneRef.current?.();
    }
  }, [query.data, optimisticImporting]);

  useEffect(() => {
    const wasActive = hadActiveRef.current;
    hadActiveRef.current = anyActive;
    if (wasActive && !anyActive) {
      setOptimisticImporting({});
    }
  }, [anyActive]);

  const setImporting = useCallback(
    (marketAccountId: string, active: boolean) => {
      setOptimisticImporting((prev) => ({
        ...prev,
        [marketAccountId]: active,
      }));
    },
    []
  );

  const importStatus: ImportStatus = { ...data };
  for (const [id, active] of Object.entries(optimisticImporting)) {
    if (active) {
      importStatus[id] = { ...importStatus[id], active: true };
    }
  }

  return {
    importStatus,
    loading: query.isLoading,
    fetchStatus: query.refetch,
    setImporting,
  };
}
