import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from '@/features/auth/model/authStore';
import { Providers } from './providers';
import { LoginPage } from '@/pages/login/LoginPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
/** Корневой компонент: провайдеры + роутинг */
function AppRoutes() {
    var _a = useAuthStore(), user = _a.user, token = _a.token, hydrated = _a.hydrated, setHydrated = _a.setHydrated;
    useEffect(function () {
        setHydrated();
        var stored = localStorage.getItem('seller_token');
        if (!stored)
            return;
        fetch('/api/auth/me', {
            headers: { Authorization: "Bearer ".concat(stored) },
        })
            .then(function (r) { return (r.ok ? r.json() : null); })
            .then(function (data) {
            if (data === null || data === void 0 ? void 0 : data.user) {
                useAuthStore.getState().setAuth(data.user, stored);
            }
        })
            .catch(function () { return localStorage.removeItem('seller_token'); });
    }, [setHydrated]);
    if (!hydrated) {
        return _jsx("div", { className: "min-h-screen flex items-center justify-center", children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430..." });
    }
    return (_jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(LoginPage, {}) }), _jsx(Route, { path: "/", element: user && token ? _jsx(DashboardPage, {}) : _jsx(Navigate, { to: "/login", replace: true }) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] }));
}
export function App() {
    return (_jsx(Providers, { children: _jsx(AppRoutes, {}) }));
}
