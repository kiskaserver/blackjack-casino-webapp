"use client"

import { useEffect, useMemo, useState } from "react"
import { createPlayerApi } from "../../api/playerApi.js"
import { useTelegram } from "../../providers/TelegramProvider.jsx"

const ProfilePage = () => {
  const { initData } = useTelegram()
  const api = useMemo(() => createPlayerApi(() => initData), [initData])
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [demoTarget, setDemoTarget] = useState("")

  const loadProfile = async () => {
    setError("")
    setLoading(true)
    try {
      const data = await api.getProfile()
      setProfile(data)
    } catch (err) {
      setError(err.message || "Не удалось загрузить профиль")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProfile()
  }, [])

  const handleResetDemo = async (event) => {
    event.preventDefault()
    try {
      await api.resetDemoBalance({ target: demoTarget ? Number(demoTarget) : undefined })
      setDemoTarget("")
      await loadProfile()
    } catch (err) {
      setError(err.message || "Не удалось сбросить демо баланс")
    }
  }

  if (loading) {
    return <div className="text-center py-8 text-slate-400">⏳ Загрузка профиля…</div>
  }

  if (error) {
    return <div className="message error">{error}</div>
  }

  if (!profile) {
    return <div className="message">ℹ️ Профиль недоступен.</div>
  }

  const { player, stats, demo } = profile

  return (
    <div className="space-y-6">
      {/* Balances */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="balance-card balance-card-real">
          <div className="balance-label">💎 Реальный баланс</div>
          <div className="stat-value">{Number(player.balance || 0).toFixed(2)}</div>
        </div>
        <div className="balance-card balance-card-demo">
          <div className="balance-label">🎮 Демо баланс</div>
          <div className="stat-value">{Number(player.demo_balance || 0).toFixed(2)}</div>
        </div>
        <div className="balance-card">
          <div className="balance-label">✅ Верификация</div>
          <div
            className={`inline-flex px-3 py-1 rounded-lg text-sm font-semibold ${
              player.verification_status === "verified"
                ? "bg-green-500/15 text-green-300 border border-green-500/30"
                : "bg-yellow-500/15 text-yellow-300 border border-yellow-500/30"
            }`}
          >
            {player.verification_status === "verified" ? "✅ Верифицирован" : "⏳ На рассмотрении"}
          </div>
        </div>
      </div>

      {/* Statistics */}
      <section>
        <h2 className="text-xl font-bold text-white mb-4">📊 Статистика</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="stat-card">
            <h3 className="stat-title mb-3">💎 Реальные игры</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-300">Всего игр:</span>
                <span className="stat-value text-cyan-400">{stats.totalGames}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Побед:</span>
                <span className="text-green-400 font-bold">{stats.wins}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Поражений:</span>
                <span className="text-red-400 font-bold">{stats.losses}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Блэкджеков:</span>
                <span className="text-yellow-400 font-bold">{stats.blackjacks}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-700">
                <span className="text-slate-300">Net P&L:</span>
                <span className={`font-bold ${Number(stats.netProfit || 0) >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {Number(stats.netProfit || 0) >= 0 ? "+" : ""}
                  {Number(stats.netProfit || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <h3 className="stat-title mb-3">🎮 Демо игры</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-300">Всего игр:</span>
                <span className="stat-value text-cyan-400">{stats.wallets?.demo?.totalGames || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Побед:</span>
                <span className="text-green-400 font-bold">{stats.wallets?.demo?.wins || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Поражений:</span>
                <span className="text-red-400 font-bold">{stats.wallets?.demo?.losses || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Блэкджеков:</span>
                <span className="text-yellow-400 font-bold">{stats.wallets?.demo?.blackjacks || 0}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-700">
                <span className="text-slate-300">Net P&L:</span>
                <span
                  className={`font-bold ${Number(stats.wallets?.demo?.netProfit || 0) >= 0 ? "text-green-400" : "text-red-400"}`}
                >
                  {Number(stats.wallets?.demo?.netProfit || 0) >= 0 ? "+" : ""}
                  {Number(stats.wallets?.demo?.netProfit || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Reset Demo Balance */}
      <section>
        <h2 className="text-xl font-bold text-white mb-4">🔄 Сброс демо баланса</h2>
        <form onSubmit={handleResetDemo} className="card space-y-4 max-w-md">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-200">Целевой баланс (опционально)</label>
            <input
              type="number"
              min="1"
              step="1"
              value={demoTarget}
              onChange={(event) => setDemoTarget(event.target.value)}
              placeholder={demo?.defaultBalance ?? "10000"}
              className="w-full"
            />
          </div>
          <button type="submit" className="secondary w-full">
            🔄 Сбросить демо баланс
          </button>
        </form>
      </section>
    </div>
  )
}

export default ProfilePage
