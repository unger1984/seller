import { Component, type ReactNode } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuthStore } from '@/features/auth/model/authStore';
import { useAuthHydration } from '@/features/auth/hooks/useAuthHydration';
import { Providers } from './providers';
import { AppShell } from '@/layouts/AppShell';
import { SettingsLayout } from '@/pages/settings/SettingsLayout';
import { CompanySettingsContent } from '@/pages/settings/CompanySettingsContent';
import { AccountSettingsPlaceholder } from '@/pages/settings/AccountSettingsPlaceholder';
import { LoginPage } from '@/pages/login/LoginPage';
import { RegisterPage } from '@/pages/register/RegisterPage';
import { VerifyEmailPage } from '@/pages/verify-email/VerifyEmailPage';
import { ForgotPasswordPage } from '@/pages/forgot-password/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/reset-password/ResetPasswordPage';
import { CreateCompanyPage } from '@/pages/onboarding/CreateCompanyPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { ProductsPage } from '@/pages/products/ProductsPage';

/** Ловит падения дочерних компонентов, чтобы не было белого экрана */
class RouteErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    /* Fallback UI показан в render */
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
          <p className="text-red-600">
            Что-то пошло не так. Обновите страницу.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

/** Корневой компонент: провайдеры + роутинг */
function AppRoutes() {
  const location = useLocation();
  const { user, token, hydrated, requiresCompany } = useAuthStore();

  useAuthHydration();

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Загрузка...
      </div>
    );
  }

  // requireCompany + на / — редирект до рендера Routes, чтобы не мелькал Dashboard
  if (user && token && requiresCompany && location.pathname === '/') {
    return <Navigate to="/onboarding/company" replace />;
  }

  return (
    <RouteErrorBoundary>
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
          <Route path="products" element={<ProductsPage />} />
          <Route path="settings" element={<SettingsLayout />}>
            <Route index element={<Navigate to="company" replace />} />
            <Route path="company" element={<CompanySettingsContent />} />
            <Route path="account" element={<AccountSettingsPlaceholder />} />
          </Route>
          <Route path="offers" element={<DashboardPage />} />
          <Route path="documents" element={<DashboardPage />} />
          <Route path="training" element={<DashboardPage />} />
          <Route path="api-integrations" element={<DashboardPage />} />
          <Route path="b2b" element={<DashboardPage />} />
          <Route
            path="onboarding/company"
            element={
              requiresCompany ? (
                <CreateCompanyPage />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="onboarding/add-company"
            element={<CreateCompanyPage />}
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </RouteErrorBoundary>
  );
}

export function App() {
  return (
    <div className="font-sans antialiased">
      <Providers>
        <AppRoutes />
        <ToastContainer
          position="top-center"
          theme="colored"
          autoClose={2000}
        />
      </Providers>
    </div>
  );
}
