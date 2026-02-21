import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '@/shared/api';
import { useAuthStore } from '@/features/auth/model/authStore';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Input } from '@/shared/ui/Input';

/** Страница создания компании после верификации (в AppShell, меню неактивно) */
export function CreateCompanyPage() {
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const setAuth = useAuthStore((s) => s.setAuth);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!token) return;
    try {
      setLoading(true);
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
      setSuccess(true);
      const meRes = await apiFetch('/auth/me', { token });
      const meData = (await meRes.json().catch(() => null)) as {
        id?: string;
        email?: string;
        activeCompanyId?: string;
        memberships?: {
          companyId: string;
          companyName: string;
          role: string;
          isActive: boolean;
        }[];
        requiresCompany?: boolean;
      } | null;
      if (meData?.id && meData.activeCompanyId) {
        const patchRes = await apiFetch('/auth/me/active-company', {
          method: 'PATCH',
          body: JSON.stringify({ companyId: meData.activeCompanyId }),
          token,
        });
        const patchData = (await patchRes.json().catch(() => null)) as {
          accessToken?: string;
          user?: { activeCompanyId?: string };
          memberships?: {
            companyId: string;
            companyName: string;
            role: string;
            isActive: boolean;
          }[];
        } | null;
        const newToken =
          patchRes.ok && patchData?.accessToken ? patchData.accessToken : token;
        setAuth(
          {
            id: meData.id,
            email: meData.email ?? '',
            activeCompanyId: meData.activeCompanyId,
          },
          newToken,
          patchData?.memberships ?? meData.memberships ?? [],
          meData.requiresCompany ?? false
        );
        setTimeout(() => navigate('/', { replace: true }), 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="w-[28rem] max-w-full mx-auto">
        <Card className="p-8">
          <p className="text-green-600 font-medium">
            Компания создана. Дождитесь активации компании.
          </p>
          <p className="mt-2 text-gray-600 text-sm">
            Администратор активирует компанию. После этого вы сможете
            пользоваться системой.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-[28rem] max-w-full mx-auto">
      <Card className="p-8">
        <h1 className="text-xl font-semibold mb-6">Создание компании</h1>
        <p className="text-gray-600 text-sm mb-4">
          Укажите название вашей компании.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-sm">
          <Input
            type="text"
            label="Название компании"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={1}
            autoComplete="organization"
          />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? 'Создание...' : 'Создать'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
