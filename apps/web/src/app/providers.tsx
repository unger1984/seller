import type { ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';

interface ProvidersProps {
  children: ReactNode;
}

/** Обёртка провайдеров: router, zustand (если будут обёртки) */
export function Providers({ children }: ProvidersProps) {
  return <BrowserRouter>{children}</BrowserRouter>;
}
