import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiFetch } from '@/shared/api';
import { useAuthStore } from '@/features/auth/model/authStore';
import { Button } from '@/shared/ui/Button';
import { ResendVerificationForm } from '@/features/auth/ui/ResendVerificationForm';

/** Страница verify-email — POST с token из URL */
export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<
    'loading' | 'success' | 'error' | 'no-token'
  >(token ? 'loading' : 'no-token');
  const [error, setError] = useState<string | null>(null);
  const setAuth = useAuthStore((s) => s.setAuth);

  useEffect(() => {
    if (!token) {
      setStatus('no-token');
      return;
    }
    apiFetch('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(
            (data as { message?: string }).message ??
              'Ссылка устарела. Запросите новое письмо.'
          );
          setStatus('error');
          return;
        }
        const { accessToken, user } = data as {
          accessToken: string;
          user: { id: string; email: string; activeCompanyId?: string };
        };
        setAuth(
          {
            id: user.id,
            email: user.email,
            activeCompanyId: user.activeCompanyId ?? null,
          },
          accessToken
        );
        setStatus('success');
        setTimeout(
          () => navigate('/onboarding/company', { replace: true }),
          1500
        );
      })
      .catch(() => {
        setError('Ошибка сети. Попробуйте снова.');
        setStatus('error');
      });
  }, [token, navigate, setAuth]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-sm">
          <p className="text-gray-600">Проверяем ссылку...</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-sm">
          <p className="text-green-600 font-medium">Email подтверждён</p>
          <p className="mt-2 text-gray-600 text-sm">
            Перенаправление на создание компании...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-sm max-w-sm">
        <h1 className="text-xl font-semibold mb-6">
          {status === 'no-token' ? 'Ссылка недействительна' : 'Ссылка устарела'}
        </h1>
        <p className="text-gray-600 text-sm mb-4">
          {status === 'no-token'
            ? 'Перейдите по ссылке из письма или запросите новое.'
            : (error ?? 'Запросите новое письмо.')}
        </p>
        <ResendVerificationForm />
        <p className="mt-4">
          <Button
            variant="secondary"
            onClick={() => navigate('/login', { replace: true })}
          >
            На страницу входа
          </Button>
        </p>
      </div>
    </div>
  );
}
