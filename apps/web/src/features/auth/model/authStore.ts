import { create } from 'zustand';

/** Профиль пользователя после успешной аутентификации */
export interface AuthUser {
  id: string;
  email: string;
  activeCompanyId: string | null;
}

export interface Membership {
  companyId: string;
  companyName: string;
  role: string;
  isActive: boolean;
}

interface AuthState {
  /** Текущий пользователь или null при неавторизованном состоянии */
  user: AuthUser | null;
  /** JWT токен, хранится в localStorage */
  token: string | null;
  /** Выполнен ли начальный чек сессии (чтение токена из storage) */
  hydrated: boolean;
  /** Членства в компаниях (из login/me/setActiveCompany) */
  memberships: Membership[];
  /** Нужно создать компанию (memberships.length === 0) */
  requiresCompany: boolean;
  /** Установить данные авторизации после успешного логина/me/setActiveCompany */
  setAuth: (
    user: AuthUser,
    token: string,
    memberships?: Membership[],
    requiresCompany?: boolean
  ) => void;
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
  memberships: [],
  requiresCompany: false,

  setAuth: (user, token, memberships = [], requiresCompany = false) => {
    localStorage.setItem(TOKEN_KEY, token);
    set({
      user,
      token,
      memberships,
      requiresCompany,
    });
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    set({ user: null, token: null, memberships: [], requiresCompany: false });
  },

  setHydrated: () => set({ hydrated: true }),
}));
