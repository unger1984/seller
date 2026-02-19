import type { HTMLAttributes } from 'react';

type CardProps = HTMLAttributes<HTMLDivElement>;

/** Карточка контента в стиле Ozon */
export function Card({ className = '', children, ...props }: CardProps) {
  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}
