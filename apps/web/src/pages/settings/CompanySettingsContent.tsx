import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Button, Input, toastSuccess, toastError } from '@/shared/ui';
import { useAuthStore } from '@/features/auth/model/authStore';
import { queryKeys } from '@/shared/api';
import { fetchAccounts } from '@/features/products/api';
import {
  createAccount,
  updateAccount,
  deleteAccount,
  type MarketAccountDto,
  type Marketplace,
} from '@/features/settings/api/accounts.api';
import { Pencil, Trash2 } from 'lucide-react';

const MARKETPLACE_LABELS: Record<Marketplace, string> = {
  OZON: 'Ozon',
  WILDBERRIES: 'Wildberries',
};

/** Слот маркетплейса: карточка или кнопка подключения */
function MarketplaceSlot({
  marketplace,
  account,
  onEdit,
  onDelete,
  onConnect,
}: {
  marketplace: Marketplace;
  account: MarketAccountDto | null;
  onEdit: () => void;
  onDelete: () => void;
  onConnect: () => void;
}) {
  const label = MARKETPLACE_LABELS[marketplace];
  if (account) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="font-medium text-gray-900">{account.name}</h3>
            <p className="text-sm text-gray-500 mt-0.5">{label}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onEdit} aria-label="Изменить">
              <Pencil className="size-4" />
              Изменить
            </Button>
            <Button variant="ghost" onClick={onDelete} aria-label="Удалить">
              <Trash2 className="size-4" />
              Удалить
            </Button>
          </div>
        </div>
      </Card>
    );
  }
  return (
    <Card className="p-6 border-dashed border-2 border-gray-200 bg-gray-50/50">
      <Button
        variant="secondary"
        onClick={onConnect}
        className="w-full sm:w-auto"
      >
        Подключить {label}
      </Button>
    </Card>
  );
}

/** Форма добавления/редактирования аккаунта */
function AccountForm({
  marketplace,
  account,
  onSuccess,
  onCancel,
}: {
  marketplace: Marketplace;
  account: MarketAccountDto | null;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const queryClient = useQueryClient();
  const { token } = useAuthStore();
  const companyId = useAuthStore((s) => s.user?.activeCompanyId);
  const [clientId, setClientId] = useState('');
  const [apiKey, setApiKey] = useState('');

  const isEdit = !!account;
  const isOzon = marketplace === 'OZON';

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!companyId || !token) throw new Error('Нет доступа');
      if (isEdit) {
        await updateAccount(
          companyId,
          account!.id,
          isOzon
            ? { marketplace: 'OZON', credentials: { clientId, apiKey } }
            : { marketplace: 'WILDBERRIES', credentials: { apiKey } },
          token
        );
      } else {
        const name = MARKETPLACE_LABELS[marketplace];
        await createAccount(
          companyId,
          isOzon
            ? {
                marketplace: 'OZON',
                name,
                credentials: { clientId, apiKey },
              }
            : {
                marketplace: 'WILDBERRIES',
                name,
                credentials: { apiKey },
              },
          token
        );
      }
    },
    onSuccess: () => {
      toastSuccess(isEdit ? 'Данные обновлены' : 'Маркетплейс подключён');
      void queryClient.invalidateQueries({
        queryKey: queryKeys.accounts(companyId ?? ''),
      });
      onSuccess();
    },
    onError: (err) => {
      toastError(err instanceof Error ? err.message : 'Ошибка при сохранении');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate();
  };

  return (
    <Card className="p-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <h3 className="font-medium text-gray-900">
          {isEdit ? 'Изменить' : 'Подключить'} {MARKETPLACE_LABELS[marketplace]}
        </h3>
        {isOzon && (
          <Input
            label="Client-ID"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            required
            placeholder="Ozon Client-ID"
          />
        )}
        <Input
          label="API-ключ"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          required
          placeholder={isOzon ? 'Ozon API Key' : 'Wildberries API Key'}
        />
        <div className="flex gap-2">
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Сохранение...' : 'Сохранить'}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Отмена
          </Button>
        </div>
      </form>
    </Card>
  );
}

/** Контент настроек компании: слоты Ozon и Wildberries */
export function CompanySettingsContent() {
  const queryClient = useQueryClient();
  const { token } = useAuthStore();
  const companyId = useAuthStore((s) => s.user?.activeCompanyId);
  const [formState, setFormState] = useState<{
    marketplace: Marketplace | null;
    account: MarketAccountDto | null;
  }>({ marketplace: null, account: null });

  const accountsQuery = useQuery({
    queryKey: queryKeys.accounts(companyId ?? ''),
    queryFn: () => fetchAccounts(companyId!, token!),
    enabled: !!companyId && !!token,
  });

  const deleteMutation = useMutation({
    mutationFn: (accountId: string) =>
      deleteAccount(companyId!, accountId, token!),
    onSuccess: () => {
      toastSuccess('Аккаунт отключён');
      void queryClient.invalidateQueries({
        queryKey: queryKeys.accounts(companyId ?? ''),
      });
    },
    onError: (err) => {
      toastError(err instanceof Error ? err.message : 'Ошибка при удалении');
    },
  });

  useEffect(() => {
    if (accountsQuery.isError) toastError('Не удалось загрузить аккаунты');
  }, [accountsQuery.isError]);

  const accounts = accountsQuery.data ?? [];
  const ozon = accounts.find((a) => a.marketplace === 'OZON') ?? null;
  const wb = accounts.find((a) => a.marketplace === 'WILDBERRIES') ?? null;

  const handleDelete = (account: MarketAccountDto) => {
    if (!confirm(`Отключить ${account.name}?`)) return;
    deleteMutation.mutate(account.id);
  };

  if (accountsQuery.isLoading) {
    return <div className="text-gray-500">Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">
          Подключение маркетплейсов
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Подключите Ozon и Wildberries для синхронизации товаров.
        </p>
      </div>

      {formState.marketplace ? (
        <AccountForm
          marketplace={formState.marketplace}
          account={formState.account}
          onSuccess={() => setFormState({ marketplace: null, account: null })}
          onCancel={() => setFormState({ marketplace: null, account: null })}
        />
      ) : (
        <div className="space-y-4">
          <MarketplaceSlot
            marketplace="OZON"
            account={ozon}
            onEdit={() =>
              ozon && setFormState({ marketplace: 'OZON', account: ozon })
            }
            onDelete={() => ozon && handleDelete(ozon)}
            onConnect={() =>
              setFormState({ marketplace: 'OZON', account: null })
            }
          />
          <MarketplaceSlot
            marketplace="WILDBERRIES"
            account={wb}
            onEdit={() =>
              wb && setFormState({ marketplace: 'WILDBERRIES', account: wb })
            }
            onDelete={() => wb && handleDelete(wb)}
            onConnect={() =>
              setFormState({ marketplace: 'WILDBERRIES', account: null })
            }
          />
        </div>
      )}
    </div>
  );
}
