import { Link } from 'react-router-dom';
import { RegisterForm } from '@/features/auth/ui/RegisterForm';
import { Card } from '@/shared/ui/Card';
import { Logo } from '@/shared/ui/Logo';

/** Страница регистрации */
export function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-[28rem] max-w-full p-8 rounded-xl shadow-lg">
        <h1 className="mb-1">
          <Logo size="lg" className="justify-center" />
        </h1>
        <p className="text-gray-500 mb-6">Регистрация</p>
        <RegisterForm />
        <p className="mt-6 text-sm text-gray-600">
          Уже есть аккаунт?{' '}
          <Link
            to="/login"
            className="text-primary hover:underline font-medium"
          >
            Войти
          </Link>
        </p>
      </Card>
    </div>
  );
}
