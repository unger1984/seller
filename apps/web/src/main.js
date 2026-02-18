import { jsx as _jsx } from "react/jsx-runtime";
/** Точка входа React-приложения */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app';
ReactDOM.createRoot(document.getElementById('root')).render(_jsx(React.StrictMode, { children: _jsx(App, {}) }));
