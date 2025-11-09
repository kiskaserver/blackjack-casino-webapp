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
    return <div className="text-center py-8">⏳ Загрузка профиля…</div>;
  }

  if (error) {
    return <div className="message error">{error}</div>;
  }

  if (!profile) {
    return <div className="message">ℹ️ Профиль недоступен.</div>;
  }

  const { player, stats, demo } = profile;

  return (
    <div className="space-y-6">
      {/* Balances */}
      <div className="balances-grid">
        <div className="balance-card balance-card-real">
          <div className="balance-label">💎 Реальный баланс</div>
          <div className="stat-value">{Number(player.balance || 0).toFixed(2)}</div>
        </div>
        <div className="balance-card balance-card-demo">
          <div className="balance-label">🎮 Демо баланс</div>
          <div className="stat-value">{Number(player.demo_balance || 0).toFixed(2)}</div>
        </div>
        <div className="balance-card balance-card-status">
          <div className="balance-label">✅ Верификация</div>
          <div className={`badge ${player.verification_status === 'verified' ? 'badge-success' : 'badge-warning'}`}>
            {player.verification_status === 'verified' ? '✅ Верифицирован' : '⏳ На рассмотрении'}
          </div>
        </div>
      </div>

      {/* Statistics */}
      <section>
        <h2 className="page-section-title">📊 Статистика</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <h4 className="stats-card-title">💎 Реальные игры</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Всего игр:</span>
                <span className="stat-value">{stats.totalGames}</span>
              </div>
              <div className="flex justify-between">
                <span>Побед:</span>
                <span className="stat-value text-green-400">{stats.wins}</span>
              </div>
              <div className="flex justify-between">
                <span>Поражений:</span>
                <span className="stat-value text-red-400">{stats.losses}</span>
              </div>
              <div className="flex justify-between">
                <span>Блэкджеков:</span>
                <span className="stat-value text-yellow-400">{stats.blackjacks}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-700">
                <span>Net P&L:</span>
                <span className={`stat-value ${Number(stats.netProfit || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {Number(stats.netProfit || 0) >= 0 ? '+' : ''}{Number(stats.netProfit || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <h4 className="stats-card-title">🎮 Демо игры</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Всего игр:</span>
                <span className="stat-value">{stats.wallets?.demo?.totalGames || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Побед:</span>
                <span className="stat-value text-green-400">{stats.wallets?.demo?.wins || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Поражений:</span>
                <span className="stat-value text-red-400">{stats.wallets?.demo?.losses || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Блэкджеков:</span>
                <span className="stat-value text-yellow-400">{stats.wallets?.demo?.blackjacks || 0}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-700">
                <span>Net P&L:</span>
                <span className={`stat-value ${Number(stats.wallets?.demo?.netProfit || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {Number(stats.wallets?.demo?.netProfit || 0) >= 0 ? '+' : ''}{Number(stats.wallets?.demo?.netProfit || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Reset Demo Balance */}
      <section>
        <h2 className="page-section-title">🔄 Сброс демо баланса</h2>
        <form onSubmit={handleResetDemo} className="space-y-4">
          <div className="input-group">
            <label className="input-label">Целевой баланс (опционально)</label>
            <input
              type="number"
              min="1"
              step="1"
              value={demoTarget}
              onChange={event => setDemoTarget(event.target.value)}
              placeholder={demo?.defaultBalance ?? '10000'}
            />
          </div>
          <button 
            type="submit"
            className="secondary"
          >
            🔄 Сбросить демо баланс
          </button>
        </form>
      </section>
    </div>
  );
};

export default ProfilePage;
