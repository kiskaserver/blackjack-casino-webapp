import React from 'react';
import { useStatistics } from '../providers/StatisticsProvider.jsx';

const StatRow = ({ label, value, className }) => (
  <div className="stat-row">
    <span>{label}</span>
    <span className={className}>{value}</span>
  </div>
);

const AchievementsList = ({ items }) => (
  <div className="achievements-list">
    {items && items.length > 0 ? (
      items.slice(-8).reverse().map((a, idx) => (
        <div key={`${a.id || a.title || idx}-${idx}`} className="achievement-item">
          <span className="achievement-title">{a.title || a.text || 'Достижение'}</span>
          {a.description && <span className="achievement-desc">{a.description}</span>}
          {typeof a.points !== 'undefined' && (
            <span className="achievement-points">+{a.points} очков</span>
          )}
        </div>
      ))
    ) : (
      <div className="no-achievements">Пока нет достижений</div>
    )}
  </div>
);

export default function StatisticsModal({ open, onClose }) {
  const { stats } = useStatistics();

  if (!open) return null;

  const winRate = stats.totalGames > 0 ? Math.round((stats.wins / stats.totalGames) * 100) : 0;
  const netProfit = (stats.totalWinnings || 0) - (stats.totalLosses || 0);
  const timePlayedHours = Math.round((stats.timePlayedMinutes || 0) / 60 * 10) / 10;

  return (
    <div className="modal open" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>📊 Статистика</h3>
          <button className="close-btn" onClick={onClose} aria-label="Закрыть">✖</button>
        </div>

        <div className="modal-body">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-title">🎮 Основное</div>
              <StatRow label="Всего игр:" value={stats.totalGames} />
              <StatRow label="Процент побед:" value={`${winRate}%`} className="win-rate" />
              <StatRow label="Чистая прибыль:" value={`${netProfit >= 0 ? '+' : ''}${netProfit.toFixed(2)} 💎`} className={netProfit >= 0 ? 'profit-positive' : 'profit-negative'} />
            </div>

            <div className="stat-card">
              <div className="stat-title">🏆 Результаты</div>
              <StatRow label="Победы:" value={stats.wins} className="win-rate" />
              <StatRow label="Поражения:" value={stats.losses} className="profit-negative" />
              <StatRow label="Ничьи:" value={stats.pushes} />
              <StatRow label="Блэкджеки:" value={stats.blackjacks} />
            </div>

            <div className="stat-card">
              <div className="stat-title">🔥 Серии</div>
              <StatRow label="Текущая серия:" value={`${stats.currentStreak > 0 ? '+' : ''}${stats.currentStreak}`} className={stats.currentStreak > 0 ? 'win-rate' : stats.currentStreak < 0 ? 'profit-negative' : ''} />
              <StatRow label="Лучшая серия побед:" value={`+${stats.bestWinStreak}`} className="win-rate" />
              <StatRow label="Худшая серия поражений:" value={`-${stats.bestLoseStreak}`} className="profit-negative" />
            </div>

            <div className="stat-card">
              <div className="stat-title">💰 Рекорды</div>
              <StatRow label="Крупнейший выигрыш:" value={`+${stats.biggestWin.toFixed(2)} 💎`} className="win-rate" />
              <StatRow label="Крупнейший проигрыш:" value={`-${stats.biggestLoss.toFixed(2)} 💎`} className="profit-negative" />
              <StatRow label="Средняя ставка:" value={`${stats.averageBet.toFixed(2)} 💎`} />
            </div>

            <div className="stat-card">
              <div className="stat-title">⏱️ Время</div>
              <StatRow label="Сессий сыграно:" value={stats.sessionsPlayed} />
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
          <button className="modal-btn secondary" onClick={onClose}>Закрыть</button>
        </div>
      </div>
    </div>
  );
}
