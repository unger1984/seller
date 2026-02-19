import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { RegisterInput } from '@seller/shared-types';
import { apiFetch } from '@/shared/api';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';

/** Форма регистрации — email, пароль, имя */
export function RegisterForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const data: RegisterInput = { email, password, name };
    try {
      setLoading(true);
      const res = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? 'Ошибка регистрации');
      }
      setSuccess(true);
      setTimeout(() => navigate('/login', { replace: true }), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-green-600 text-sm max-w-sm">
        Вы успешно зарегистрированы. Дождитесь активации аккаунта.
        <p className="mt-2 text-gray-600">Перенаправление на вход...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-sm">
      <Input
        type="email"
        label="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
      />
      <Input
        type="password"
        label="Пароль"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={8}
        autoComplete="new-password"
      />
      <Input
        type="text"
        label="Имя"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        minLength={1}
        autoComplete="name"
      />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? 'Регистрация...' : 'Зарегистрироваться'}
      </Button>
    </form>
  );
}
