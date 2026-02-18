/** Точка входа React-приложения */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app';

// eslint-disable-next-line no-console -- debug env
console.log('[main] VITE_API_URL:', import.meta.env.VITE_API_URL);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
