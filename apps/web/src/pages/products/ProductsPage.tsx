import { useState } from 'react';
import {
  Copy,
  Download,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Button,
  Card,
  EditableValuePopover,
  Input,
  toastSuccess,
} from '@/shared/ui';
import { useProductsPage } from '@/features/products/hooks/useProductsPage';
const OZON_PRODUCT_URL = (sku: string) => `https://ozon.ru/product/${sku}`;
const WB_PRODUCT_URL = (nmId: string) =>
  `https://www.wildberries.ru/catalog/${nmId}/detail.aspx`;

function CopyArticulButton({ value }: { value: string }) {
  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    toastSuccess('Скопировано');
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="p-0.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
      aria-label="Копировать артикул"
    >
      <Copy className="size-3.5" aria-hidden />
    </button>
  );
}

/** Страница списка товаров — UI только */
export function ProductsPage() {
  const {
    accounts,
    products,
    total,
    page,
    limit,
    setPage,
    search,
    setSearch,
    loading,
    importStatus,
    addModalOpen,
    setAddModalOpen,
    hasOzon,
    hasWb,
    handleImport,
    handleClearCatalog,
    handleCreateProduct,
    handleUpdateOzonMarket,
    handleUpdateWbMarket,
  } = useProductsPage();

  return (
    <div className="space-y-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-semibold text-gray-900">
            Список товаров
          </h1>
          <div className="flex flex-wrap gap-2">
            {hasWb &&
              (() => {
                const wbId = accounts.find(
                  (a) => a.marketplace === 'WILDBERRIES'
                )?.id;
                const wbImporting = wbId ? importStatus[wbId]?.active : false;
                return wbImporting ? (
                  <div className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600">
                    <span
                      className="inline-block size-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"
                      aria-hidden
                    />
                    Скачивание с WB...
                  </div>
                ) : (
                  <Button
                    variant="secondary"
                    onClick={() => handleImport('WILDBERRIES')}
                    aria-label="Скачать с WB"
                  >
                    <Download className="size-4" aria-hidden />
                    Скачать с WB
                  </Button>
                );
              })()}
            {hasOzon &&
              (() => {
                const ozonId = accounts.find(
                  (a) => a.marketplace === 'OZON'
                )?.id;
                const ozonImporting = ozonId
                  ? importStatus[ozonId]?.active
                  : false;
                return ozonImporting ? (
                  <div className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600">
                    <span
                      className="inline-block size-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"
                      aria-hidden
                    />
                    Скачивание с Озон...
                  </div>
                ) : (
                  <Button
                    variant="secondary"
                    onClick={() => handleImport('OZON')}
                    aria-label="Скачать с OZON"
                  >
                    <Download className="size-4" aria-hidden />
                    Скачать с OZON
                  </Button>
                );
              })()}
            <Button
              variant="primary"
              onClick={() => setAddModalOpen(true)}
              aria-label="Добавить товар"
            >
              <Plus className="size-4" aria-hidden />
              Добавить
            </Button>
            <Button
              variant="ghost"
              onClick={handleClearCatalog}
              aria-label="Очистить каталог"
            >
              <Trash2 className="size-4" aria-hidden />
              Очистить
            </Button>
          </div>
        </div>

        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex flex-col gap-1 flex-1">
              <label
                htmlFor="products-search"
                className="text-sm font-medium text-gray-700"
              >
                Поиск
              </label>
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400 pointer-events-none"
                  aria-hidden
                />
                <input
                  id="products-search"
                  type="search"
                  placeholder="По названию, артикулу, SKU, штрихкоду"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && setPage(1)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 pl-10 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden -mx-6 lg:-mx-8 rounded-none">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Загрузка...</div>
        ) : products.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Товары не найдены. Добавьте товар вручную или скачайте с
            маркетплейса.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left font-medium text-gray-700 min-w-[15rem]">
                    Товар
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">
                    Название
                  </th>
                  {(hasOzon || hasWb) && (
                    <th className="px-4 py-3 text-left font-medium text-gray-700">
                      Цена
                    </th>
                  )}
                  {(hasOzon || hasWb) && (
                    <th className="px-4 py-3 text-left font-medium text-gray-700">
                      Остаток
                    </th>
                  )}
                  <th className="px-4 py-3 text-left font-medium text-gray-700 w-24">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody>
                {products.flatMap((product) =>
                  product.variants.length > 0
                    ? product.variants.map((v) => (
                        <tr
                          key={v.id}
                          className="border-b border-gray-100 hover:bg-gray-50/50"
                        >
                          <td className="px-4 py-3">
                            <div className="flex gap-3 items-start">
                              {v.primaryImage ? (
                                <div className="shrink-0 w-[75px] h-[100px] rounded bg-gray-100 overflow-hidden flex items-center justify-center">
                                  <img
                                    src={v.primaryImage}
                                    alt=""
                                    className="w-[75px] h-[100px] object-contain"
                                  />
                                </div>
                              ) : (
                                <div className="shrink-0 w-[75px] h-[100px] bg-gray-100 rounded flex items-center justify-center">
                                  <Package
                                    className="size-10 text-gray-400"
                                    aria-hidden
                                  />
                                </div>
                              )}
                              <div className="flex flex-col gap-0.5 justify-start text-gray-600 min-w-[9.5rem] [&>div]:whitespace-nowrap [&>div]:flex [&>div]:justify-between [&>div]:gap-2 [&>div]:items-center">
                                <div>
                                  <span>Артикул:</span>
                                  <span className="flex items-center gap-1">
                                    {v.vendorCode}
                                    <CopyArticulButton value={v.vendorCode} />
                                  </span>
                                </div>
                                {hasOzon &&
                                  (v.ozonSku ??
                                    v.ozonProductId ??
                                    v.ozonOfferId) != null && (
                                    <div>
                                      <span className="font-medium text-[#0481CB]">
                                        Ozon:
                                      </span>
                                      <span className="flex items-center gap-1">
                                        {v.ozonSku ??
                                          v.ozonProductId ??
                                          v.ozonOfferId}
                                        <CopyArticulButton
                                          value={String(
                                            v.ozonSku ??
                                              v.ozonProductId ??
                                              v.ozonOfferId
                                          )}
                                        />
                                      </span>
                                    </div>
                                  )}
                                {hasWb && v.wbNmId != null && (
                                  <div>
                                    <span className="font-medium text-[#7D256F]">
                                      WB:
                                    </span>
                                    <span className="flex items-center gap-1">
                                      {v.wbNmId}
                                      <CopyArticulButton
                                        value={String(v.wbNmId)}
                                      />
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-medium text-gray-900">
                                {product.name}
                              </span>
                              {product.nameOzon ? (
                                <span className="text-sm text-gray-500 block">
                                  <span className="font-medium text-[#0481CB]">
                                    Ozon:
                                  </span>{' '}
                                  {(v.ozonSku ?? v.ozonProductId) ? (
                                    <a
                                      href={OZON_PRODUCT_URL(
                                        v.ozonSku ?? v.ozonProductId!
                                      )}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-gray-700 hover:underline"
                                    >
                                      {product.nameOzon}
                                    </a>
                                  ) : (
                                    <span>{product.nameOzon}</span>
                                  )}
                                </span>
                              ) : null}
                              {product.nameWb ? (
                                <span className="text-sm text-gray-500 block">
                                  <span className="font-medium text-[#7D256F]">
                                    WB:
                                  </span>{' '}
                                  {v.wbNmId ? (
                                    <a
                                      href={WB_PRODUCT_URL(String(v.wbNmId))}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-gray-700 hover:underline"
                                    >
                                      {product.nameWb}
                                    </a>
                                  ) : (
                                    <span>{product.nameWb}</span>
                                  )}
                                </span>
                              ) : null}
                            </div>
                          </td>
                          {(hasOzon || hasWb) && (
                            <td className="px-4 py-3 align-top text-gray-600">
                              <div className="flex flex-col gap-0.5 min-w-[5rem] [&>div]:flex [&>div]:justify-between [&>div]:gap-2 [&>div]:items-center">
                                {hasOzon &&
                                  (v.ozonSku ??
                                    v.ozonProductId ??
                                    v.ozonOfferId) != null && (
                                    <div>
                                      <span className="font-medium text-[#0481CB]">
                                        Ozon:
                                      </span>
                                      <EditableValuePopover
                                        title="Цена на Ozon"
                                        subtitle={product.name}
                                        fieldLabel="Цена"
                                        type="price"
                                        value={v.priceOzon ?? v.masterPrice}
                                        productId={product.id}
                                        onSubmit={handleUpdateOzonMarket}
                                      >
                                        {(
                                          v.priceOzon ?? v.masterPrice
                                        ).toLocaleString('ru-RU')}
                                      </EditableValuePopover>
                                    </div>
                                  )}
                                {hasWb && v.wbNmId != null && (
                                  <div>
                                    <span className="font-medium text-[#7D256F]">
                                      WB:
                                    </span>
                                    <EditableValuePopover
                                      title="Цена на WB"
                                      subtitle={product.name}
                                      fieldLabel="Цена"
                                      type="price"
                                      value={v.priceWb ?? v.masterPrice}
                                      productId={product.id}
                                      onSubmit={handleUpdateWbMarket}
                                    >
                                      {(
                                        v.priceWb ?? v.masterPrice
                                      ).toLocaleString('ru-RU')}
                                    </EditableValuePopover>
                                  </div>
                                )}
                              </div>
                            </td>
                          )}
                          {(hasOzon || hasWb) && (
                            <td className="px-4 py-3 align-top text-gray-600">
                              <div className="flex flex-col gap-0.5 min-w-[5rem] [&>div]:flex [&>div]:justify-between [&>div]:gap-2 [&>div]:items-center">
                                {hasOzon &&
                                  (v.ozonSku ??
                                    v.ozonProductId ??
                                    v.ozonOfferId) != null && (
                                    <div>
                                      <span className="font-medium text-[#0481CB]">
                                        Ozon:
                                      </span>
                                      <EditableValuePopover
                                        title="Остаток на Ozon"
                                        subtitle={product.name}
                                        fieldLabel="Доступно к заказу"
                                        type="stock"
                                        value={v.stockOzon ?? v.masterStock}
                                        productId={product.id}
                                        onSubmit={handleUpdateOzonMarket}
                                      >
                                        {v.stockOzon ?? v.masterStock}
                                      </EditableValuePopover>
                                    </div>
                                  )}
                                {hasWb && v.wbNmId != null && (
                                  <div>
                                    <span className="font-medium text-[#7D256F]">
                                      WB:
                                    </span>
                                    <EditableValuePopover
                                      title="Остаток на WB"
                                      subtitle={product.name}
                                      fieldLabel="Доступно к заказу"
                                      type="stock"
                                      value={v.stockWb ?? v.masterStock}
                                      productId={product.id}
                                      onSubmit={handleUpdateWbMarket}
                                    >
                                      {v.stockWb ?? v.masterStock}
                                    </EditableValuePopover>
                                  </div>
                                )}
                              </div>
                            </td>
                          )}
                          <td className="px-4 py-3 align-top">
                            <Link
                              to={`/products/${product.id}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                              aria-label="Редактировать товар"
                            >
                              <Pencil className="size-3.5" aria-hidden />
                              Редактировать
                            </Link>
                          </td>
                        </tr>
                      ))
                    : [
                        <tr
                          key={product.id}
                          className="border-b border-gray-100 hover:bg-gray-50/50"
                        >
                          <td className="px-4 py-3">
                            <div className="flex gap-3 items-start">
                              {product.primaryImage ? (
                                <div className="shrink-0 w-[75px] h-[100px] rounded bg-gray-100 overflow-hidden flex items-center justify-center">
                                  <img
                                    src={product.primaryImage}
                                    alt=""
                                    className="w-[75px] h-[100px] object-contain"
                                  />
                                </div>
                              ) : (
                                <div className="shrink-0 w-[75px] h-[100px] bg-gray-100 rounded flex items-center justify-center">
                                  <Package
                                    className="size-10 text-gray-400"
                                    aria-hidden
                                  />
                                </div>
                              )}
                              <div className="flex flex-col gap-0.5 justify-start text-gray-500 min-w-[9.5rem] [&>div]:whitespace-nowrap [&>div]:flex [&>div]:justify-between [&>div]:gap-2">
                                <div>
                                  <span>Артикул:</span>
                                  <span>—</span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-medium text-gray-900">
                                {product.name}
                              </span>
                              {product.nameOzon ? (
                                <span className="text-sm text-gray-500 block">
                                  <span className="font-medium text-[#0481CB]">
                                    Ozon:
                                  </span>{' '}
                                  {(product.variants[0]?.ozonSku ??
                                  product.variants[0]?.ozonProductId) ? (
                                    <a
                                      href={OZON_PRODUCT_URL(
                                        product.variants[0]!.ozonSku ??
                                          product.variants[0]!.ozonProductId!
                                      )}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-gray-700 hover:underline"
                                    >
                                      {product.nameOzon}
                                    </a>
                                  ) : (
                                    <span>{product.nameOzon}</span>
                                  )}
                                </span>
                              ) : null}
                              {product.nameWb ? (
                                <span className="text-sm text-gray-500 block">
                                  <span className="font-medium text-[#7D256F]">
                                    WB:
                                  </span>{' '}
                                  {product.variants[0]?.wbNmId ? (
                                    <a
                                      href={WB_PRODUCT_URL(
                                        String(product.variants[0].wbNmId)
                                      )}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-gray-700 hover:underline"
                                    >
                                      {product.nameWb}
                                    </a>
                                  ) : (
                                    <span>{product.nameWb}</span>
                                  )}
                                </span>
                              ) : null}
                            </div>
                          </td>
                          {(hasOzon || hasWb) && (
                            <td className="px-4 py-3 align-top text-gray-500">
                              <div className="flex flex-col gap-0.5 min-w-[5rem] [&>div]:flex [&>div]:justify-between [&>div]:gap-2 [&>div]:items-center"></div>
                            </td>
                          )}
                          {(hasOzon || hasWb) && (
                            <td className="px-4 py-3 align-top text-gray-500">
                              <div className="flex flex-col gap-0.5 min-w-[5rem] [&>div]:flex [&>div]:justify-between [&>div]:gap-2 [&>div]:items-center"></div>
                            </td>
                          )}
                          <td className="px-4 py-3 align-top">
                            <Link
                              to={`/products/${product.id}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                              aria-label="Редактировать товар"
                            >
                              <Pencil className="size-3.5" aria-hidden />
                              Редактировать
                            </Link>
                          </td>
                        </tr>,
                      ]
                )}
              </tbody>
            </table>
          </div>
        )}
        {total > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-500">
            <span>
              Показано {(page - 1) * limit + 1}–{Math.min(page * limit, total)}{' '}
              из {total}
            </span>
            {total > limit && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  aria-label="Предыдущая страница"
                >
                  Назад
                </Button>
                <span className="text-gray-600">
                  Страница {page} из {Math.ceil(total / limit)}
                </span>
                <Button
                  variant="ghost"
                  onClick={() =>
                    setPage((p) => Math.min(Math.ceil(total / limit), p + 1))
                  }
                  disabled={page >= Math.ceil(total / limit)}
                  aria-label="Следующая страница"
                >
                  Вперёд
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>

      {addModalOpen && (
        <AddProductModal
          onClose={() => setAddModalOpen(false)}
          onSubmit={handleCreateProduct}
        />
      )}
    </div>
  );
}

/** Модалка добавления товара */
function AddProductModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (name: string, brand?: string) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(name.trim(), brand.trim() || undefined);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      role="dialog"
      aria-modal
      aria-labelledby="add-product-title"
    >
      <Card
        className="w-full max-w-md p-6 m-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="add-product-title"
          className="text-lg font-semibold text-gray-900 mb-4"
        >
          Добавить товар
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="product-name"
            label="Название *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Введите название"
            required
          />
          <Input
            id="product-brand"
            label="Бренд"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="Необязательно"
          />
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" disabled={submitting}>
              Добавить
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
