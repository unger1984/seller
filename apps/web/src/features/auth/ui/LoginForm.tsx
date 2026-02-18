import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { LoginInput } from '@seller/shared-types';
import type { AuthUser } from '../model/authStore';
import { useAuthStore } from '../model/authStore';
import { apiFetch } from '@/shared/api';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';

interface LoginFormProps {
  /** Callback при успешном входе (опционально, по умолчанию — редирект на /) */
  onSuccess?: () => void;
}

/** Форма входа — email + пароль */
export function LoginForm({ onSuccess }: LoginFormProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);

  const handleSuccess = () => {
    onSuccess?.() ?? navigate('/', { replace: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const data: LoginInput = { email, password };
    try {
      setLoading(true);
      const res = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? 'Ошибка входа');
      }
      const json = (await res.json()) as { user: AuthUser; token: string };
      setAuth(json.user, json.token);
      handleSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

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
        autoComplete="current-password"
      />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? 'Вход...' : 'Войти'}
      </Button>
    </form>
  );
}
