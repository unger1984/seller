import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
}

/** Базовая кнопка в стиле Ozon */
export function Button({
  variant = 'primary',
  className = '',
  children,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex flex-row flex-nowrap items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap';
  const variants = {
    primary: 'bg-primary text-white hover:bg-primary-hover',
    secondary:
      'bg-white border border-primary text-gray-700 hover:bg-primary-light',
    ghost: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
  };
  return (
    <button
      className={`${base} ${variants[variant]} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}
