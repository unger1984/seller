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
export declare const useAuthStore: import('zustand').UseBoundStore<
  import('zustand').StoreApi<AuthState>
>;
export {};
//# sourceMappingURL=authStore.d.ts.map
