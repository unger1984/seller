import { Package, BarChart3, FileText } from 'lucide-react';
import { Card } from '@/shared/ui/Card';

/** Главная страница после входа */
export function DashboardPage() {
  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Главная</h1>
      <p className="text-gray-500 mb-8">Добро пожаловать</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="p-6 hover:shadow-md transition-shadow">
          <Package className="size-8 text-primary mb-3" aria-hidden />
          <h2 className="font-semibold text-gray-900 mb-1">Товары</h2>
          <p className="text-sm text-gray-500">
            Управление каталогом товаров для Ozon и Wildberries
          </p>
        </Card>
        <Card className="p-6 hover:shadow-md transition-shadow">
          <BarChart3 className="size-8 text-primary mb-3" aria-hidden />
          <h2 className="font-semibold text-gray-900 mb-1">Аналитика</h2>
          <p className="text-sm text-gray-500">Отчёты и статистика продаж</p>
        </Card>
        <Card className="p-6 hover:shadow-md transition-shadow">
          <FileText className="size-8 text-primary mb-3" aria-hidden />
          <h2 className="font-semibold text-gray-900 mb-1">Заказы</h2>
          <p className="text-sm text-gray-500">
            Обработка заказов с маркетплейсов
          </p>
        </Card>
      </div>
    </div>
  );
}
