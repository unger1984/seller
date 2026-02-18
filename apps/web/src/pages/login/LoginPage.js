import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { LoginForm } from '@/features/auth/ui/LoginForm';
/** Страница входа */
export function LoginPage() {
    return (_jsx("div", { className: "min-h-screen flex items-center justify-center bg-gray-50", children: _jsxs("div", { className: "bg-white p-8 rounded-lg shadow-sm", children: [_jsx("h1", { className: "text-xl font-semibold mb-6", children: "Seller \u2014 \u0412\u0445\u043E\u0434" }), _jsx(LoginForm, {})] }) }));
}
