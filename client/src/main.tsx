import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '@xterm/xterm/css/xterm.css';
import './App.css';

/**
 * アプリケーションのエントリーポイント
 * Reactアプリケーションをルートに描画します
 */
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
