import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { LoginInput } from '@seller/shared-types';
import type { AuthUser } from '../model/authStore';
import { useAuthStore } from '../model/authStore';
import { apiFetch } from '@/shared/api';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { ResendVerificationForm } from './ResendVerificationForm';

interface LoginFormProps {
  onSuccess?: () => void;
}

interface LoginResponse {
  accessToken: string;
  user: AuthUser;
  memberships: {
    companyId: string;
    companyName: string;
    role: string;
    isActive: boolean;
  }[];
  requiresCompany?: boolean;
}

/** Форма входа — email + пароль */
export function LoginForm({ onSuccess }: LoginFormProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);

  const handleSuccess = (data: LoginResponse) => {
    setAuth(
      {
        id: data.user.id,
        email: data.user.email,
        activeCompanyId: data.user.activeCompanyId ?? null,
      },
      data.accessToken,
      data.memberships ?? [],
      data.requiresCompany ?? false
    );
    if (onSuccess) {
      onSuccess();
      return;
    }
    if (data.requiresCompany) {
      navigate('/onboarding/company', { replace: true });
    } else {
      navigate('/', { replace: true });
    }
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
      const json = (await res.json()) as LoginResponse | { message: string };
      if (!res.ok) {
        const msg = 'message' in json ? json.message : 'Ошибка входа';
        if (
          res.status === 403 &&
          (msg.includes('Подтвердите email') || msg.includes('email'))
        ) {
          setShowResend(true);
        }
        throw new Error(msg);
      }
      handleSuccess(json as LoginResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
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
        <p className="text-sm">
          <Link to="/forgot-password" className="text-primary hover:underline">
            Забыли пароль?
          </Link>
        </p>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <Button type="submit" disabled={loading}>
          {loading ? 'Вход...' : 'Войти'}
        </Button>
      </form>
      {showResend && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <ResendVerificationForm initialEmail={email} />
        </div>
      )}
    </div>
  );
}
