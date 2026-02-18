import { jsx as _jsx } from "react/jsx-runtime";
import { BrowserRouter } from 'react-router-dom';
/** Обёртка провайдеров: router, zustand (если будут обёртки) */
export function Providers(_a) {
    var children = _a.children;
    return _jsx(BrowserRouter, { children: children });
}
