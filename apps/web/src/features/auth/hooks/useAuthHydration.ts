import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/model/authStore';
import { apiFetch } from '@/shared/api';

/**
 * Гидратация auth store из localStorage при загрузке приложения.
 * Проверяет токен, вызывает /auth/me, обновляет store и при необходимости делает навигацию.
 */
export function useAuthHydration() {
  const navigate = useNavigate();
  const { setHydrated } = useAuthStore();
  const hydrationNavigateDone = useRef(false);

  useEffect(() => {
    const stored = localStorage.getItem('seller_token');
    if (!stored) {
      setHydrated();
      return;
    }
    apiFetch('/auth/me', { token: stored })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.id) {
          const memberships = (data.memberships ?? []) as {
            companyId: string;
            companyName: string;
            role: string;
            isActive: boolean;
          }[];
          const requiresCompany = data.requiresCompany ?? false;
          useAuthStore.getState().setAuth(
            {
              id: data.id,
              email: data.email,
              activeCompanyId: data.activeCompanyId ?? null,
            },
            stored,
            memberships,
            requiresCompany
          );
          if (!hydrationNavigateDone.current) {
            hydrationNavigateDone.current = true;
            if (requiresCompany) {
              navigate('/onboarding/company', { replace: true });
            } else {
              navigate('/', { replace: true });
            }
          }
        } else {
          localStorage.removeItem('seller_token');
        }
      })
      .catch(() => localStorage.removeItem('seller_token'))
      .finally(() => setHydrated());
  }, [navigate, setHydrated]);
}
