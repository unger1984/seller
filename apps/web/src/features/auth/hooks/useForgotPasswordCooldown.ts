import { useEffect } from 'react';
import { useCountdown } from '@/shared/hooks/useCountdown';

const THROTTLE_KEY = 'throttle:forgot';

function getStoredCooldown(email: string): number {
  try {
    const raw = sessionStorage.getItem(
      `${THROTTLE_KEY}:${email.toLowerCase()}`
    );
    if (!raw) return 0;
    const expiresAt = Number(raw);
    if (expiresAt <= Date.now()) return 0;
    return Math.ceil((expiresAt - Date.now()) / 1000);
  } catch {
    return 0;
  }
}

export function setStoredCooldown(email: string, retryAfterSeconds: number) {
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

/** Восстанавливает countdown из sessionStorage при смене email и очищает при завершении. */
export function useForgotPasswordCooldown(email: string) {
  const [countdown, startCountdown] = useCountdown(0);

  useEffect(() => {
    if (!email) return;
    const remain = getStoredCooldown(email);
    if (remain > 0) startCountdown(remain);
  }, [email, startCountdown]);

  useEffect(() => {
    if (countdown === 0 && email) clearStoredCooldown(email);
  }, [countdown, email]);

  return { countdown, startCountdown };
}
