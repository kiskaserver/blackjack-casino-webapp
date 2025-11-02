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
    return <div className="card">Загрузка истории…</div>;
  }

  if (error) {
    return <div className="card alert error">{error}</div>;
  }

  if (!history) {
    return <div className="card alert">История недоступна.</div>;
  }

  const stats = history.stats;
  const rounds = history.rounds || [];
  const transactions = history.transactions || [];

  return (
    <div className="flex-col" style={{ gap: '1.5rem' }}>
      {stats && (
        <div className="card">
          <h2>Сводка</h2>
          <div className="flex-row" style={{ gap: '2rem', flexWrap: 'wrap' }}>
            <section>
              <h3>Реальный кошелёк</h3>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                <li>Всего игр: {stats.totalGames}</li>
                <li>Победы: {stats.wins}</li>
                <li>Поражения: {stats.losses}</li>
                <li>Блэкджеков: {stats.blackjacks}</li>
                <li>Ничьи: {stats.pushes}</li>
                <li>Net P&amp;L: {Number(stats.netProfit || 0).toFixed(2)}</li>
              </ul>
            </section>
            <section>
              <h3>Демо кошелёк</h3>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                <li>Всего игр: {stats.wallets?.demo?.totalGames || 0}</li>
                <li>Победы: {stats.wallets?.demo?.wins || 0}</li>
                <li>Поражения: {stats.wallets?.demo?.losses || 0}</li>
                <li>Блэкджеков: {stats.wallets?.demo?.blackjacks || 0}</li>
                <li>Net P&amp;L: {Number(stats.wallets?.demo?.netProfit || 0).toFixed(2)}</li>
              </ul>
            </section>
          </div>
        </div>
      )}

      <div className="card">
        <h2>Последние раунды</h2>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Кошелёк</th>
                <th>Ставка</th>
                <th>Выигрыш</th>
                <th>Результат</th>
                <th>Состояние</th>
                <th>Завершено</th>
              </tr>
            </thead>
            <tbody>
              {rounds.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', opacity: 0.7 }}>Раундов пока нет</td>
                </tr>
              )}
              {rounds.map(round => (
                <tr key={round.round_id}>
                  <td>{round.round_id}</td>
                  <td>{round.wallet_type}</td>
                  <td>{Number(round.final_bet || round.base_bet || 0).toFixed(2)}</td>
                  <td>{Number(round.win_amount || 0).toFixed(2)}</td>
                  <td>{round.result || '—'}</td>
                  <td>{round.status}</td>
                  <td>{round.settled_at ? new Date(round.settled_at).toLocaleString() : (round.created_at ? new Date(round.created_at).toLocaleString() : '—')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2>Движение средств</h2>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Кошелёк</th>
                <th>Сумма</th>
                <th>Причина</th>
                <th>Время</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', opacity: 0.7 }}>Транзакций пока нет</td>
                </tr>
              )}
              {transactions.map(tx => (
                <tr key={tx.id}>
                  <td>{tx.id}</td>
                  <td>{tx.wallet_type}</td>
                  <td style={{ color: Number(tx.amount) >= 0 ? '#34d399' : '#f87171' }}>{Number(tx.amount || 0).toFixed(2)}</td>
                  <td>{tx.reason}</td>
                  <td>{tx.created_at ? new Date(tx.created_at).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default HistoryPage;
