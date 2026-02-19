import { useState } from 'react';
import { apiFetch } from '@/shared/api';
import { useAuthStore } from '@/features/auth/model/authStore';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Input } from '@/shared/ui/Input';

/** Страница создания компании после верификации */
export function CreateCompanyPage() {
  const token = useAuthStore((s) => s.token);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto">
        <Card className="p-8">
          <p className="text-green-600 font-medium">
            Компания создана. Дождитесь активации аккаунта.
          </p>
          <p className="mt-2 text-gray-600 text-sm">
            Администратор активирует ваш аккаунт. После этого вы сможете войти.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
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
