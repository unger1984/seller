import { Link } from 'react-router-dom';
import { LoginForm } from '@/features/auth/ui/LoginForm';

/** Страница входа */
export function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-sm">
        <h1 className="text-xl font-semibold mb-6">Seller — Вход</h1>
        <LoginForm />
        <p className="mt-4 text-sm text-gray-600">
          Нет аккаунта?{' '}
          <Link to="/register" className="text-blue-600 hover:underline">
            Зарегистрироваться
          </Link>
        </p>
      </div>
    </div>
  );
}
