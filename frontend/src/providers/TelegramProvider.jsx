import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { retrieveLaunchParams } from '@twa-dev/sdk';

const TelegramContext = createContext({
  initData: '',
  user: null,
  themeParams: {},
  setInitData: () => {},
  reloadWebApp: () => {}
});

const detectInitData = () => {
  const hardcoded = import.meta.env.VITE_TELEGRAM_INIT_DATA;
  if (hardcoded && typeof hardcoded === 'string' && hardcoded.trim()) {
    return hardcoded.trim();
  }

  if (typeof window !== 'undefined') {
    try {
      const { initDataRaw } = retrieveLaunchParams();
      if (initDataRaw && initDataRaw.trim()) {
        return initDataRaw.trim();
      }
    } catch (error) {
      console.warn('Failed to retrieve Telegram launch params', error);
    }

    const telegramInit = window.Telegram?.WebApp?.initData;
    if (telegramInit && telegramInit.trim()) {
      return telegramInit.trim();
    }

    const searchParams = new URLSearchParams(window.location.search || '');
    const tgWebAppData = searchParams.get('tgWebAppData') || searchParams.get('tgWebAppDataRaw');
    if (tgWebAppData && tgWebAppData.trim()) {
      try {
        return decodeURIComponent(tgWebAppData.trim());
      } catch (_error) {
        return tgWebAppData.trim();
      }
    }
  }

  return '';
};

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
  const [initData, setInitDataInternal] = useState(() => detectInitData());
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
      if (!initData) {
        setInitData(detectInitData());
      }
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
    const resolvedInitData = webApp.initData || initData;
    if (resolvedInitData) {
      setInitData(resolvedInitData);
    } else {
      setInitData(detectInitData());
    }

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
