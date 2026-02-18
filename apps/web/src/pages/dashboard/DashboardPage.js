import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useAuthStore } from '@/features/auth/model/authStore';
import { Button } from '@/shared/ui/Button';
/** Главная страница после входа */
export function DashboardPage() {
    var _a;
    var _b = useAuthStore(), user = _b.user, logout = _b.logout;
    return (_jsxs("div", { className: "min-h-screen bg-gray-50 p-8", children: [_jsxs("header", { className: "flex justify-between items-center mb-8", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "Seller" }), _jsxs("div", { className: "flex items-center gap-4", children: [_jsx("span", { className: "text-gray-600", children: user === null || user === void 0 ? void 0 : user.email }), _jsx(Button, { variant: "secondary", onClick: logout, children: "\u0412\u044B\u0439\u0442\u0438" })] })] }), _jsx("main", { children: _jsxs("p", { className: "text-gray-600", children: ["\u0414\u043E\u0431\u0440\u043E \u043F\u043E\u0436\u0430\u043B\u043E\u0432\u0430\u0442\u044C, ", (_a = user === null || user === void 0 ? void 0 : user.name) !== null && _a !== void 0 ? _a : user === null || user === void 0 ? void 0 : user.email, ". \u041F\u0430\u043D\u0435\u043B\u044C \u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u044F \u2014 \u0432 \u0440\u0430\u0437\u0440\u0430\u0431\u043E\u0442\u043A\u0435."] }) })] }));
}
