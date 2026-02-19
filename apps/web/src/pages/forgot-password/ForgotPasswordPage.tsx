import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '@/shared/api';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { useCountdown } from '@/shared/hooks/useCountdown';

const THROTTLE_KEY = 'throttle:forgot';

function getStoredCooldown(email: string): number {
  try {
    const raw = sessionStorage.getItem(`${THROTTLE_KEY}:${email.toLowerCase()}`);
    if (!raw) return 0;
    const expiresAt = Number(raw);
    if (expiresAt <= Date.now()) return 0;
    return Math.ceil((expiresAt - Date.now()) / 1000);
  } catch {
    return 0;
  }
}

function setStoredCooldown(email: string, retryAfterSeconds: number) {
  try {
    sessionStorage.setItem(
      `${THROTTLE_KEY}:${email.toLowerCase()}`,
      String(Date.now() + retryAfterSeconds * 1000)
    );
  } catch {
    /* ignore */
  }
}

function clearStoredCooldown(email: string) {
  try {
    sessionStorage.removeItem(`${THROTTLE_KEY}:${email.toLowerCase()}`);
  } catch {
    /* ignore */
  }
}

/** Страница запроса сброса пароля */
export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [countdown, startCountdown] = useCountdown(0);

  useEffect(() => {
    if (email && countdown === 0) {
      const remain = getStoredCooldown(email);
      if (remain > 0) startCountdown(remain);
    }
  }, [email]);

  useEffect(() => {
    if (countdown === 0 && email) clearStoredCooldown(email);
  }, [countdown, email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      setLoading(true);
      const res = await apiFetch('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        message?: string;
        retryAfterSeconds?: number;
      };
      if (!res.ok) {
        if (res.status === 429) {
          const retrySec = body.retryAfterSeconds ?? 60;
          setStoredCooldown(email, retrySec);
          startCountdown(retrySec);
          return;
        }
        throw new Error(body.message ?? 'Ошибка');
      }
      setSuccess(true);
      setStoredCooldown(email, 60);
      startCountdown(60);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  const showForm = countdown === 0;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-sm">
        <h1 className="text-xl font-semibold mb-6">Забыли пароль?</h1>
        {success && showForm ? (
          <div className="space-y-4 max-w-sm">
            <p className="text-green-600 text-sm">
              Если email зарегистрирован, письмо отправлено. Проверьте почту.
            </p>
            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-4 pt-2"
            >
              <Input
                type="email"
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
              <Button
                type="submit"
                disabled={loading}
                variant="secondary"
              >
                {loading ? 'Отправка...' : 'Отправить снова'}
              </Button>
            </form>
          </div>
        ) : countdown > 0 ? (
          <div className="space-y-2 max-w-sm">
            {success && (
              <p className="text-green-600 text-sm">
                Если email зарегистрирован, письмо отправлено. Проверьте почту.
              </p>
            )}
            <p className="text-gray-600 text-sm">
              Повторный запрос можно будет сделать через {countdown} сек
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 max-w-sm"
          >
            <Input
              type="email"
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <Button type="submit" disabled={loading}>
              {loading ? 'Отправка...' : 'Отправить'}
            </Button>
          </form>
        )}
        <p className="mt-4 text-sm text-gray-600">
          <Link to="/login" className="text-blue-600 hover:underline">
            Вернуться на вход
          </Link>
        </p>
      </div>
    </div>
  );
}
