import { Link } from 'react-router-dom';
import { RegisterForm } from '@/features/auth/ui/RegisterForm';

/** Страница регистрации */
export function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-sm">
        <h1 className="text-xl font-semibold mb-6">Seller — Регистрация</h1>
        <RegisterForm />
        <p className="mt-4 text-sm text-gray-600">
          Уже есть аккаунт?{' '}
          <Link to="/login" className="text-blue-600 hover:underline">
            Войти
          </Link>
        </p>
      </div>
    </div>
  );
}
