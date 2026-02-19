import { useEffect, useState } from 'react';

/**
 * Обратный отсчёт в секундах.
 * @param initialSeconds — стартовое значение, 0 = не запущен
 * @returns [оставшиеся секунды, запустить с нового значения]
 */
export function useCountdown(
  initialSeconds = 0
): [number, (seconds: number) => void] {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    if (seconds <= 0) return;
    const id = setInterval(() => {
      setSeconds((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [seconds]);

  const start = (s: number) => setSeconds(s > 0 ? s : 0);

  return [seconds, start];
}
