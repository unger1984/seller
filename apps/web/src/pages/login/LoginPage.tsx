import { Link } from 'react-router-dom';
import { LoginForm } from '@/features/auth/ui/LoginForm';
import { Card } from '@/shared/ui/Card';
import { Logo } from '@/shared/ui/Logo';

/** Страница входа */
export function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-[28rem] max-w-full p-8 rounded-xl shadow-lg">
        <h1 className="mb-1">
          <Logo size="lg" className="justify-center" />
        </h1>
        <p className="text-gray-500 mb-6">Вход</p>
        <LoginForm />
        <p className="mt-6 text-sm text-gray-600">
          Нет аккаунта?{' '}
          <Link
            to="/register"
            className="text-primary hover:underline font-medium"
          >
            Зарегистрироваться
          </Link>
        </p>
      </Card>
    </div>
  );
}
