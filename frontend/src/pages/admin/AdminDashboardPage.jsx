"use client"

import { useEffect, useMemo, useState } from "react"
import { useAdmin } from "../../providers/AdminProvider.jsx"

const formatNumber = (value) => {
  if (value === null || value === undefined) {
    return "—"
  }
  const num = Number(value)
  if (!Number.isFinite(num)) {
    return String(value)
  }
  return num.toLocaleString("ru-RU", { maximumFractionDigits: 2 })
}

const formatPercent = (value) => {
  if (value === null || value === undefined) {
    return "—"
  }
  const num = Number(value)
  if (!Number.isFinite(num)) {
    return "—"
  }
  return `${num.toFixed(2)}%`
}

const MetricCard = ({ title, value, hint }) => (
  <div className="stat-card">
    <h3 className="metric-title">{title}</h3>
    <p className="metric-value">{value}</p>
    {hint && <small className="metric-hint">{hint}</small>}
  </div>
)

const AdminDashboardPage = () => {
  const { api } = useAdmin()
  const [overview, setOverview] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [riskEvents, setRiskEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!api) {
        return
      }
      setLoading(true)
      setError("")
      try {
        const [metrics, recentTxs, recentRisk] = await Promise.all([
          api.getOverview(),
          api.getRecentTransactions(25),
          api.listRiskEvents({ limit: 10 }),
        ])
        if (!cancelled) {
          setOverview(metrics)
          setTransactions(recentTxs || [])
          setRiskEvents(recentRisk || [])
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Не удалось загрузить сводку")
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()
    const interval = window.setInterval(load, 30_000)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [api])

  const txByWallet = useMemo(() => {
    return transactions.reduce((acc, tx) => {
      const key = tx.wallet_type || "real"
      acc[key] = (acc[key] || 0) + Number(tx.amount || 0)
      return acc
    }, {})
  }, [transactions])

  if (loading) {
    return <div className="card text-center text-slate-400">⏳ Загрузка панели…</div>
  }

  if (error) {
    return <div className="alert error">{error}</div>
  }

  if (!overview) {
    return <div className="alert">ℹ️ Сводка недоступна.</div>
  }

  const recentSampleLabel = overview?.fairness?.recent?.sampleSize
    ? `RTP · последние ${overview.fairness.recent.sampleSize.toLocaleString("ru-RU")} рук`
    : "RTP · последние раунды"

  return (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <section className="stats-grid">
        <MetricCard title="Игроки" value={formatNumber(overview.players)} hint="Уникальные Telegram ID" />
        <MetricCard title="Раунды (реал)" value={formatNumber(overview.rounds)} hint="game_rounds с wallet=real" />
        <MetricCard title="Раунды (демо)" value={formatNumber(overview.demo_rounds)} hint="game_rounds с wallet=demo" />
        <MetricCard title="Ставки" value={`${formatNumber(overview.total_bet)} 💎`} hint="Сумма final_bet (реал)" />
        <MetricCard title="Выплаты" value={`${formatNumber(overview.total_paid)} 💎`} hint="Сумма win_amount (реал)" />
        <MetricCard
          title="Депозиты"
          value={`${formatNumber(overview.total_deposit)} 💎`}
          hint="transactions.deposit*"
        />
        <MetricCard
          title="Выводы"
          value={`${formatNumber(overview.total_withdraw)} 💎`}
          hint="transactions.withdraw*"
        />
        {overview.fairness && (
          <>
            <MetricCard
              title="RTP · вся история"
              value={formatPercent(overview.fairness.lifetime?.rtpPercent)}
              hint="Фактический возврат игрокам"
            />
            <MetricCard
              title="House edge"
              value={formatPercent(overview.fairness.lifetime?.houseEdgePercent)}
              hint="Преимущество казино"
            />
            <MetricCard
              title="RTP · 24 часа"
              value={formatPercent(overview.fairness.last24h?.rtpPercent)}
              hint="Последние 24 часа"
            />
            <MetricCard
              title={recentSampleLabel}
              value={formatPercent(overview.fairness.recent?.rtpPercent)}
              hint={`Выборка: ${overview.fairness.recent?.sampleSize?.toLocaleString("ru-RU") || "—"}`}
            />
            <MetricCard
              title="Целевой RTP"
              value={formatPercent(overview.fairness.settings?.transparency?.targetRtpPercent)}
              hint="Из настроек"
            />
          </>
        )}
      </section>

      {/* Transactions Table */}
      <section className="card">
        <h2 className="text-xl font-bold mb-4 text-white">💳 Последние транзакции</h2>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Игрок</th>
                <th>Кошелёк</th>
                <th>Сумма</th>
                <th>Причина</th>
                <th>Время</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="table-cell-empty">
                    Записей нет
                  </td>
                </tr>
              )}
              {transactions.map((tx) => (
                <tr key={tx.id}>
                  <td className="font-mono text-cyan-400">{tx.id}</td>
                  <td>{tx.telegram_id || "—"}</td>
                  <td>
                    <span
                      className={`inline-flex px-2 py-1 rounded text-xs font-semibold ${
                        tx.wallet_type === "real" ? "bg-cyan-500/15 text-cyan-300" : "bg-yellow-500/15 text-yellow-300"
                      }`}
                    >
                      {tx.wallet_type === "real" ? "💎 Реальный" : "🎮 Демо"}
                    </span>
                  </td>
                  <td className={`font-bold ${Number(tx.amount) >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {Number(tx.amount) >= 0 ? "+" : ""}
                    {formatNumber(tx.amount)}
                  </td>
                  <td className="text-slate-400">{tx.reason}</td>
                  <td className="text-slate-500">{new Date(tx.created_at).toLocaleString("ru-RU")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {transactions.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-700/50 text-sm text-slate-400">
            <span className="font-semibold text-slate-300">Итог по кошелькам:</span>{" "}
            {Object.entries(txByWallet).map(([wallet, total]) => (
              <span key={wallet} className="ml-4">
                {wallet === "real" ? "💎 Реальный" : "🎮 Демо"}:{" "}
                <span className={Number(total) >= 0 ? "text-green-400" : "text-red-400"}>{formatNumber(total)}</span>
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Risk Events Table */}
      <section className="card">
        <h2 className="text-xl font-bold mb-4 text-white">⚠️ Риск-события</h2>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Игрок</th>
                <th>Тип события</th>
                <th>Уровень</th>
                <th>Создано</th>
              </tr>
            </thead>
            <tbody>
              {riskEvents.length === 0 && (
                <tr>
                  <td colSpan={5} className="table-cell-empty">
                    Активных событий нет
                  </td>
                </tr>
              )}
              {riskEvents.map((event) => (
                <tr key={event.id}>
                  <td className="font-mono text-cyan-400">{event.id}</td>
                  <td>{event.telegram_id || event.player_id || "—"}</td>
                  <td className="font-medium text-slate-200">{event.event_type}</td>
                  <td>
                    <span
                      className={`inline-flex px-2 py-1 rounded text-xs font-bold ${
                        event.severity === "high"
                          ? "bg-red-500/15 text-red-300"
                          : event.severity === "medium"
                            ? "bg-yellow-500/15 text-yellow-300"
                            : "bg-blue-500/15 text-blue-300"
                      }`}
                    >
                      {event.severity}
                    </span>
                  </td>
                  <td className="text-slate-500">{new Date(event.created_at).toLocaleString("ru-RU")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export default AdminDashboardPage
