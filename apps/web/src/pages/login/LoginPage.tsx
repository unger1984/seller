import { LoginForm } from '@/features/auth/ui/LoginForm';

/** Страница входа */
export function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-sm">
        <h1 className="text-xl font-semibold mb-6">Seller — Вход</h1>
        <LoginForm />
      </div>
    </div>
  );
}
