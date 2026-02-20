import { useState } from 'react';
import { apiFetch } from '@/shared/api';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { useResendVerificationCooldown } from '@/features/auth/hooks/useResendVerificationCooldown';

interface ResendVerificationFormProps {
  initialEmail?: string;
}

/** Форма «Отправить письмо снова» для верификации email. Cooldown берётся с бэка */
export function ResendVerificationForm({
  initialEmail = '',
}: ResendVerificationFormProps) {
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { cooldownLoading, countdown, startCountdown } =
    useResendVerificationCooldown(initialEmail);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      setLoading(true);
      const res = await apiFetch('/auth/resend-verification', {
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
          startCountdown(retrySec);
          return;
        }
        throw new Error(body.message ?? 'Ошибка');
      }
      setSuccess(true);
      startCountdown(60);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  if (cooldownLoading) {
    return (
      <p className="text-gray-600 text-sm">
        Проверяем возможность повторной отправки...
      </p>
    );
  }

  if (countdown > 0) {
    return (
      <div className="space-y-2">
        {success && (
          <p className="text-green-600 text-sm">
            Письмо отправлено. Проверьте почту.
          </p>
        )}
        <p className="text-gray-600 text-sm">
          Повторный запрос можно будет сделать через {countdown} сек
        </p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="space-y-4 max-w-sm">
        <p className="text-green-600 text-sm">
          Письмо отправлено. Проверьте почту.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            type="email"
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <Button type="submit" disabled={loading} variant="secondary">
            {loading ? 'Отправка...' : 'Отправить письмо снова'}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-sm">
      <p className="text-gray-600 text-sm">Не пришло письмо?</p>
      <Input
        type="email"
        label="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
      />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <Button type="submit" disabled={loading} variant="secondary">
        {loading ? 'Отправка...' : 'Отправить письмо снова'}
      </Button>
    </form>
  );
}
