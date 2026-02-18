import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function ProductCard(_a) {
    var name = _a.name, brand = _a.brand;
    return (_jsxs("div", { className: "rounded-lg border border-gray-200 p-4 hover:border-gray-300", children: [_jsx("h3", { className: "font-medium", children: name }), brand && _jsx("p", { className: "text-sm text-gray-500", children: brand })] }));
}
