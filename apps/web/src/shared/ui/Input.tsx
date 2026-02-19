import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

/** Поле ввода с подписью */
export function Input({ label, id, className = '', ...props }: InputProps) {
  const inputId = id ?? `input-${label.replace(/\s/g, '-')}`;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        id={inputId}
        className={`border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${className}`.trim()}
        {...props}
      />
    </div>
  );
}
