import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { soundManager } from '../utils/sound.js';

const STORE_KEY = 'ui_settings_v1';

const defaultSettings = {
  soundEnabled: true,
  volume: 0.3, // 0..1
  hapticsEnabled: true
};

const SettingsContext = createContext({
  settings: defaultSettings,
  setSoundEnabled: (_v) => {},
  setVolume: (_v) => {},
  setHapticsEnabled: (_v) => {}
});

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(STORE_KEY);
      if (saved) return { ...defaultSettings, ...JSON.parse(saved) };
    } catch {}
    return { ...defaultSettings };
  });

  // persist
  useEffect(() => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(settings)); } catch {}
  }, [settings]);

  // apply sound engine
  useEffect(() => {
    soundManager.setEnabled(settings.soundEnabled);
    soundManager.setVolume(settings.volume);
  }, [settings.soundEnabled, settings.volume]);

  const setSoundEnabled = useCallback((v) => setSettings(s => ({ ...s, soundEnabled: !!v })), []);
  const setVolume = useCallback((v) => setSettings(s => ({ ...s, volume: Math.max(0, Math.min(1, Number(v) || 0)) })), []);
  const setHapticsEnabled = useCallback((v) => setSettings(s => ({ ...s, hapticsEnabled: !!v })), []);

  const value = useMemo(() => ({ settings, setSoundEnabled, setVolume, setHapticsEnabled }), [settings, setSoundEnabled, setVolume, setHapticsEnabled]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};
