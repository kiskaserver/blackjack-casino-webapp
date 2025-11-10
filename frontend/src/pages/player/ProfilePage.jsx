"use client"

import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { createPlayerApi } from "../../api/playerApi.js"
import { useTelegram } from "../../providers/TelegramProvider.jsx"
import { usePlayerContext } from "../../layouts/PlayerLayout.jsx"

const ProfilePage = () => {
  const { initData } = useTelegram()
  const api = useMemo(() => (initData ? createPlayerApi(() => initData) : null), [initData])
  const { profile, refreshProfile, loadingProfile, profileError, updateBalances } = usePlayerContext()
  const [demoTarget, setDemoTarget] = useState("")
  const [formError, setFormError] = useState("")
  const [formSuccess, setFormSuccess] = useState("")
  const [formLoading, setFormLoading] = useState(false)

  const handleResetDemo = async (event) => {
    event.preventDefault()
    if (!api) {
      setFormError("Требуется авторизация через Telegram")
      return
    }
    setFormError("")
    setFormSuccess("")
    setFormLoading(true)
    try {
      const payload = await api.resetDemoBalance({ target: demoTarget ? Number(demoTarget) : undefined })
      if (payload?.balances) {
        updateBalances(payload.balances)
      }
      setDemoTarget("")
      await refreshProfile()
      const nextBalance = payload?.balances?.demo ?? payload?.balance
      if (typeof nextBalance !== "undefined") {
        const formatted = Number(nextBalance).toLocaleString("ru-RU", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
        setFormSuccess(`Демо баланс обновлён до ${formatted}`)
      }
    } catch (err) {
      setFormError(err.message || "Не удалось сбросить демо баланс")
    }
    setFormLoading(false)
  }

  if (loadingProfile && !profile) {
    return <div className="text-center py-8 text-slate-400">⏳ Загрузка профиля…</div>
  }

  if (profileError) {
    return <div className="message error">{profileError}</div>
  }

  if (!profile) {
    return <div className="message">ℹ️ Профиль недоступен.</div>
  }

  const { player, stats, demo } = profile
  const verification = profile.verification ?? null
  const verificationRequest = verification?.request ?? null

  const verificationBadge = useMemo(() => {
    if (player.verification_status === "verified") {
      return { tone: "success", text: "Верифицирован", icon: "✅" }
    }
    if (verificationRequest?.status === "rejected") {
      return { tone: "danger", text: "Отклонено", icon: "⚠️" }
    }
    if (verificationRequest) {
      return { tone: "warning", text: "На проверке", icon: "⏳" }
    }
    return { tone: "info", text: "Не отправлено", icon: "📝" }
  }, [player.verification_status, verificationRequest])

  const verificationHint = useMemo(() => {
    if (player.verification_status === "verified") {
      return "Аккаунт подтверждён. При необходимости можно обновить документы на странице верификации."
    }
    if (verificationRequest?.status === "rejected") {
      return verificationRequest.rejection_reason
        ? `Последняя заявка отклонена: ${verificationRequest.rejection_reason}. Подготовьте новые документы и отправьте их повторно.`
        : "Последняя заявка отклонена. Загрузите корректные документы на странице верификации."
    }
    if (verificationRequest) {
      return "Документы отправлены и ожидают проверки. Следите за статусом на странице верификации."
    }
    return "Заявка на верификацию ещё не отправлена. Отправьте документы, чтобы получить доступ к выводам средств."
  }, [player.verification_status, verificationRequest])

  const formatCurrency = (value, withSign = false) => {
    const numeric = Number(value ?? 0)
    if (!Number.isFinite(numeric)) {
      return "0.00"
    }
    const formatted = numeric.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    if (withSign && numeric > 0) {
      return `+${formatted}`
    }
    return formatted
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="page-section">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-lg font-semibold text-white">👤 {player.first_name || player.username || "Игрок"}</h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] uppercase tracking-[0.35em] text-slate-500">
              {player.username && <span>@{player.username}</span>}
              {player.telegram_id && <span>TG ID: {player.telegram_id}</span>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`status-badge ${verificationBadge.tone}`}>
              {verificationBadge.icon} {verificationBadge.text}
            </span>
            <Link to="/verification" className="ghost-button">
              <span role="img" aria-hidden="true">
                🛡️
              </span>
              Верификация
            </Link>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <div className="balance-card balance-card-real">
            <div className="balance-label">💎 Реальный баланс</div>
            <div className="stat-value">{formatCurrency(player.balance)}</div>
          </div>
          <div className="balance-card balance-card-demo">
            <div className="balance-label">🎮 Демо баланс</div>
            <div className="stat-value">{formatCurrency(player.demo_balance)}</div>
          </div>
          <div className="balance-card">
            <div className="balance-label">🎯 Всего игр</div>
            <div className="stat-value text-cyan-400">{stats?.totalGames ?? 0}</div>
          </div>
        </div>

        {verificationHint && <p className="profile-hint">{verificationHint}</p>}
      </section>

      <section className="page-section">
        <h2 className="page-section-title">📊 Статистика</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="stat-card">
            <h3 className="stat-title mb-2">💎 Реальные игры</h3>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-300">Всего игр</span>
                <span className="stat-value text-cyan-400">{stats?.totalGames ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Победы</span>
                <span className="text-green-400 font-bold">{stats?.wins ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Поражения</span>
                <span className="text-red-400 font-bold">{stats?.losses ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Блэкджек</span>
                <span className="text-yellow-400 font-bold">{stats?.blackjacks ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Ничьи</span>
                <span className="text-slate-200 font-semibold">{stats?.pushes ?? 0}</span>
              </div>
              <div className="flex justify-between border-t border-slate-700 pt-2">
                <span className="text-slate-300">Net P&L</span>
                <span
                  className={`font-bold ${Number(stats?.netProfit ?? 0) >= 0 ? "text-green-400" : "text-red-400"}`}
                >
                  {Number(stats?.netProfit ?? 0) >= 0 ? "+" : ""}
                  {formatCurrency(stats?.netProfit, true)}
                </span>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <h3 className="stat-title mb-2">🎮 Демо игры</h3>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-300">Всего игр</span>
                <span className="stat-value text-cyan-400">{stats?.wallets?.demo?.totalGames ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Победы</span>
                <span className="text-green-400 font-bold">{stats?.wallets?.demo?.wins ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Поражения</span>
                <span className="text-red-400 font-bold">{stats?.wallets?.demo?.losses ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Блэкджек</span>
                <span className="text-yellow-400 font-bold">{stats?.wallets?.demo?.blackjacks ?? 0}</span>
              </div>
              <div className="flex justify-between border-t border-slate-700 pt-2">
                <span className="text-slate-300">Net P&L</span>
                <span
                  className={`font-bold ${
                    Number(stats?.wallets?.demo?.netProfit ?? 0) >= 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {Number(stats?.wallets?.demo?.netProfit ?? 0) >= 0 ? "+" : ""}
                  {formatCurrency(stats?.wallets?.demo?.netProfit, true)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="page-section">
        <h2 className="page-section-title">🔄 Сброс демо баланса</h2>
        <p className="text-sm text-slate-400">
          Можно мгновенно обновить демо баланс до нужного значения. Поле можно оставить пустым, чтобы вернуться к
          значению по умолчанию.
        </p>
        <form onSubmit={handleResetDemo} className="flex flex-col gap-3 max-w-md">
          {formError && <div className="message error">{formError}</div>}
          {formSuccess && <div className="message success">{formSuccess}</div>}
          <label className="flex flex-col gap-2 text-sm text-slate-200">
            <span className="font-semibold uppercase tracking-[0.2em] text-slate-300">Целевой баланс (опционально)</span>
            <input
              type="number"
              min="1"
              step="1"
              value={demoTarget}
              onChange={(event) => setDemoTarget(event.target.value)}
              placeholder={demo?.defaultBalance ?? "10000"}
              className="w-full"
            />
          </label>
          <button type="submit" className="secondary w-full" disabled={formLoading}>
            {formLoading ? "⏳ Обновление…" : "🔄 Сбросить демо баланс"}
          </button>
        </form>
      </section>
    </div>
  )
}

export default ProfilePage
