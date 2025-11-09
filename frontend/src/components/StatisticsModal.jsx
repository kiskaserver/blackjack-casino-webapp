"use client"
import { useStatistics } from "../providers/StatisticsProvider.jsx"

const StatRow = ({ label, value, className }) => (
  <div className="stat-row">
    <span className="text-slate-300">{label}</span>
    <span className={`font-bold ${className || "text-cyan-400"}`}>{value}</span>
  </div>
)

const AchievementsList = ({ items }) => (
  <div className="flex flex-col gap-2">
    {items && items.length > 0 ? (
      items
        .slice(-8)
        .reverse()
        .map((a, idx) => (
          <div key={`${a.id || a.title || idx}-${idx}`} className="achievement-item">
            <span className="achievement-title text-cyan-300 font-semibold">{a.title || a.text || "Достижение"}</span>
            {a.description && <span className="achievement-desc text-xs text-slate-400">{a.description}</span>}
            {typeof a.points !== "undefined" && (
              <span className="achievement-points text-green-400 text-sm">+{a.points} очков</span>
            )}
          </div>
        ))
    ) : (
      <div className="text-center text-slate-400 py-4">Пока нет достижений</div>
    )}
  </div>
)

export default function StatisticsModal({ open, onClose }) {
  const { stats } = useStatistics()

  if (!open) return null

  const winRate = stats.totalGames > 0 ? Math.round((stats.wins / stats.totalGames) * 100) : 0
  const netProfit = (stats.totalWinnings || 0) - (stats.totalLosses || 0)
  const timePlayedHours = Math.round(((stats.timePlayedMinutes || 0) / 60) * 10) / 10

  return (
    <>
      <div className="modal open fixed inset-0 z-50 flex items-end" onClick={onClose}>
        <div className="modal-overlay fixed inset-0 bg-black/40 backdrop-blur-sm z-40" />

        <div className="modal-content w-full" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2 className="text-xl font-bold">📊 Статистика</h2>
            <button className="close-btn" onClick={onClose} aria-label="Закрыть">
              ✖
            </button>
          </div>

          <div className="modal-body">
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-title">🎮 Основное</div>
                <StatRow label="Всего игр:" value={stats.totalGames} />
                <StatRow label="Процент побед:" value={`${winRate}%`} className="text-green-400" />
                <StatRow
                  label="Чистая прибыль:"
                  value={`${netProfit >= 0 ? "+" : ""}${netProfit.toFixed(2)} 💎`}
                  className={netProfit >= 0 ? "text-green-400" : "text-red-400"}
                />
              </div>

              <div className="stat-card">
                <div className="stat-title">🏆 Результаты</div>
                <StatRow label="Победы:" value={stats.wins} className="text-green-400" />
                <StatRow label="Поражения:" value={stats.losses} className="text-red-400" />
                <StatRow label="Ничьи:" value={stats.pushes} />
                <StatRow label="Блэкджеки:" value={stats.blackjacks} className="text-yellow-400" />
              </div>

              <div className="stat-card">
                <div className="stat-title">🔥 Серии</div>
                <StatRow
                  label="Текущая серия:"
                  value={`${stats.currentStreak > 0 ? "+" : ""}${stats.currentStreak}`}
                  className={stats.currentStreak > 0 ? "text-green-400" : stats.currentStreak < 0 ? "text-red-400" : ""}
                />
                <StatRow label="Лучшая серия:" value={`+${stats.bestWinStreak}`} className="text-green-400" />
                <StatRow label="Худшая серия:" value={`-${stats.bestLoseStreak}`} className="text-red-400" />
              </div>

              <div className="stat-card">
                <div className="stat-title">💰 Рекорды</div>
                <StatRow
                  label="Крупнейший выигрыш:"
                  value={`+${stats.biggestWin.toFixed(2)} 💎`}
                  className="text-green-400"
                />
                <StatRow
                  label="Крупнейший проигрыш:"
                  value={`-${stats.biggestLoss.toFixed(2)} 💎`}
                  className="text-red-400"
                />
                <StatRow label="Средняя ставка:" value={`${stats.averageBet.toFixed(2)} 💎`} />
              </div>

              <div className="stat-card">
                <div className="stat-title">⏱️ Время</div>
                <StatRow label="Сессий:" value={stats.sessionsPlayed} />
                <StatRow label="Время в игре:" value={`${timePlayedHours.toFixed(1)}ч`} />
              </div>

              {stats.achievements && stats.achievements.length > 0 && (
                <div className="stat-card">
                  <div className="stat-title">🏅 Достижения ({stats.achievements.length})</div>
                  <AchievementsList items={stats.achievements} />
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button className="modal-btn secondary" onClick={onClose}>
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
