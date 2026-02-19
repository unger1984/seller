import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from '@/features/auth/model/authStore';
import { apiFetch } from '@/shared/api';
import { Providers } from './providers';
import { LoginPage } from '@/pages/login/LoginPage';
import { RegisterPage } from '@/pages/register/RegisterPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';

/** Корневой компонент: провайдеры + роутинг */
function AppRoutes() {
  const { user, token, hydrated, setHydrated } = useAuthStore();

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
              name: data.name ?? null,
              activeCompanyId: data.activeCompanyId ?? null,
            },
            stored
          );
        } else {
          localStorage.removeItem('seller_token');
        }
      })
      .catch(() => localStorage.removeItem('seller_token'))
      .finally(() => setHydrated());
  }, [setHydrated]);

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
      <Route
        path="/"
        element={
          user && token ? <DashboardPage /> : <Navigate to="/login" replace />
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <Providers>
      <AppRoutes />
    </Providers>
  );
}
