import { useEffect, useMemo, useState } from 'react';
import { createPlayerApi } from '../../api/playerApi.js';
import { useTelegram } from '../../providers/TelegramProvider.jsx';

const HistoryPage = () => {
  const { initData } = useTelegram();
  const api = useMemo(() => createPlayerApi(() => initData), [initData]);
  const [history, setHistory] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await api.getHistory({ rounds: 25, transactions: 50 });
        if (!cancelled) {
          setHistory(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Не удалось загрузить историю');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [api]);

  if (loading) {
    return <div className="stats-loading">⏳ Загрузка истории…</div>;
  }

  if (error) {
    return <div className="message stats-error">{error}</div>;
  }

  if (!history) {
    return <div className="message">ℹ️ История недоступна.</div>;
  }

  const stats = history.stats;
  const rounds = history.rounds || [];
  const transactions = history.transactions || [];

  return (
    <div className="history-container">
      {stats && (
        <div className="page-section">
          <h2 className="page-section-title">📊 Сводка</h2>
          <div className="stats-grid">
            <div className="stats-card">
              <h3 className="stats-card-title">💎 Реальный кошелёк</h3>
              <div className="stats-card-content">
                <div className="stat-row">
                  <span className="stat-label">Всего игр:</span>
                  <span className="stat-value">{stats.totalGames}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Победы:</span>
                  <span className="stat-value positive">{stats.wins}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Поражения:</span>
                  <span className="stat-value negative">{stats.losses}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Блэкджеков:</span>
                  <span className="stat-value warning">{stats.blackjacks}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Ничьи:</span>
                  <span className="stat-value">{stats.pushes}</span>
                </div>
                <div className="stat-row stat-divider">
                  <span className="stat-label">Net P&L:</span>
                  <span className={`stat-value ${Number(stats.netProfit || 0) >= 0 ? 'positive' : 'negative'}`}>
                    {Number(stats.netProfit || 0) >= 0 ? '+' : ''}{Number(stats.netProfit || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
            <div className="stats-card">
              <h3 className="stats-card-title">🎮 Демо кошелёк</h3>
              <div className="stats-card-content">
                <div className="stat-row">
                  <span className="stat-label">Всего игр:</span>
                  <span className="stat-value">{stats.wallets?.demo?.totalGames || 0}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Победы:</span>
                  <span className="stat-value positive">{stats.wallets?.demo?.wins || 0}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Поражения:</span>
                  <span className="stat-value negative">{stats.wallets?.demo?.losses || 0}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Блэкджеков:</span>
                  <span className="stat-value warning">{stats.wallets?.demo?.blackjacks || 0}</span>
                </div>
                <div className="stat-row stat-divider">
                  <span className="stat-label">Net P&L:</span>
                  <span className={`stat-value ${Number(stats.wallets?.demo?.netProfit || 0) >= 0 ? 'positive' : 'negative'}`}>
                    {Number(stats.wallets?.demo?.netProfit || 0) >= 0 ? '+' : ''}{Number(stats.wallets?.demo?.netProfit || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="table-wrapper">
        <h2 className="table-heading page-section-title">🎲 Последние раунды</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Кошелёк</th>
              <th className="table-cell-right">Ставка</th>
              <th className="table-cell-right">Выигрыш</th>
              <th>Результат</th>
              <th>Состояние</th>
              <th>Завершено</th>
            </tr>
          </thead>
          <tbody>
            {rounds.length === 0 && (
              <tr>
                <td colSpan={7} className="table-cell-empty">ℹ️ Раундов пока нет</td>
              </tr>
            )}
            {rounds.map(round => (
              <tr key={round.round_id}>
                <td className="table-cell-emoji">{round.round_id}</td>
                <td>{round.wallet_type === 'real' ? '💎' : '🎮'} {round.wallet_type}</td>
                <td className="table-cell-right font-weight-600">{Number(round.final_bet || round.base_bet || 0).toFixed(2)}</td>
                <td className={`table-cell-right ${Number(round.win_amount || 0) > 0 ? 'table-cell-positive' : 'table-cell-negative'}`}>{Number(round.win_amount || 0).toFixed(2)}</td>
                <td>
                  {round.result === 'win' && '✅'}
                  {round.result === 'lose' && '❌'}
                  {round.result === 'push' && '🤝'}
                  {round.result === 'blackjack' && '🎉'}
                  {round.result === 'bust' && '💥'} {round.result || '—'}
                </td>
                <td>{round.status}</td>
                <td>{round.settled_at ? new Date(round.settled_at).toLocaleString('ru-RU') : (round.created_at ? new Date(round.created_at).toLocaleString('ru-RU') : '—')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-wrapper">
        <h2 className="table-heading page-section-title">💸 Движение средств</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Кошелёк</th>
              <th className="table-cell-right">Сумма</th>
              <th>Причина</th>
              <th>Время</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 && (
              <tr>
                <td colSpan={5} className="table-cell-empty">ℹ️ Транзакций пока нет</td>
              </tr>
            )}
            {transactions.map(tx => (
              <tr key={tx.id}>
                <td>{tx.id}</td>
                <td>{tx.wallet_type === 'real' ? '💎' : '🎮'} {tx.wallet_type}</td>
                <td className={`table-cell-right ${Number(tx.amount) >= 0 ? 'table-cell-positive' : 'table-cell-negative'}`}>{Number(tx.amount >= 0 ? '+' : '')}{Number(tx.amount || 0).toFixed(2)}</td>
                <td>{tx.reason}</td>
                <td>{tx.created_at ? new Date(tx.created_at).toLocaleString('ru-RU') : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HistoryPage;
