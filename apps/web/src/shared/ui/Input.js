var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/** Поле ввода с подписью */
export function Input(_a) {
    var label = _a.label, id = _a.id, _b = _a.className, className = _b === void 0 ? '' : _b, props = __rest(_a, ["label", "id", "className"]);
    var inputId = id !== null && id !== void 0 ? id : "input-".concat(label.replace(/\s/g, '-'));
    return (_jsxs("div", { className: "flex flex-col gap-1", children: [_jsx("label", { htmlFor: inputId, className: "text-sm font-medium text-gray-700", children: label }), _jsx("input", __assign({ id: inputId, className: "border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ".concat(className).trim() }, props))] }));
}
