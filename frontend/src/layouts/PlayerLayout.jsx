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
    }),
    [profile, balances, updateBalances, loadProfile],
  )

  const formattedReal = balances.real.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const formattedDemo = balances.demo.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

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

              {/* Balance Cards Grid */}
              <div className="grid w-full gap-2 sm:grid-cols-2 lg:w-auto lg:min-w-full lg:grid-cols-4">
                <div className="balance-card balance-card-real">
                  <p className="balance-label">💎 Реальный</p>
                  <p className="mt-1 text-xl font-bold sm:text-2xl text-cyan-400">{formattedReal}</p>
                </div>
                <div className="balance-card balance-card-demo">
                  <p className="balance-label">🎮 Демо</p>
                  <p className="mt-1 text-xl font-bold sm:text-2xl text-yellow-400">{formattedDemo}</p>
                </div>
                <div className="balance-card">
                  <p className="balance-label">Игрок</p>
                  <p className="mt-1 text-sm font-semibold sm:text-base text-sky-200">
                    {user?.username ? `@${user.username}` : user?.first_name || "Гость"}
                  </p>
                </div>
                <div className="balance-card balance-card-toolbar">
                  <AdminButton />
                  <button
                    type="button"
                    className="secondary h-11 w-11 rounded-xl p-0 text-lg"
                    onClick={loadProfile}
                    disabled={loadingProfile}
                    title="Обновить баланс"
                  >
                    {loadingProfile ? "⏳" : "🔄"}
                  </button>
                  <button
                    type="button"
                    className="secondary h-11 w-11 rounded-xl p-0 text-lg"
                    onClick={() => setStatsOpen(true)}
                    title="Статистика"
                  >
                    📊
                  </button>
                  <button
                    type="button"
                    className="secondary h-11 w-11 rounded-xl p-0 text-lg"
                    onClick={() => setSettingsOpen(true)}
                    title="Настройки"
                  >
                    ⚙️
                  </button>
                </div>
              </div>
            </div>
          </header>

          {/* Navigation */}
          <nav className="flex snap-x items-stretch gap-1.5 overflow-x-auto rounded-2xl border border-cyan-500/15 bg-slate-950/70 p-1 backdrop-blur-sm">
            {playerLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  clsx(
                    "flex min-w-[72px] flex-col items-center gap-0.5 rounded-lg border border-transparent px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 transition-all duration-200 hover:bg-cyan-500/10 hover:text-white",
                    isActive &&
                      "border-cyan-400/40 bg-cyan-500/20 text-white shadow-[0_6px_16px_rgba(0,198,255,0.18)]",
                  )
                }
              >
                <span className="text-lg" aria-hidden>
                  {link.icon}
                </span>
                <span>{link.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Main Content */}
          <main className="card flex flex-1 flex-col gap-4 p-4 sm:p-6">
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
