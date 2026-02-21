import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth/model/authStore';
import { switchActiveCompany } from '@/features/auth/api/auth.api';
import {
  createCompany,
  fetchAuthMe,
} from '@/features/onboarding/api/companies.api';
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
  const [success, setSuccess] = useState(false);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error('Нет доступа');
      await createCompany(name, token);
      const meData = await fetchAuthMe(token);
      if (meData.activeCompanyId) {
        const data = await switchActiveCompany(meData.activeCompanyId, token);
        setAuth(
          {
            id: meData.id,
            email: meData.email ?? '',
            activeCompanyId: data.user.activeCompanyId ?? null,
          },
          data.accessToken,
          data.memberships,
          meData.requiresCompany ?? false
        );
        setTimeout(() => navigate('/', { replace: true }), 2000);
      }
      return meData;
    },
    onSuccess: () => setSuccess(true),
    onError: (err) =>
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    createMutation.mutate();
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
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Создание...' : 'Создать'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
