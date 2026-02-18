var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../model/authStore';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
/** Форма входа — email + пароль */
export function LoginForm(_a) {
    var _this = this;
    var onSuccess = _a.onSuccess;
    var navigate = useNavigate();
    var _b = useState(''), email = _b[0], setEmail = _b[1];
    var _c = useState(''), password = _c[0], setPassword = _c[1];
    var _d = useState(null), error = _d[0], setError = _d[1];
    var _e = useState(false), loading = _e[0], setLoading = _e[1];
    var setAuth = useAuthStore(function (s) { return s.setAuth; });
    var handleSuccess = function () {
        var _a;
        (_a = onSuccess === null || onSuccess === void 0 ? void 0 : onSuccess()) !== null && _a !== void 0 ? _a : navigate('/', { replace: true });
    };
    var handleSubmit = function (e) { return __awaiter(_this, void 0, void 0, function () {
        var data, res, body, json, err_1;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    e.preventDefault();
                    setError(null);
                    data = { email: email, password: password };
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 6, 7, 8]);
                    setLoading(true);
                    return [4 /*yield*/, fetch('/api/auth/login', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(data),
                        })];
                case 2:
                    res = _b.sent();
                    if (!!res.ok) return [3 /*break*/, 4];
                    return [4 /*yield*/, res.json().catch(function () { return ({}); })];
                case 3:
                    body = _b.sent();
                    throw new Error((_a = body.message) !== null && _a !== void 0 ? _a : 'Ошибка входа');
                case 4: return [4 /*yield*/, res.json()];
                case 5:
                    json = (_b.sent());
                    setAuth(json.user, json.token);
                    handleSuccess();
                    return [3 /*break*/, 8];
                case 6:
                    err_1 = _b.sent();
                    setError(err_1 instanceof Error ? err_1.message : 'Неизвестная ошибка');
                    return [3 /*break*/, 8];
                case 7:
                    setLoading(false);
                    return [7 /*endfinally*/];
                case 8: return [2 /*return*/];
            }
        });
    }); };
    return (_jsxs("form", { onSubmit: handleSubmit, className: "flex flex-col gap-4 max-w-sm", children: [_jsx(Input, { type: "email", label: "Email", value: email, onChange: function (e) { return setEmail(e.target.value); }, required: true, autoComplete: "email" }), _jsx(Input, { type: "password", label: "\u041F\u0430\u0440\u043E\u043B\u044C", value: password, onChange: function (e) { return setPassword(e.target.value); }, required: true, autoComplete: "current-password" }), error && _jsx("p", { className: "text-red-600 text-sm", children: error }), _jsx(Button, { type: "submit", disabled: loading, children: loading ? 'Вход...' : 'Войти' })] }));
}
