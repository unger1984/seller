import { toast } from 'react-toastify';

const OPTIONS = {
  position: 'top-center' as const,
  autoClose: 2000,
  theme: 'colored' as const,
};

/** Показать успешное уведомление */
export function toastSuccess(message: string): void {
  toast.success(message, OPTIONS);
}

/** Показать уведомление об ошибке (поддержка \n) */
export function toastError(message: string): void {
  toast.error(message, { ...OPTIONS, style: { whiteSpace: 'pre-line' } });
}
