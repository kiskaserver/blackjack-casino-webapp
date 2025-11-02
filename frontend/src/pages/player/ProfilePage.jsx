import { useEffect, useMemo, useState } from 'react';
import { createPlayerApi } from '../../api/playerApi.js';
import { useTelegram } from '../../providers/TelegramProvider.jsx';

const ProfilePage = () => {
  const { initData } = useTelegram();
  const api = useMemo(() => createPlayerApi(() => initData), [initData]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [demoTarget, setDemoTarget] = useState('');

  const loadProfile = async () => {
    setError('');
    setLoading(true);
    try {
      const data = await api.getProfile();
      setProfile(data);
    } catch (err) {
      setError(err.message || 'Не удалось загрузить профиль');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleResetDemo = async event => {
    event.preventDefault();
    try {
      await api.resetDemoBalance({ target: demoTarget ? Number(demoTarget) : undefined });
      setDemoTarget('');
      await loadProfile();
    } catch (err) {
      setError(err.message || 'Не удалось сбросить демо баланс');
    }
  };

  if (loading) {
    return <div className="profile-loading">⏳ Загрузка профиля…</div>;
  }

  if (error) {
    return <div className="message error">{error}</div>;
  }

  if (!profile) {
    return <div className="message">ℹ️ Профиль недоступен.</div>;
  }

  const { player, stats, demo } = profile;

  return (
    <div className="profile-page">
      {/* Balances */}
      <div className="balances-grid">
        <div className="card balance-card balance-card-real">
          <div className="balance-label">💎 Реальный баланс</div>
          <div className="balance-value balance-real">{Number(player.balance || 0).toFixed(2)}</div>
        </div>
        <div className="card balance-card balance-card-demo">
          <div className="balance-label">🎮 Демо баланс</div>
          <div className="balance-value balance-demo">{Number(player.demo_balance || 0).toFixed(2)}</div>
        </div>
        <div className="card balance-card balance-card-status">
          <div className="balance-label">✅ Верификация</div>
          <div className="verification-status-badge">
            {player.verification_status === 'verified' ? '✅ Верифицирован' : '⏳ На рассмотрении'}
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="page-section">
        <h2 className="page-section-title">📊 Статистика</h2>
        <div className="stats-cards-grid">
          <div className="card stats-card">
            <h4 className="stats-card-title">💎 Реальные игры</h4>
            <div className="flex-col stats-list">
              <div className="stat-row">
                <span>Всего игр:</span>
                <span className="stat-value">{stats.totalGames}</span>
              </div>
              <div className="stat-row">
                <span>Побед:</span>
                <span className="stat-value stat-win">{stats.wins}</span>
              </div>
              <div className="stat-row">
                <span>Поражений:</span>
                <span className="stat-value stat-loss">{stats.losses}</span>
              </div>
              <div className="stat-row">
                <span>Блэкджеков:</span>
                <span className="stat-value stat-blackjack">{stats.blackjacks}</span>
              </div>
              <div className="stat-row stat-row-divider">
                <span>Net P&L:</span>
                <span className={`stat-value stat-pnl ${Number(stats.netProfit || 0) >= 0 ? 'positive' : 'negative'}`}>
                  {Number(stats.netProfit || 0) >= 0 ? '+' : ''}{Number(stats.netProfit || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="card stats-card">
            <h4 className="stats-card-title">🎮 Демо игры</h4>
            <div className="flex-col stats-list">
              <div className="stat-row">
                <span>Всего игр:</span>
                <span className="stat-value">{stats.wallets?.demo?.totalGames || 0}</span>
              </div>
              <div className="stat-row">
                <span>Побед:</span>
                <span className="stat-value stat-win">{stats.wallets?.demo?.wins || 0}</span>
              </div>
              <div className="stat-row">
                <span>Поражений:</span>
                <span className="stat-value stat-loss">{stats.wallets?.demo?.losses || 0}</span>
              </div>
              <div className="stat-row">
                <span>Блэкджеков:</span>
                <span className="stat-value stat-blackjack">{stats.wallets?.demo?.blackjacks || 0}</span>
              </div>
              <div className="stat-row stat-row-divider">
                <span>Net P&L:</span>
                <span className={`stat-value stat-pnl ${Number(stats.wallets?.demo?.netProfit || 0) >= 0 ? 'positive' : 'negative'}`}>
                  {Number(stats.wallets?.demo?.netProfit || 0) >= 0 ? '+' : ''}{Number(stats.wallets?.demo?.netProfit || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reset Demo Balance */}
      <div className="page-section">
        <h2 className="page-section-title">🔄 Сброс демо баланса</h2>
        <form onSubmit={handleResetDemo} className="form-group">
          <label className="form-label-group">
            <span className="form-label">Целевой баланс (опционально)</span>
            <input
              type="number"
              min="1"
              step="1"
              value={demoTarget}
              onChange={event => setDemoTarget(event.target.value)}
              placeholder={demo?.defaultBalance ?? '10000'}
              className="form-input"
            />
          </label>
          <button 
            type="submit"
            className="payment-btn reset-demo-btn"
          >
            🔄 Сбросить демо баланс
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
