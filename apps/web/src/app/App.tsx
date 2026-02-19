import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from '@/features/auth/model/authStore';
import { apiFetch } from '@/shared/api';
import { Providers } from './providers';
import { AppShell } from '@/layouts/AppShell';
import { LoginPage } from '@/pages/login/LoginPage';
import { RegisterPage } from '@/pages/register/RegisterPage';
import { VerifyEmailPage } from '@/pages/verify-email/VerifyEmailPage';
import { ForgotPasswordPage } from '@/pages/forgot-password/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/reset-password/ResetPasswordPage';
import { CreateCompanyPage } from '@/pages/onboarding/CreateCompanyPage';
import { SelectCompanyPage } from '@/pages/onboarding/SelectCompanyPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';

/** Корневой компонент: провайдеры + роутинг */
function AppRoutes() {
  const navigate = useNavigate();
  const { user, token, hydrated, setAuth, setHydrated } = useAuthStore();

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
          useAuthStore.getState().setAuth(
            {
              id: data.id,
              email: data.email,
              activeCompanyId: data.activeCompanyId ?? null,
            },
            stored
          );
          if (data.requiresCompany) {
            navigate('/onboarding/company', { replace: true });
            return;
          }
          if ((data.memberships?.length ?? 0) > 1 && !data.activeCompanyId) {
            navigate('/onboarding/select-company', { replace: true });
            return;
          }
          if ((data.memberships?.length ?? 0) === 1 && !data.activeCompanyId) {
            navigate('/', { replace: true });
            return;
          }
        } else {
          localStorage.removeItem('seller_token');
        }
      })
      .catch(() => localStorage.removeItem('seller_token'))
      .finally(() => setHydrated());
  }, [navigate, setAuth, setHydrated]);

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Загрузка...
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="/"
        element={
          user && token ? <AppShell /> : <Navigate to="/login" replace />
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="onboarding/company" element={<CreateCompanyPage />} />
        <Route
          path="onboarding/select-company"
          element={<SelectCompanyPage />}
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <div className="font-sans antialiased">
      <Providers>
        <AppRoutes />
      </Providers>
    </div>
  );
}
