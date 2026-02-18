import type { ButtonHTMLAttributes } from 'react';
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}
/** Базовая кнопка */
export declare function Button({
  variant,
  className,
  children,
  ...props
}: ButtonProps): import('react/jsx-runtime').JSX.Element;
export {};
//# sourceMappingURL=Button.d.ts.map
