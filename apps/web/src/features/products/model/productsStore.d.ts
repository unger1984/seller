/** Store списка товаров — placeholder, реализация при Product модуле */
interface ProductsState {
  loading: boolean;
  setLoading: (v: boolean) => void;
}
export declare const useProductsStore: import('zustand').UseBoundStore<
  import('zustand').StoreApi<ProductsState>
>;
export {};
//# sourceMappingURL=productsStore.d.ts.map
