/** Карточка товара — превью Product в списке */
export interface ProductCardProps {
  id: string;
  name: string;
  brand?: string | null;
}

export function ProductCard({ name, brand }: ProductCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:border-gray-300 transition-colors">
      <h3 className="font-medium text-gray-900">{name}</h3>
      {brand && <p className="text-sm text-gray-500 mt-0.5">{brand}</p>}
    </div>
  );
}
