import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/shared/ui/Button';
import { ResendVerificationForm } from '@/features/auth/ui/ResendVerificationForm';
import { useVerifyEmail } from '@/features/auth/hooks/useVerifyEmail';

/** Страница verify-email — POST с token из URL */
export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const { status, error } = useVerifyEmail(token);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-[28rem] max-w-full bg-white p-8 rounded-lg shadow-sm">
          <p className="text-gray-600">Проверяем ссылку...</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-[28rem] max-w-full bg-white p-8 rounded-lg shadow-sm">
          <p className="text-green-600 font-medium">Email подтверждён</p>
          <p className="mt-2 text-gray-600 text-sm">
            Перенаправление на создание компании...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-[28rem] max-w-full bg-white p-8 rounded-lg shadow-sm">
        <h1 className="text-xl font-semibold mb-6">
          {status === 'no-token' ? 'Ссылка недействительна' : 'Ссылка устарела'}
        </h1>
        <p className="text-gray-600 text-sm mb-4">
          {status === 'no-token'
            ? 'Перейдите по ссылке из письма или запросите новое.'
            : (error ?? 'Запросите новое письмо.')}
        </p>
        <ResendVerificationForm />
        <p className="mt-4">
          <Button
            variant="secondary"
            onClick={() => navigate('/login', { replace: true })}
          >
            На страницу входа
          </Button>
        </p>
      </div>
    </div>
  );
}
