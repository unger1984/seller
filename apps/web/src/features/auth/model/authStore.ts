import { create } from 'zustand';

/** Профиль пользователя после успешной аутентификации */
export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  activeCompanyId: string | null;
}

interface AuthState {
  /** Текущий пользователь или null при неавторизованном состоянии */
  user: AuthUser | null;
  /** JWT токен, хранится в localStorage */
  token: string | null;
  /** Выполнен ли начальный чек сессии (чтение токена из storage) */
  hydrated: boolean;
  /** Установить данные авторизации после успешного логина */
  setAuth: (user: AuthUser, token: string) => void;
  /** Выйти из системы */
  logout: () => void;
  /** Пометить hydrated после чтения токена */
  setHydrated: () => void;
}

const TOKEN_KEY = 'seller_token';

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  hydrated: false,

  setAuth: (user, token) => {
    localStorage.setItem(TOKEN_KEY, token);
    set({ user, token });
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    set({ user: null, token: null });
  },

  setHydrated: () => set({ hydrated: true }),
}));
