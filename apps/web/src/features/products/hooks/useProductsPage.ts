import { useState, useCallback, useEffect, useLayoutEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toastError, toastSuccess } from '@/shared/ui';
import { useAuthStore } from '@/features/auth/model/authStore';
import { useSyncImportStatus } from '@/features/sync/hooks/useSyncImportStatus';
import { queryKeys } from '@/shared/api';
import {
  fetchProducts,
  fetchAccounts,
  startImport,
  clearCatalog,
  createProduct,
  updateProductOzonMarket,
  updateProductWbMarket,
} from '../api';
import type { Marketplace } from '../types';

const PRODUCTS_LIMIT = 50;

export function useProductsPage() {
  const queryClient = useQueryClient();
  const companyId = useAuthStore((s) => s.user?.activeCompanyId);
  const token = useAuthStore((s) => s.token);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  useLayoutEffect(() => setPage(1), [search]);
  const [addModalOpen, setAddModalOpen] = useState(false);

  const productsQuery = useQuery({
    queryKey: queryKeys.products(companyId ?? '', page, search),
    queryFn: () =>
      fetchProducts(companyId!, token!, {
        page,
        limit: PRODUCTS_LIMIT,
        search: search || undefined,
      }),
    enabled: !!companyId && !!token,
  });

  const accountsQuery = useQuery({
    queryKey: queryKeys.accounts(companyId ?? ''),
    queryFn: () => fetchAccounts(companyId!, token!),
    enabled: !!companyId && !!token,
  });

  const invalidateProducts = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.products(companyId ?? '', page, search),
    });
  }, [queryClient, companyId, page, search]);

  const {
    importStatus,
    setImporting: setImportStatus,
    fetchStatus,
  } = useSyncImportStatus(companyId ?? null, token ?? null, {
    onImportDone: invalidateProducts,
  });

  useEffect(() => {
    if (productsQuery.isError) toastError('Не удалось загрузить товары');
  }, [productsQuery.isError]);
  useEffect(() => {
    if (accountsQuery.isError) toastError('Не удалось загрузить аккаунты');
  }, [accountsQuery.isError]);

  const accounts = accountsQuery.data ?? [];
  const products = productsQuery.data?.items ?? [];
  const total = productsQuery.data?.total ?? 0;
  const hasOzon = accounts.some((a) => a.marketplace === 'OZON');
  const hasWb = accounts.some((a) => a.marketplace === 'WILDBERRIES');
  const ozonAccount = accounts.find((a) => a.marketplace === 'OZON');
  const wbAccount = accounts.find((a) => a.marketplace === 'WILDBERRIES');

  const importMutation = useMutation({
    mutationFn: ({
      marketAccountId,
      token: t,
    }: {
      marketAccountId: string;
      token: string;
    }) => startImport(companyId!, marketAccountId, t),
  });

  const handleImport = useCallback(
    async (marketplace: Marketplace) => {
      if (!companyId || !token) return;
      const account = marketplace === 'OZON' ? ozonAccount : wbAccount;
      if (!account) return;
      setImportStatus(account.id, true);
      try {
        await importMutation.mutateAsync({
          marketAccountId: account.id,
          token,
        });
        const label = marketplace === 'OZON' ? 'Ozon' : 'Wildberries';
        toastSuccess(`Импорт с ${label} запущен`);
        // WB и быстрые импорты могут завершиться до первого polling (3 c) — сразу проверяем статус
        void fetchStatus();
      } catch (err) {
        setImportStatus(account.id, false);
        toastError(err instanceof Error ? err.message : 'Ошибка импорта');
      }
    },
    [
      companyId,
      token,
      ozonAccount,
      wbAccount,
      setImportStatus,
      fetchStatus,
      importMutation,
    ]
  );

  const clearMutation = useMutation({
    mutationFn: () => clearCatalog(companyId!, token!),
    onSuccess: (data) => {
      toastSuccess(`Удалено товаров: ${data.deleted}`);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.products(companyId ?? '', page, search),
      });
    },
    onError: (err) => {
      toastError(err instanceof Error ? err.message : 'Ошибка очистки');
    },
  });

  const handleClearCatalog = useCallback(async () => {
    if (!companyId || !token) return;
    if (
      !window.confirm(
        'Удалить все товары из каталога? Данные на маркетплейсах не изменятся. Это действие нельзя отменить.'
      )
    ) {
      return;
    }
    clearMutation.mutate();
  }, [companyId, token, clearMutation]);

  const createMutation = useMutation({
    mutationFn: (payload: { name: string; brand?: string }) =>
      createProduct(companyId!, payload, token!),
    onSuccess: () => {
      toastSuccess('Товар добавлен');
      setAddModalOpen(false);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.products(companyId ?? '', page, search),
      });
    },
    onError: (err) => {
      toastError(err instanceof Error ? err.message : 'Ошибка создания');
    },
  });

  const handleCreateProduct = useCallback(
    async (name: string, brand?: string) => {
      if (!companyId || !token) return;
      await createMutation.mutateAsync({ name, brand: brand || undefined });
    },
    [companyId, token, createMutation]
  );

  const updateOzonMarketMutation = useMutation({
    mutationFn: ({
      productId,
      payload,
    }: {
      productId: string;
      payload: { price?: number; stock?: number };
    }) => updateProductOzonMarket(companyId!, productId, payload, token!),
    onSuccess: () => {
      toastSuccess('Сохранено');
      invalidateProducts();
    },
    onError: (err) => {
      toastError(err instanceof Error ? err.message : 'Ошибка');
    },
  });

  const handleUpdateOzonMarket = useCallback(
    async (productId: string, payload: { price?: number; stock?: number }) => {
      if (!companyId || !token) return;
      await updateOzonMarketMutation.mutateAsync({ productId, payload });
    },
    [companyId, token, updateOzonMarketMutation]
  );

  const updateWbMarketMutation = useMutation({
    mutationFn: ({
      productId,
      payload,
    }: {
      productId: string;
      payload: { price?: number; stock?: number };
    }) => updateProductWbMarket(companyId!, productId, payload, token!),
    onSuccess: () => {
      toastSuccess('Сохранено');
      invalidateProducts();
    },
    onError: (err) => {
      toastError(err instanceof Error ? err.message : 'Ошибка');
    },
  });

  const handleUpdateWbMarket = useCallback(
    async (productId: string, payload: { price?: number; stock?: number }) => {
      if (!companyId || !token) return;
      await updateWbMarketMutation.mutateAsync({ productId, payload });
    },
    [companyId, token, updateWbMarketMutation]
  );

  return {
    accounts,
    products,
    total,
    page,
    limit: PRODUCTS_LIMIT,
    setPage,
    search,
    setSearch,
    loading: productsQuery.isLoading,
    importStatus,
    addModalOpen,
    setAddModalOpen,
    hasOzon,
    hasWb,
    handleImport,
    handleClearCatalog,
    handleCreateProduct,
    handleUpdateOzonMarket,
    handleUpdateWbMarket,
  };
}
