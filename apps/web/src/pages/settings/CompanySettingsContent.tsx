import { useState, useEffect, useCallback } from 'react';
import { Card, Button, Input, toastSuccess, toastError } from '@/shared/ui';
import { apiFetch } from '@/shared/api';
import { useAuthStore } from '@/features/auth/model/authStore';
import { Pencil, Trash2 } from 'lucide-react';

type Marketplace = 'OZON' | 'WILDBERRIES';

interface MarketAccountDto {
  id: string;
  marketplace: Marketplace;
  name: string;
  isActive: boolean;
  createdAt: string;
}

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
  const { token } = useAuthStore();
  const companyId = useAuthStore((s) => s.user?.activeCompanyId);
  const [submitting, setSubmitting] = useState(false);
  const [clientId, setClientId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [name, setName] = useState(MARKETPLACE_LABELS[marketplace]);

  const isEdit = !!account;
  const isOzon = marketplace === 'OZON';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !token) return;
    setSubmitting(true);
    try {
      const path = `/companies/${companyId}/accounts`;
      if (isEdit) {
        const body = isOzon
          ? { marketplace: 'OZON', credentials: { clientId, apiKey } }
          : { marketplace: 'WILDBERRIES', credentials: { apiKey } };
        const res = await apiFetch(`${path}/${account.id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
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
        toastSuccess('Данные обновлены');
      } else {
        const body = isOzon
          ? { marketplace: 'OZON', name, credentials: { clientId, apiKey } }
          : { marketplace: 'WILDBERRIES', name, credentials: { apiKey } };
        const res = await apiFetch(path, {
          method: 'POST',
          body: JSON.stringify(body),
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
        toastSuccess('Маркетплейс подключён');
      }
      onSuccess();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Ошибка при сохранении');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="p-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <h3 className="font-medium text-gray-900">
          {isEdit ? 'Изменить' : 'Подключить'} {MARKETPLACE_LABELS[marketplace]}
        </h3>
        {!isEdit && (
          <Input
            label="Название"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        )}
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
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Сохранение...' : 'Сохранить'}
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
  const { token } = useAuthStore();
  const companyId = useAuthStore((s) => s.user?.activeCompanyId);
  const [accounts, setAccounts] = useState<MarketAccountDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [formState, setFormState] = useState<{
    marketplace: Marketplace | null;
    account: MarketAccountDto | null;
  }>({ marketplace: null, account: null });

  const fetchAccounts = useCallback(async () => {
    if (!companyId || !token) {
      setLoading(false);
      return;
    }
    try {
      const res = await apiFetch(`/companies/${companyId}/accounts`, { token });
      if (res.ok) {
        const data = (await res.json()) as MarketAccountDto[];
        setAccounts(data);
      }
    } catch {
      toastError('Не удалось загрузить аккаунты');
    } finally {
      setLoading(false);
    }
  }, [companyId, token]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const ozon = accounts.find((a) => a.marketplace === 'OZON') ?? null;
  const wb = accounts.find((a) => a.marketplace === 'WILDBERRIES') ?? null;

  const handleDelete = async (account: MarketAccountDto) => {
    if (!companyId || !token) return;
    if (!confirm(`Отключить ${account.name}?`)) return;
    try {
      const res = await apiFetch(
        `/companies/${companyId}/accounts/${account.id}`,
        {
          method: 'DELETE',
          token,
        }
      );
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(err.message ?? 'Аккаунт маркетплейса не найден');
      }
      toastSuccess('Аккаунт отключён');
      fetchAccounts();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Ошибка при удалении');
    }
  };

  if (loading) {
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
          onSuccess={() => {
            setFormState({ marketplace: null, account: null });
            fetchAccounts();
          }}
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
