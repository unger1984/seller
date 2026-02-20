import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

/** Поле ввода с подписью. Для type="password" — глазик показа/скрытия пароля */
export function Input({
  label,
  id,
  className = '',
  type,
  ...props
}: InputProps) {
  const inputId = id ?? `input-${label.replace(/\s/g, '-')}`;
  const isPassword = type === 'password';
  const [showPassword, setShowPassword] = useState(false);
  const effectiveType = isPassword && showPassword ? 'text' : type;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="relative w-full">
        <input
          id={inputId}
          type={effectiveType}
          className={`w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${
            isPassword ? 'pr-10' : ''
          } ${className}`.trim()}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded cursor-pointer text-gray-500 hover:text-gray-800 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/50"
            aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
    </div>
  );
}
