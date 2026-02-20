import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { RegisterInput } from '@seller/shared-types';
import { apiFetch } from '@/shared/api';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { ResendVerificationForm } from './ResendVerificationForm';

/** Форма регистрации — email, пароль */
export function RegisterForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showResend, setShowResend] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== passwordConfirm) {
      setError('Пароли не совпадают');
      return;
    }
    const data: RegisterInput = { email, password };
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-4 max-w-sm">
        <p className="text-green-600 text-sm">
          Проверьте почту. Мы отправили ссылку для подтверждения email.
        </p>
        <p className="text-sm text-gray-600">
          <Link to="/login" className="text-primary hover:underline">
            Войти
          </Link>
        </p>
        {showResend ? (
          <ResendVerificationForm initialEmail={email} />
        ) : (
          <button
            type="button"
            onClick={() => setShowResend(true)}
            className="text-sm text-gray-600 hover:text-gray-900 underline"
          >
            Не пришло письмо?
          </button>
        )}
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
        type="password"
        label="Повторите пароль"
        value={passwordConfirm}
        onChange={(e) => setPasswordConfirm(e.target.value)}
        required
        minLength={8}
        autoComplete="new-password"
      />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? 'Регистрация...' : 'Зарегистрироваться'}
      </Button>
    </form>
  );
}
