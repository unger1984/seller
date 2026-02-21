import { useState, useRef } from 'react';
import { NavLink, Link, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  LogOut,
  UserCircle,
  Check,
  Settings,
  FileText,
  GraduationCap,
  Plug,
  Package,
  FileSignature,
  Plus,
} from 'lucide-react';
import { useAuthStore } from '@/features/auth/model/authStore';
import { useClickOutside } from '@/shared/hooks/useClickOutside';
import { apiFetch } from '@/shared/api';
import { Logo } from '@/shared/ui/Logo';

const navItems = [
  { to: '/', label: 'Главная', icon: LayoutDashboard },
  { to: '/products', label: 'Товары', icon: Package },
];

/** Пункты меню в выпадающем профиле */
const profileMenuItems = [
  { to: '/settings', label: 'Настройки', icon: Settings },
  { to: '/offers', label: 'Оферты', icon: FileSignature },
  { to: '/documents', label: 'Документы', icon: FileText },
  { to: '/training', label: 'Обучение', icon: GraduationCap },
  { to: '/api-integrations', label: 'Интеграции по API', icon: Plug },
  { to: '/b2b', label: 'Товары для бизнеса', icon: Package },
];

/** Выпадающее меню профиля: компании с галочкой, пункты меню, выход */
function ProfileDropdown() {
  const { user, token, memberships = [], setAuth, logout } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useClickOutside(ref, () => setOpen(false));

  const handleSelectCompany = async (companyId: string) => {
    if (!token || companyId === user?.activeCompanyId) {
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch('/auth/me/active-company', {
        method: 'PATCH',
        body: JSON.stringify({ companyId }),
        token,
      });
      const data = (await res.json().catch(() => ({}))) as {
        accessToken?: string;
        user?: { id: string; email: string; activeCompanyId?: string };
        memberships?: {
          companyId: string;
          companyName: string;
          role: string;
          isActive: boolean;
        }[];
      };
      if (res.ok && data.accessToken && data.user) {
        setAuth(
          {
            id: data.user.id,
            email: data.user.email,
            activeCompanyId: data.user.activeCompanyId ?? null,
          },
          data.accessToken,
          data.memberships ?? [],
          false
        );
      }
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={loading}
        className="flex items-center justify-center size-10 rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
        aria-label="Открыть меню профиля"
      >
        <UserCircle className="size-8" aria-hidden />
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-3">
          <div className="px-4 pb-3 border-b border-gray-100">
            <p className="font-semibold text-gray-900">Профиль</p>
            <p className="text-sm text-gray-600 truncate mt-0.5">
              {user?.email}
            </p>
          </div>

          {/* Список компаний с галочкой */}
          {memberships.length > 0 && (
            <div className="px-2 py-2 border-b border-gray-100">
              {memberships.map((m) => (
                <button
                  key={m.companyId}
                  type="button"
                  onClick={() => handleSelectCompany(m.companyId)}
                  disabled={loading}
                  className="w-full flex items-center gap-2 px-2 py-2 text-sm text-left rounded-md hover:bg-gray-50"
                >
                  {m.companyId === user?.activeCompanyId ? (
                    <Check className="size-4 text-primary shrink-0" />
                  ) : (
                    <span className="size-4 shrink-0" aria-hidden />
                  )}
                  <span className="truncate">{m.companyName}</span>
                  {!m.isActive && (
                    <span className="text-amber-600 text-xs shrink-0">
                      ожидает активации
                    </span>
                  )}
                </button>
              ))}
              <Link
                to="/onboarding/add-company"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-2 py-2 text-sm text-primary hover:bg-gray-50 rounded-md mt-0.5"
              >
                <Plus className="size-4" />
                Добавить компанию
              </Link>
            </div>
          )}

          {/* Пункты меню */}
          <nav className="px-2 py-2 border-b border-gray-100">
            {profileMenuItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-2 py-2 text-sm rounded-md transition-colors ${
                    isActive
                      ? 'text-primary bg-primary/5'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`
                }
              >
                <Icon className="size-4 shrink-0" />
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Выход */}
          <div className="px-2 pt-2">
            <button
              type="button"
              onClick={() => {
                logout();
                setOpen(false);
              }}
              className="flex items-center gap-2 w-full px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
            >
              <LogOut className="size-4" />
              Выход
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Обёртка для защищённых страниц: Header + Main в стиле Ozon */
export function AppShell() {
  const { user, memberships = [], requiresCompany } = useAuthStore();

  const activeMembership = memberships.find(
    (m) => m.companyId === user?.activeCompanyId
  );
  const isBlocked = activeMembership && !activeMembership.isActive;
  const menuDisabled = (requiresCompany ?? false) || isBlocked;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-8">
              <NavLink
                to="/"
                className="hover:opacity-85 transition-opacity"
                aria-label="Seller — на главную"
              >
                <Logo size="md" />
              </NavLink>
              <nav className="flex gap-1">
                {navItems.map(({ to, label, icon: Icon }) =>
                  menuDisabled ? (
                    <span
                      key={to}
                      className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-t-md text-gray-400 cursor-not-allowed"
                      aria-disabled
                    >
                      <Icon className="size-4" aria-hidden />
                      {label}
                    </span>
                  ) : (
                    <NavLink
                      key={to}
                      to={to}
                      end={to === '/'}
                      className={({ isActive }) =>
                        `flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-t-md transition-colors ${
                          isActive
                            ? 'text-primary border-b-2 border-primary -mb-px'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }`
                      }
                    >
                      <Icon className="size-4" aria-hidden />
                      {label}
                    </NavLink>
                  )
                )}
              </nav>
            </div>
            <div className="flex items-center gap-4">
              {activeMembership && (
                <span className="text-sm text-gray-600 block text-right">
                  {activeMembership.companyName}
                  {!activeMembership.isActive && (
                    <span className="block text-amber-600 text-xs">
                      (ожидает активации)
                    </span>
                  )}
                </span>
              )}
              <ProfileDropdown />
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 p-6 lg:p-8">
        {isBlocked ? (
          <div className="max-w-lg mx-auto flex flex-col items-center justify-center py-16">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Компания «{activeMembership?.companyName}» ожидает активации
            </h2>
            <p className="text-gray-600 text-center mb-6">
              {memberships.length > 1
                ? 'Выберите другую компанию или выйдите из системы.'
                : 'Дождитесь активации компании или выйдите из системы.'}
            </p>
          </div>
        ) : (
          <Outlet />
        )}
      </main>
    </div>
  );
}
