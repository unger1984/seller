import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiFetch } from '@/shared/api';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';

/** Страница установки нового пароля — token из URL */
export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!token) return;
    try {
      setLoading(true);
      const res = await apiFetch('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token,
          password,
          passwordConfirm,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        throw new Error(
          data.message ?? 'Ссылка устарела. Запросите сброс пароля снова.'
        );
      }
      setSuccess(true);
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-sm">
          <h1 className="text-xl font-semibold mb-6">Ссылка недействительна</h1>
          <p className="text-gray-600 text-sm mb-4">
            Перейдите по ссылке из письма или запросите сброс пароля снова.
          </p>
          <Link to="/forgot-password" className="text-primary hover:underline">
            Запросить сброс пароля
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-sm">
          <p className="text-green-600 font-medium">Пароль изменён</p>
          <p className="mt-2 text-gray-600 text-sm">
            Войдите в систему. Перенаправление...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-sm">
        <h1 className="text-xl font-semibold mb-6">Новый пароль</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-sm">
          <Input
            type="password"
            label="Новый пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
          <Input
            type="password"
            label="Подтвердите пароль"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </form>
        <p className="mt-4 text-sm text-gray-600">
          <Link to="/forgot-password" className="text-primary hover:underline">
            Запросить новую ссылку
          </Link>
        </p>
      </div>
    </div>
  );
}
