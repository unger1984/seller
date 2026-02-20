import { NavLink, Outlet } from 'react-router-dom';
import { Building2, UserCircle } from 'lucide-react';

const settingsNavItems = [
  { to: '/settings/company', label: 'Настройки компании', icon: Building2 },
  { to: '/settings/account', label: 'Учётная запись', icon: UserCircle },
];

/** Layout настроек: сайдбар слева, контент справа */
export function SettingsLayout() {
  return (
    <div className="max-w-5xl mx-auto flex gap-8">
      <aside className="w-56 shrink-0">
        <nav className="flex flex-col gap-0.5">
          {settingsNavItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/settings'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              <Icon className="size-5 shrink-0" aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="flex-1 min-w-0">
        <Outlet />
      </div>
    </div>
  );
}
