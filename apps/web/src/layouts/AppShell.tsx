import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, LogOut } from 'lucide-react';
import { useAuthStore } from '@/features/auth/model/authStore';
import { Button } from '@/shared/ui/Button';

const navItems = [{ to: '/', label: 'Главная', icon: LayoutDashboard }];

/** Обёртка для защищённых страниц: Header + Main в стиле Ozon */
export function AppShell() {
  const { user, logout } = useAuthStore();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-8">
              <NavLink
                to="/"
                className="text-xl font-semibold text-gray-900 hover:text-primary transition-colors"
              >
                Seller
              </NavLink>
              <nav className="flex gap-1">
                {navItems.map(({ to, label, icon: Icon }) => (
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
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{user?.email}</span>
              <Button variant="ghost" onClick={logout}>
                <span className="inline-flex items-center gap-2">
                  Выйти
                  <LogOut className="size-4" aria-hidden />
                </span>
              </Button>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}
