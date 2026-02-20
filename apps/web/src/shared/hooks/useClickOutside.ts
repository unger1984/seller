import { useEffect, useRef, type RefObject } from 'react';

/** Подписка на клик вне элемента. Закрытие dropdown при клике снаружи. */
export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  onOutside: () => void
) {
  const onOutsideRef = useRef(onOutside);
  onOutsideRef.current = onOutside;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onOutsideRef.current();
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [ref]);
}
