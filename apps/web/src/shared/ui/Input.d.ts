import type { InputHTMLAttributes } from 'react';
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}
/** Поле ввода с подписью */
export declare function Input({
  label,
  id,
  className,
  ...props
}: InputProps): import('react/jsx-runtime').JSX.Element;
export {};
//# sourceMappingURL=Input.d.ts.map
