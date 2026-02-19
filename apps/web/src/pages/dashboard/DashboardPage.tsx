import { useAuthStore } from '@/features/auth/model/authStore';
import { Button } from '@/shared/ui/Button';

/** Главная страница после входа */
export function DashboardPage() {
  const { user, logout } = useAuthStore();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-semibold">Seller</h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-600">{user?.email}</span>
          <Button variant="secondary" onClick={logout}>
            Выйти
          </Button>
        </div>
      </header>
      <main>
        <p className="text-gray-600">
          Добро пожаловать, {user?.email}. Панель управления — в разработке.
        </p>
      </main>
    </div>
  );
}
