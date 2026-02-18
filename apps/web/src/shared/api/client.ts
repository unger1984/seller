/** Базовый fetch-клиент к API. VITE_API_URL — origin (http://localhost:3000), пусто — relative /api за proxy */
const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

interface RequestOptions extends RequestInit {
  token?: string | null;
}

/** Выполнить запрос к API с поддержкой JWT */
export async function apiFetch(
  path: string,
  options: RequestOptions = {}
): Promise<Response> {
  const { token, ...fetchOpts } = options;
  const headers = new Headers(fetchOpts.headers);
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(`${API_BASE}${path}`, { ...fetchOpts, headers });
}
