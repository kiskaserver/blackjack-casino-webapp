import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App.jsx';
import { TelegramProvider } from './providers/TelegramProvider.jsx';
import { AdminProvider } from './providers/AdminProvider.jsx';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <TelegramProvider>
        <AdminProvider>
          <App />
        </AdminProvider>
      </TelegramProvider>
    </HashRouter>
  </React.StrictMode>
);
