import { create } from 'zustand';

/** Store списка товаров — placeholder, реализация при Product модуле */
interface ProductsState {
  loading: boolean;
  setLoading: (v: boolean) => void;
}

export const useProductsStore = create<ProductsState>((set) => ({
  loading: false,
  setLoading: (v) => set({ loading: v }),
}));
