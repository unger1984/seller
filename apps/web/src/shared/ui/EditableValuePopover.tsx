import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { Button, Input } from '@/shared/ui';

type FieldType = 'price' | 'stock';

interface EditableValuePopoverProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  fieldLabel: string;
  type: FieldType;
  value: number;
  productId: string;
  onSubmit: (
    productId: string,
    payload: { price?: number; stock?: number }
  ) => Promise<void>;
}

/** Popover для быстрого редактирования цены или остатка при клике */
export function EditableValuePopover({
  children,
  title,
  subtitle,
  fieldLabel,
  type,
  value,
  productId,
  onSubmit,
}: EditableValuePopoverProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [inputValue, setInputValue] = useState(String(value));
  const [submitting, setSubmitting] = useState(false);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const openPopover = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setPosition({
        top: rect.bottom + 6,
        left: rect.left,
      });
      setInputValue(String(value));
      setOpen(true);
    },
    [value]
  );

  const closePopover = useCallback(() => setOpen(false), []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const parsed =
        type === 'price'
          ? parseFloat(inputValue.replace(/\s/g, '').replace(',', '.'))
          : parseInt(inputValue, 10);
      if (Number.isNaN(parsed) || (type === 'stock' && parsed < 0)) return;
      setSubmitting(true);
      try {
        const payload =
          type === 'price' ? { price: parsed } : { stock: parsed };
        await onSubmit(productId, payload);
        closePopover();
      } finally {
        setSubmitting(false);
      }
    },
    [inputValue, type, productId, onSubmit, closePopover]
  );

  useLayoutEffect(() => {
    if (!open || !popoverRef.current) return;
    const el = popoverRef.current;
    const rect = el.getBoundingClientRect();
    const padding = 8;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    let { top, left } = position;
    if (left + rect.width > viewportW - padding) {
      left = viewportW - rect.width - padding;
    }
    if (left < padding) left = padding;
    if (top + rect.height > viewportH - padding) {
      top = viewportH - rect.height - padding;
    }
    if (top < padding) top = padding;
    if (left !== position.left || top !== position.top) {
      setPosition({ top, left });
    }
  }, [open, position.left, position.top]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePopover();
    };
    const handleClickOutside = (e: Event) => {
      const target = e.target as Node;
      if (
        popoverRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      ) {
        return;
      }
      closePopover();
    };
    window.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, closePopover]);

  return (
    <>
      <span
        ref={triggerRef}
        role="button"
        tabIndex={0}
        onClick={openPopover}
        onKeyDown={(e) =>
          e.key === 'Enter' && openPopover(e as unknown as MouseEvent)
        }
        className="cursor-pointer hover:bg-gray-100 rounded px-0.5 -mx-0.5 transition-colors outline-none focus:ring-1 focus:ring-primary/50 focus:ring-inset"
        aria-label={`Редактировать ${fieldLabel.toLowerCase()}`}
      >
        {children}
      </span>
      {open && (
        <div
          ref={popoverRef}
          className="fixed z-50 w-64 rounded-xl border border-gray-200 bg-white p-4 shadow-lg"
          style={{
            top: position.top,
            left: position.left,
          }}
          role="dialog"
          aria-modal
          aria-labelledby="editable-popover-title"
        >
          <h3
            id="editable-popover-title"
            className="text-sm font-semibold text-gray-900"
          >
            {title}
          </h3>
          {subtitle ? (
            <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
          ) : null}
          <form onSubmit={handleSubmit} className="mt-3 space-y-3">
            <Input
              label={fieldLabel}
              type={type === 'price' ? 'text' : 'number'}
              inputMode={type === 'price' ? 'decimal' : 'numeric'}
              min={type === 'stock' ? 0 : undefined}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              autoFocus
              disabled={submitting}
            />
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="ghost" onClick={closePopover}>
                Отмена
              </Button>
              <Button type="submit" disabled={submitting}>
                Применить
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
