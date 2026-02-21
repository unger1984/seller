import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/shared/api';
import { toastError, toastSuccess } from '@/shared/ui';
import { useAuthStore } from '@/features/auth/model/authStore';
import { useSyncImportStatus } from '@/features/sync/hooks/useSyncImportStatus';
import type { Marketplace, MarketAccountDto, ProductListItem } from '../types';

interface ProductsResponse {
  items: ProductListItem[];
  total: number;
  page: number;
  limit: number;
}

export function useProductsPage() {
  const companyId = useAuthStore((s) => s.user?.activeCompanyId);
  const token = useAuthStore((s) => s.token);
  const [accounts, setAccounts] = useState<MarketAccountDto[]>([]);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);

  const fetchProducts = useCallback(async () => {
    if (!companyId || !token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
      });
      if (search.trim()) params.set('search', search.trim());
      const res = await apiFetch(`/companies/${companyId}/products?${params}`, {
        token,
      });
      if (res.ok) {
        const data = (await res.json()) as ProductsResponse;
        setProducts(data.items);
        setTotal(data.total);
      }
    } catch {
      toastError('Не удалось загрузить товары');
    } finally {
      setLoading(false);
    }
  }, [companyId, token, page, search]);

  const { importStatus, setImporting: setImportStatus } = useSyncImportStatus(
    companyId,
    token,
    { onImportDone: fetchProducts }
  );

  const hasOzon = accounts.some((a) => a.marketplace === 'OZON');
  const hasWb = accounts.some((a) => a.marketplace === 'WILDBERRIES');
  const ozonAccount = accounts.find((a) => a.marketplace === 'OZON');
  const wbAccount = accounts.find((a) => a.marketplace === 'WILDBERRIES');

  const fetchAccounts = useCallback(async () => {
    if (!companyId || !token) return;
    try {
      const res = await apiFetch(`/companies/${companyId}/accounts`, {
        token,
      });
      if (res.ok) {
        const data = (await res.json()) as MarketAccountDto[];
        setAccounts(data);
      }
    } catch {
      toastError('Не удалось загрузить аккаунты');
    }
  }, [companyId, token]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleImport = useCallback(
    async (marketplace: Marketplace) => {
      if (!companyId || !token) return;
      const account = marketplace === 'OZON' ? ozonAccount : wbAccount;
      if (!account) return;
      setImportStatus(account.id, true);
      try {
        const res = await apiFetch(`/companies/${companyId}/sync/import`, {
          method: 'POST',
          body: JSON.stringify({ marketAccountId: account.id }),
          token,
        });
        if (!res.ok) {
          setImportStatus(account.id, false);
          const err = (await res.json().catch(() => ({}))) as {
            message?: string;
          };
          throw new Error(err.message ?? 'Ошибка запуска импорта');
        }
        const label = marketplace === 'OZON' ? 'Ozon' : 'Wildberries';
        toastSuccess(`Импорт с ${label} запущен`);
      } catch (err) {
        setImportStatus(account.id, false);
        toastError(err instanceof Error ? err.message : 'Ошибка импорта');
      }
    },
    [companyId, token, ozonAccount, wbAccount, setImportStatus]
  );

  const handleCreateProduct = useCallback(
    async (name: string, brand?: string) => {
      if (!companyId || !token) return;
      try {
        const res = await apiFetch(`/companies/${companyId}/products`, {
          method: 'POST',
          body: JSON.stringify({ name, brand: brand || undefined }),
          token,
        });
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as {
            message?: string;
          };
          throw new Error(
            Array.isArray(err.message)
              ? err.message.join('\n')
              : (err.message ?? 'Ошибка создания')
          );
        }
        toastSuccess('Товар добавлен');
        setAddModalOpen(false);
        fetchProducts();
      } catch (err) {
        toastError(err instanceof Error ? err.message : 'Ошибка создания');
      }
    },
    [companyId, token, fetchProducts]
  );

  return {
    accounts,
    products,
    total,
    page,
    setPage,
    search,
    setSearch,
    loading,
    importStatus,
    addModalOpen,
    setAddModalOpen,
    hasOzon,
    hasWb,
    handleImport,
    handleCreateProduct,
  };
}
