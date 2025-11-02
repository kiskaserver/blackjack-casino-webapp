import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { createAdminApi } from '../api/adminApi.js';

const STORAGE_KEY = 'blackjack-admin-session';

const readStoredSession = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!parsed?.token || !parsed?.adminId) {
      return null;
    }
    if (parsed.expiresAt && parsed.expiresAt < Date.now()) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch (_error) {
    return null;
  }
};

const persistSession = session => {
  if (!session) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
};

export const AdminContext = createContext({
  session: null,
  login: async () => {},
  logout: async () => {},
  api: null
});

export const AdminProvider = ({ children }) => {
  const [session, setSession] = useState(() => readStoredSession());
  const api = useMemo(() => createAdminApi(() => session?.token || ''), [session?.token]);

  useEffect(() => {
    if (!session?.expiresAt) {
      return;
    }
    const msLeft = session.expiresAt - Date.now();
    if (msLeft <= 0) {
      setSession(null);
      persistSession(null);
      return;
    }
    const timer = window.setTimeout(() => {
      setSession(null);
      persistSession(null);
    }, msLeft);
    return () => window.clearTimeout(timer);
  }, [session?.expiresAt]);

  const login = useCallback(async ({ adminId, secret }) => {
    const result = await createAdminApi(() => '').login({ adminId, secret });
    const expiresAt = result.expiresIn ? Date.now() + result.expiresIn * 1000 : null;
    const nextSession = {
      token: result.token,
      adminId,
      expiresAt
    };
    setSession(nextSession);
    persistSession(nextSession);
    return result;
  }, []);

  const logout = useCallback(async () => {
    try {
      if (session?.token) {
        await api.logout();
      }
    } catch (error) {
      console.warn('Failed to call logout endpoint', error);
    }
    setSession(null);
    persistSession(null);
  }, [api, session?.token]);

  const value = useMemo(() => ({ session, login, logout, api }), [session, login, logout, api]);

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
};

export const useAdmin = () => React.useContext(AdminContext);
