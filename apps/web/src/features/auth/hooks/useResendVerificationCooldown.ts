import { useEffect, useState } from 'react';
import { apiFetch } from '@/shared/api';
import { useCountdown } from '@/shared/hooks/useCountdown';

/** Загружает cooldown с бэка при initialEmail и запускает обратный отсчёт. */
export function useResendVerificationCooldown(initialEmail: string) {
  const [cooldownLoading, setCooldownLoading] = useState(!!initialEmail);
  const [countdown, startCountdown] = useCountdown(0);

  useEffect(() => {
    if (!initialEmail) {
      setCooldownLoading(false);
      return;
    }
    const url = `/auth/resend-verification/cooldown?email=${encodeURIComponent(initialEmail)}`;
    apiFetch(url)
      .then((r) => r.json())
      .then((data: { retryAfterSeconds?: number }) => {
        const sec = data.retryAfterSeconds ?? 0;
        if (sec > 0) startCountdown(sec);
      })
      .catch(() => {})
      .finally(() => setCooldownLoading(false));
  }, [initialEmail, startCountdown]);

  return { cooldownLoading, countdown, startCountdown };
}
