import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';

const TelegramContext = createContext({
  initData: '',
  user: null,
  themeParams: {},
  setInitData: () => {},
  reloadWebApp: () => {}
});

const extractTelegramState = rawInitData => {
  if (!rawInitData) {
    return { user: null, themeParams: {}, queryId: null };
  }

  const params = new URLSearchParams(rawInitData);
  const userJson = params.get('user');
  let user = null;
  if (userJson) {
    try {
      user = JSON.parse(userJson);
    } catch (error) {
      console.warn('Failed to parse Telegram user payload', error);
    }
  }

  let themeParams = {};
  const themeJson = params.get('theme_params');
  if (themeJson) {
    try {
      themeParams = JSON.parse(themeJson);
    } catch (error) {
      console.warn('Failed to parse Telegram theme params', error);
    }
  }

  const queryId = params.get('query_id');
  return { user, themeParams, queryId };
};

export const TelegramProvider = ({ children }) => {
  const [initData, setInitDataInternal] = useState(() => {
    const hardcoded = import.meta.env.VITE_TELEGRAM_INIT_DATA;
    if (hardcoded && typeof hardcoded === 'string') {
      return hardcoded.trim();
    }
    return window.Telegram?.WebApp?.initData || '';
  });
  const [themeParams, setThemeParams] = useState(() => extractTelegramState(initData).themeParams);
  const [user, setUser] = useState(() => extractTelegramState(initData).user);

  const setInitData = useCallback(value => {
    setInitDataInternal(value || '');
    const { user: parsedUser, themeParams: parsedTheme } = extractTelegramState(value || '');
    setUser(parsedUser);
    setThemeParams(parsedTheme);
  }, []);

  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    if (!webApp) {
      return;
    }
    try {
      webApp.ready();
    } catch (error) {
      console.warn('Telegram WebApp ready() failed', error);
    }

    const handleThemeChanged = newThemeParams => {
      setThemeParams(prev => ({ ...prev, ...newThemeParams }));
    };

    webApp.onEvent?.('themeChanged', handleThemeChanged);
    setInitData(webApp.initData || initData);

    return () => {
      webApp.offEvent?.('themeChanged', handleThemeChanged);
    };
  }, [initData, setInitData]);

  const reloadWebApp = useCallback(() => {
    const webApp = window.Telegram?.WebApp;
    if (webApp?.close) {
      webApp.close();
    }
  }, []);

  const value = useMemo(() => ({
    initData,
    user,
    themeParams,
    setInitData,
    reloadWebApp
  }), [initData, reloadWebApp, setInitData, themeParams, user]);

  return <TelegramContext.Provider value={value}>{children}</TelegramContext.Provider>;
};

export const useTelegram = () => React.useContext(TelegramContext);
