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
    return <div className="card">Загрузка профиля…</div>;
  }

  if (error) {
    return <div className="card alert error">{error}</div>;
  }

  if (!profile) {
    return <div className="card alert">Профиль недоступен.</div>;
  }

  const { player, stats, demo } = profile;

  return (
    <div className="flex-col" style={{ gap: '1.5rem' }}>
      <div className="card-grid">
        <div className="card">
          <h3>Общий баланс</h3>
          <p style={{ fontSize: '1.6rem', margin: '0.25rem 0' }}>{Number(player.balance || 0).toFixed(2)} 💎</p>
          <small>Реальный кошелек</small>
        </div>
        <div className="card">
          <h3>Демо баланс</h3>
          <p style={{ fontSize: '1.6rem', margin: '0.25rem 0' }}>{Number(player.demo_balance || 0).toFixed(2)} 💎</p>
          <small>Демо счет</small>
        </div>
        <div className="card">
          <h3>Статус</h3>
          <p style={{ fontSize: '1.2rem', margin: '0.25rem 0' }}>{player.status}</p>
          <small>Верификация: {player.verification_status || 'unverified'}</small>
        </div>
      </div>

      <div className="card">
        <h2>Статистика</h2>
        <div className="flex-row" style={{ gap: '2rem', flexWrap: 'wrap' }}>
          <div>
            <h4>Реальные игры</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li>Игр: {stats.totalGames}</li>
              <li>Побед: {stats.wins}</li>
              <li>Поражений: {stats.losses}</li>
              <li>Блэкджеков: {stats.blackjacks}</li>
              <li>Net P&amp;L: {Number(stats.netProfit || 0).toFixed(2)}</li>
            </ul>
          </div>
          <div>
            <h4>Демо игры</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li>Игр: {stats.wallets?.demo?.totalGames || 0}</li>
              <li>Побед: {stats.wallets?.demo?.wins || 0}</li>
              <li>Поражений: {stats.wallets?.demo?.losses || 0}</li>
              <li>Блэкджеков: {stats.wallets?.demo?.blackjacks || 0}</li>
              <li>Net P&amp;L: {Number(stats.wallets?.demo?.netProfit || 0).toFixed(2)}</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Сброс демо баланса</h2>
        <form onSubmit={handleResetDemo} className="flex-row" style={{ alignItems: 'flex-end', gap: '1rem' }}>
          <label style={{ flex: '1 1 200px' }}>
            Целевой баланс
            <input
              type="number"
              min="1"
              step="1"
              value={demoTarget}
              onChange={event => setDemoTarget(event.target.value)}
              placeholder={demo?.defaultBalance ?? '10000'}
            />
          </label>
          <button className="primary" type="submit">
            Сбросить демо баланс
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
