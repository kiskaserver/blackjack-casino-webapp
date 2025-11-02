import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { createPlayerApi } from '../api/playerApi.js';
import { useTelegram } from '../providers/TelegramProvider.jsx';
import StatisticsModal from '../components/StatisticsModal.jsx';
import SettingsModal from '../components/SettingsModal.jsx';

const playerLinks = [
  { to: '/', label: 'Игра', end: true, icon: '🃏' },
  { to: '/profile', label: 'Профиль', icon: '👤' },
  { to: '/payments', label: 'Финансы', icon: '💳' },
  { to: '/verification', label: 'Верификация', icon: '✅' },
  { to: '/history', label: 'История', icon: '📜' }
];

const defaultBalances = { real: 0, demo: 0 };

const PlayerContext = createContext({
  profile: null,
  balances: defaultBalances,
  updateBalances: () => {},
  refreshProfile: () => Promise.resolve()
});

export const usePlayerContext = () => useContext(PlayerContext);

export const PlayerLayout = () => {
  const { user, initData } = useTelegram();
  const api = useMemo(() => createPlayerApi(() => initData), [initData]);
  const [profile, setProfile] = useState(null);
  const [balances, setBalances] = useState(defaultBalances);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [statsOpen, setStatsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      setProfileError('');
      setLoadingProfile(true);
      const data = await api.getProfile();
      setProfile(data);
      setBalances({
        real: Number(data.player?.balance || 0),
        demo: Number(data.player?.demo_balance || 0)
      });
    } catch (error) {
      setProfileError(error.message || 'Не удалось загрузить данные игрока');
    } finally {
      setLoadingProfile(false);
    }
  }, [api]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const updateBalances = useCallback(nextBalances => {
    if (!nextBalances) return;
    setBalances(prev => ({
      real: Number(nextBalances.real ?? prev.real ?? 0),
      demo: Number(nextBalances.demo ?? prev.demo ?? 0)
    }));
  }, []);

  const contextValue = useMemo(() => ({
    profile,
    balances,
    updateBalances,
    refreshProfile: loadProfile
  }), [profile, balances, updateBalances, loadProfile]);

  const formattedReal = balances.real.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formattedDemo = balances.demo.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <PlayerContext.Provider value={contextValue}>
      <div className="casino-app">
        <div id="particles-js" />
        <header className="game-header">
          <div className="casino-logo">
            <span className="logo-text">🎰 BLACKJACK</span>
            <span className="logo-subtext">CASINO MINI APP</span>
          </div>
          <div className="player-stats">
            <div className="balance">
              <span className="balance-label">💎 Реальный</span>
              <span className="balance-amount">{formattedReal}</span>
            </div>
            <div className="balance">
              <span className="balance-label">🎮 Демо</span>
              <span className="balance-amount">{formattedDemo}</span>
            </div>
            <div className="level">
              <span className="level-label">Игрок</span>
              <span className="level-value">{user?.username ? `@${user.username}` : user?.first_name || 'Guest'}</span>
            </div>
            <div className="controls-group">
              <button className="control-btn" onClick={loadProfile} disabled={loadingProfile} title="Обновить баланс">
                {loadingProfile ? '⏳' : '🔄'}
              </button>
              <button className="control-btn" onClick={() => setStatsOpen(true)} title="Статистика">📊</button>
              <button className="control-btn" onClick={() => setSettingsOpen(true)} title="Настройки">⚙️</button>
            </div>
          </div>
        </header>

        <nav className="player-nav">
          {playerLinks.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              <span className="nav-icon" aria-hidden>{link.icon}</span>
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>

        <main className="player-content">
          {profileError && (
            <div className="message error">
              ⚠️ {profileError}
            </div>
          )}
          <Outlet />
        </main>

        <StatisticsModal open={statsOpen} onClose={() => setStatsOpen(false)} />
        <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </div>
    </PlayerContext.Provider>
  );
};
