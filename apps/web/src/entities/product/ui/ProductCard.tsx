/** Карточка товара — превью Product в списке */
export interface ProductCardProps {
  id: string;
  name: string;
  brand?: string | null;
}

export function ProductCard({ name, brand }: ProductCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 p-4 hover:border-gray-300">
      <h3 className="font-medium">{name}</h3>
      {brand && <p className="text-sm text-gray-500">{brand}</p>}
    </div>
  );
}
