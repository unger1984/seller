import { create } from 'zustand';
export var useProductsStore = create(function (set) { return ({
    loading: false,
    setLoading: function (v) { return set({ loading: v }); },
}); });
