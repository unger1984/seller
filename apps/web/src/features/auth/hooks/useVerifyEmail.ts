import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '@/shared/api';
import { useAuthStore } from '@/features/auth/model/authStore';

export type VerifyEmailStatus = 'loading' | 'success' | 'error' | 'no-token';

/** Вызов verify-email API при mount. Возвращает status и error для отображения в UI. */
export function useVerifyEmail(token: string | null) {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [status, setStatus] = useState<VerifyEmailStatus>(
    token ? 'loading' : 'no-token'
  );
  const [error, setError] = useState<string | null>(null);

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
        const {
          accessToken,
          user,
          memberships = [],
          requiresCompany = false,
        } = data as {
          accessToken: string;
          user: { id: string; email: string; activeCompanyId?: string };
          memberships?: {
            companyId: string;
            companyName: string;
            role: string;
            isActive: boolean;
          }[];
          requiresCompany?: boolean;
        };
        setAuth(
          {
            id: user.id,
            email: user.email,
            activeCompanyId: user.activeCompanyId ?? null,
          },
          accessToken,
          memberships,
          requiresCompany
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

  return { status, error };
}
