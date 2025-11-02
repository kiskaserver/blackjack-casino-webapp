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
    return <div className="message" style={{ textAlign: 'center', padding: '2rem' }}>⏳ Загрузка профиля…</div>;
  }

  if (error) {
    return <div className="message error">{error}</div>;
  }

  if (!profile) {
    return <div className="message">ℹ️ Профиль недоступен.</div>;
  }

  const { player, stats, demo } = profile;

  return (
    <div className="flex-col" style={{ gap: '1.5rem' }}>
      {/* Balances */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="card" style={{ borderColor: 'rgba(16, 185, 129, 0.3)' }}>
          <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.5rem', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase' }}>💎 Реальный баланс</div>
          <div style={{ fontSize: '2rem', fontWeight: '800', background: 'linear-gradient(135deg, #10b981, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{Number(player.balance || 0).toFixed(2)}</div>
        </div>
        <div className="card" style={{ borderColor: 'rgba(59, 130, 246, 0.3)' }}>
          <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.5rem', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase' }}>🎮 Демо баланс</div>
          <div style={{ fontSize: '2rem', fontWeight: '800', background: 'linear-gradient(135deg, #3b82f6, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{Number(player.demo_balance || 0).toFixed(2)}</div>
        </div>
        <div className="card" style={{ borderColor: 'rgba(251, 191, 36, 0.3)' }}>
          <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.5rem', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase' }}>✅ Верификация</div>
          <div style={{ fontSize: '1.2rem', fontWeight: '700' }}>{player.verification_status === 'verified' ? '✅ Верифицирован' : '⏳ На рассмотрении'}</div>
        </div>
      </div>

      {/* Statistics */}
      <div className="page-section">
        <h2 className="page-section-title">📊 Статистика</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          <div className="card">
            <h4 style={{ margin: '0 0 0.75rem 0', color: '#60a5fa', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>💎 Реальные игры</h4>
            <div className="flex-col" style={{ gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#cbd5e1' }}>
                <span>Всего игр:</span>
                <span style={{ fontWeight: '700' }}>{stats.totalGames}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#cbd5e1' }}>
                <span>Побед:</span>
                <span style={{ fontWeight: '700', color: '#10b981' }}>{stats.wins}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#cbd5e1' }}>
                <span>Поражений:</span>
                <span style={{ fontWeight: '700', color: '#ef4444' }}>{stats.losses}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#cbd5e1' }}>
                <span>Блэкджеков:</span>
                <span style={{ fontWeight: '700', color: '#fbbf24' }}>{stats.blackjacks}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#cbd5e1', borderTop: '1px solid rgba(59, 130, 246, 0.2)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                <span>Net P&L:</span>
                <span style={{ fontWeight: '700', color: Number(stats.netProfit || 0) >= 0 ? '#10b981' : '#ef4444' }}>{Number(stats.netProfit || 0) >= 0 ? '+' : ''}{Number(stats.netProfit || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h4 style={{ margin: '0 0 0.75rem 0', color: '#60a5fa', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>🎮 Демо игры</h4>
            <div className="flex-col" style={{ gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#cbd5e1' }}>
                <span>Всего игр:</span>
                <span style={{ fontWeight: '700' }}>{stats.wallets?.demo?.totalGames || 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#cbd5e1' }}>
                <span>Побед:</span>
                <span style={{ fontWeight: '700', color: '#10b981' }}>{stats.wallets?.demo?.wins || 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#cbd5e1' }}>
                <span>Поражений:</span>
                <span style={{ fontWeight: '700', color: '#ef4444' }}>{stats.wallets?.demo?.losses || 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#cbd5e1' }}>
                <span>Блэкджеков:</span>
                <span style={{ fontWeight: '700', color: '#fbbf24' }}>{stats.wallets?.demo?.blackjacks || 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#cbd5e1', borderTop: '1px solid rgba(59, 130, 246, 0.2)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                <span>Net P&L:</span>
                <span style={{ fontWeight: '700', color: Number(stats.wallets?.demo?.netProfit || 0) >= 0 ? '#10b981' : '#ef4444' }}>{Number(stats.wallets?.demo?.netProfit || 0) >= 0 ? '+' : ''}{Number(stats.wallets?.demo?.netProfit || 0).toFixed(2)}</span>
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
            className="payment-btn"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', marginTop: '0.5rem' }}
          >
            🔄 Сбросить демо баланс
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
