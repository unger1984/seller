import { create } from 'zustand';
var TOKEN_KEY = 'seller_token';
export var useAuthStore = create(function (set) { return ({
    user: null,
    token: null,
    hydrated: false,
    setAuth: function (user, token) {
        localStorage.setItem(TOKEN_KEY, token);
        set({ user: user, token: token });
    },
    logout: function () {
        localStorage.removeItem(TOKEN_KEY);
        set({ user: null, token: null });
    },
    setHydrated: function () { return set({ hydrated: true }); },
}); });
