import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App.jsx';
import { TelegramProvider } from './providers/TelegramProvider.jsx';
import { StatisticsProvider } from './providers/StatisticsProvider.jsx';
import { AdminProvider } from './providers/AdminProvider.jsx';
import { SettingsProvider } from './providers/SettingsProvider.jsx';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <SettingsProvider>
        <TelegramProvider>
          <StatisticsProvider>
            <AdminProvider>
              <App />
            </AdminProvider>
          </StatisticsProvider>
        </TelegramProvider>
      </SettingsProvider>
    </HashRouter>
  </React.StrictMode>
);
