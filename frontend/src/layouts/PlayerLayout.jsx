import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import clsx from 'clsx';
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
      <div className="relative min-h-dvh overflow-hidden bg-night text-slate-100">
        <div
          id="particles-js"
          className="pointer-events-none absolute inset-0 blur-3xl opacity-80"
          style={{
            background:
              'radial-gradient(circle at 12% 22%, rgba(0, 177, 255, 0.18), transparent 58%), radial-gradient(circle at 80% 35%, rgba(12, 63, 255, 0.22), transparent 60%)'
          }}
        />

        <div className="relative z-10 flex min-h-dvh flex-col gap-5 px-4 pb-16 pt-6 sm:px-6 lg:px-10 lg:pt-10">
          <header className="relative overflow-hidden rounded-3xl border border-accent/25 bg-night-secondary p-6 shadow-glow-lg">
            <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-1 text-balance">
                <span className="text-lg font-semibold uppercase tracking-[0.18em] text-white/90">🎰 BLACKJACK</span>
                <span className="text-xs uppercase tracking-[0.35em] text-slate-300">casino mini app</span>
              </div>

              <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-auto lg:min-w-[580px] lg:grid-cols-4">
                <div className="rounded-2xl border border-accent/25 bg-night-elevated p-4 shadow-glow-soft">
                  <p className="text-xs font-medium uppercase tracking-[0.15em] text-slate-300">💎 Реальный</p>
                  <p className="mt-1 text-2xl font-semibold text-accent">{formattedReal}</p>
                </div>
                <div className="rounded-2xl border border-accent/25 bg-night-elevated p-4 shadow-glow-soft">
                  <p className="text-xs font-medium uppercase tracking-[0.15em] text-slate-300">🎮 Демо</p>
                  <p className="mt-1 text-2xl font-semibold text-accent">{formattedDemo}</p>
                </div>
                <div className="rounded-2xl border border-accent/25 bg-night-elevated p-4 shadow-glow-soft">
                  <p className="text-xs font-medium uppercase tracking-[0.15em] text-slate-300">Игрок</p>
                  <p className="mt-1 text-base font-semibold text-sky-200">{user?.username ? `@${user.username}` : user?.first_name || 'Guest'}</p>
                </div>
                <div className="flex items-center justify-end gap-2 rounded-2xl border border-accent/25 bg-night-elevated p-4">
                  <button
                    type="button"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-accent/25 bg-accent-soft text-lg text-accent transition hover:-translate-y-0.5 hover:border-accent hover:bg-accent/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={loadProfile}
                    disabled={loadingProfile}
                    title="Обновить баланс"
                  >
                    {loadingProfile ? '⏳' : '🔄'}
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-accent/25 bg-accent-soft text-lg text-accent transition hover:-translate-y-0.5 hover:border-accent hover:bg-accent/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                    onClick={() => setStatsOpen(true)}
                    title="Статистика"
                  >
                    📊
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-accent/25 bg-accent-soft text-lg text-accent transition hover:-translate-y-0.5 hover:border-accent hover:bg-accent/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                    onClick={() => setSettingsOpen(true)}
                    title="Настройки"
                  >
                    ⚙️
                  </button>
                </div>
              </div>
            </div>

            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,209,255,0.35),transparent_60%),linear-gradient(140deg,transparent_50%,rgba(7,129,255,0.25))] opacity-90" />
          </header>

          <nav className="flex snap-x items-stretch gap-2 overflow-x-auto rounded-3xl border border-accent/20 bg-night-secondary p-1 shadow-glow-soft backdrop-blur">
            {playerLinks.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  clsx(
                    'group flex min-w-[110px] flex-1 snap-center flex-col items-center gap-1 rounded-2xl px-4 py-3 text-sm font-semibold transition',
                    'text-slate-300 hover:-translate-y-0.5 hover:bg-accent-soft hover:text-slate-50',
                    {
                      'bg-[linear-gradient(120deg,#00b0ff,#0d59ff_60%,#00efff)] text-white shadow-glow-lg': isActive
                    }
                  )
                }
              >
                <span className="text-xl" aria-hidden>{link.icon}</span>
                <span>{link.label}</span>
              </NavLink>
            ))}
          </nav>

          <main className="flex flex-1 flex-col gap-4 rounded-3xl border border-accent/20 bg-night-secondary p-6 shadow-glow-soft backdrop-blur">
            {profileError && (
              <div className="flex items-center gap-2 rounded-2xl border border-danger/35 bg-danger/15 px-4 py-3 text-sm font-medium text-danger">
                <span aria-hidden>⚠️</span>
                <span>{profileError}</span>
              </div>
            )}
            <Outlet />
          </main>

          <StatisticsModal open={statsOpen} onClose={() => setStatsOpen(false)} />
          <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        </div>
      </div>
    </PlayerContext.Provider>
  );
};
