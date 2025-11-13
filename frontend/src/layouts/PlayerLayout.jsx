"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { NavLink, Outlet } from "react-router-dom"
import clsx from "clsx"
import { createPlayerApi } from "../api/playerApi.js"
import { useTelegram } from "../providers/TelegramProvider.jsx"
import StatisticsModal from "../components/StatisticsModal.jsx"
import SettingsModal from "../components/SettingsModal.jsx"
import { AdminButton } from "../components/AdminButton.jsx"

const playerLinks = [
  { to: "/", label: "Игра", end: true, icon: "🃏" },
  { to: "/profile", label: "Профиль", icon: "👤" },
  { to: "/payments", label: "Финансы", icon: "💳" },
  { to: "/verification", label: "Верификация", icon: "✅" },
  { to: "/history", label: "История", icon: "📜" },
]

const defaultBalances = { real: 0, demo: 0 }

const PlayerContext = createContext({
  profile: null,
  balances: defaultBalances,
  updateBalances: () => {},
  refreshProfile: () => Promise.resolve(),
  loadingProfile: false,
  profileError: "",
})

export const usePlayerContext = () => useContext(PlayerContext)

export const PlayerLayout = () => {
  const { user, initData } = useTelegram()
  const api = useMemo(() => createPlayerApi(() => initData), [initData])
  const [profile, setProfile] = useState(null)
  const [balances, setBalances] = useState(defaultBalances)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [profileError, setProfileError] = useState("")
  const [statsOpen, setStatsOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const loadProfile = useCallback(async () => {
    try {
      setProfileError("")
      setLoadingProfile(true)
      const data = await api.getProfile()
      setProfile(data)
      setBalances({
        real: Number(data.player?.balance || 0),
        demo: Number(data.player?.demo_balance || 0),
      })
    } catch (error) {
      setProfileError(error.message || "Не удалось загрузить данные игрока")
    } finally {
      setLoadingProfile(false)
    }
  }, [api])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const updateBalances = useCallback((nextBalances) => {
    if (!nextBalances) return
    setBalances((prev) => ({
      real: Number(nextBalances.real ?? prev.real ?? 0),
      demo: Number(nextBalances.demo ?? prev.demo ?? 0),
    }))
  }, [])

  const contextValue = useMemo(
    () => ({
      profile,
      balances,
      updateBalances,
      refreshProfile: loadProfile,
      loadingProfile,
      profileError,
    }),
    [profile, balances, updateBalances, loadProfile, loadingProfile, profileError],
  )

  const formattedReal = balances.real.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const formattedDemo = balances.demo.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const playerChipLabel = useMemo(() => {
    if (user?.username) {
      return `@${user.username}`
    }
    if (user?.id) {
      return `ID ${user.id}`
    }
    if (user?.first_name) {
      return user.first_name
    }
    return "Гость"
  }, [user])

  return (
    <PlayerContext.Provider value={contextValue}>
      <div className="relative min-h-screen overflow-hidden bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50">
        {/* Animated background particles */}
        <div
          className="pointer-events-none absolute inset-0 blur-3xl opacity-40"
          style={{
            background:
              "radial-gradient(circle at 12% 22%, rgba(0, 177, 255, 0.15), transparent 58%), radial-gradient(circle at 80% 35%, rgba(12, 63, 255, 0.15), transparent 60%)",
          }}
        />

        <div className="relative z-10 flex min-h-screen flex-col gap-4 px-3 pb-16 pt-4 sm:px-6 md:px-8 lg:px-10 lg:pb-20 lg:pt-6">
          {/* Header */}
          <header className="card px-4 py-4 sm:px-5 sm:py-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-1">
                <h1 className="text-base font-semibold uppercase tracking-wider text-white/95">🎰 Blackjack</h1>
                <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">casino mini app</p>
              </div>

              <div className="flex w-full flex-col gap-2 lg:w-auto lg:items-end">
                <div className="header-balance-row">
                  <div className="header-balance-pill real" aria-label="Реальный счёт">
                    <span aria-hidden>💎</span>
                    <span className="pill-label">Реальный</span>
                    <span className="pill-value">{formattedReal}</span>
                  </div>
                  <div className="header-balance-pill demo" aria-label="Демо счёт">
                    <span aria-hidden>🎮</span>
                    <span className="pill-label">Демо</span>
                    <span className="pill-value">{formattedDemo}</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <span className="header-player-chip">{playerChipLabel}</span>
                  <div className="header-actions">
                    <AdminButton />
                    <button
                      type="button"
                      className="secondary header-action-button"
                      onClick={loadProfile}
                      disabled={loadingProfile}
                      title="Обновить баланс"
                    >
                      {loadingProfile ? "⏳" : "🔄"}
                    </button>
                    <button
                      type="button"
                      className="secondary header-action-button"
                      onClick={() => setStatsOpen(true)}
                      title="Статистика"
                    >
                      📊
                    </button>
                    <button
                      type="button"
                      className="secondary header-action-button"
                      onClick={() => setSettingsOpen(true)}
                      title="Настройки"
                    >
                      ⚙️
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Navigation */}
          <nav className="flex snap-x items-center gap-2 overflow-x-auto rounded-3xl border border-cyan-500/20 bg-slate-950/70 px-4 py-3 backdrop-blur-sm lg:flex-wrap lg:justify-center lg:gap-3 lg:overflow-visible">
            {playerLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  clsx(
                    "player-nav-link flex shrink-0 flex-col items-center justify-center text-[11px] font-semibold tracking-[0.12em] text-slate-300 transition-all duration-200 hover:text-white",
                    isActive && "player-nav-link-active",
                  )
                }
              >
                <span className="player-nav-icon text-lg leading-none" aria-hidden>
                  {link.icon}
                </span>
                <span className="player-nav-label whitespace-nowrap">{link.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Main Content */}
          <main className="card flex flex-1 flex-col gap-4 p-4 sm:p-5">
            {profileError && (
              <div className="message error flex items-center gap-2">
                <span aria-hidden>⚠️</span>
                <span>{profileError}</span>
              </div>
            )}
            <Outlet />
          </main>

          {/* Modals */}
          <StatisticsModal open={statsOpen} onClose={() => setStatsOpen(false)} />
          <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        </div>
      </div>
    </PlayerContext.Provider>
  )
}
