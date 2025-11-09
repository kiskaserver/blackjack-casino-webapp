import { useEffect, useMemo, useState } from 'react';
import { createPlayerApi } from '../../api/playerApi.js';
import { useTelegram } from '../../providers/TelegramProvider.jsx';

const pageSizeOptions = [10, 25, 50];

const HistoryPage = () => {
  const { initData } = useTelegram();
  const api = useMemo(() => createPlayerApi(() => initData), [initData]);
  const [history, setHistory] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [roundFilter, setRoundFilter] = useState('all');
  const [roundPage, setRoundPage] = useState(1);
  const [roundPageSize, setRoundPageSize] = useState(pageSizeOptions[0]);
  const [transactionFilter, setTransactionFilter] = useState('all');
  const [transactionPage, setTransactionPage] = useState(1);
  const [transactionPageSize, setTransactionPageSize] = useState(pageSizeOptions[0]);

  useEffect(() => {
    if (!initData) {
      return;
    }
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await api.getHistory({ rounds: 200, transactions: 200 });
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
  }, [api, initData]);

  useEffect(() => {
    setRoundPage(1);
  }, [roundFilter, roundPageSize]);

  useEffect(() => {
    setTransactionPage(1);
  }, [transactionFilter, transactionPageSize]);

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

  const filteredRounds = useMemo(() => {
    if (roundFilter === 'all') {
      return rounds;
    }
    return rounds.filter(round => round.wallet_type === roundFilter);
  }, [rounds, roundFilter]);

  const filteredTransactions = useMemo(() => {
    if (transactionFilter === 'all') {
      return transactions;
    }
    return transactions.filter(tx => tx.wallet_type === transactionFilter);
  }, [transactions, transactionFilter]);

  const totalRoundPages = Math.max(1, Math.ceil((filteredRounds.length || 1) / roundPageSize));
  const totalTransactionPages = Math.max(1, Math.ceil((filteredTransactions.length || 1) / transactionPageSize));

  useEffect(() => {
    if (roundPage > totalRoundPages) {
      setRoundPage(totalRoundPages);
    }
  }, [roundPage, totalRoundPages]);

  useEffect(() => {
    if (transactionPage > totalTransactionPages) {
      setTransactionPage(totalTransactionPages);
    }
  }, [transactionPage, totalTransactionPages]);

  const roundStart = (roundPage - 1) * roundPageSize;
  const paginatedRounds = filteredRounds.slice(roundStart, roundStart + roundPageSize);
  const transactionStart = (transactionPage - 1) * transactionPageSize;
  const paginatedTransactions = filteredTransactions.slice(transactionStart, transactionStart + transactionPageSize);

  const roundRangeStart = filteredRounds.length === 0 ? 0 : roundStart + 1;
  const roundRangeEnd = filteredRounds.length === 0 ? 0 : roundStart + paginatedRounds.length;
  const transactionRangeStart = filteredTransactions.length === 0 ? 0 : transactionStart + 1;
  const transactionRangeEnd = filteredTransactions.length === 0 ? 0 : transactionStart + paginatedTransactions.length;

  const roundInfoText = filteredRounds.length
    ? `${roundRangeStart}–${roundRangeEnd} из ${filteredRounds.length}`
    : 'Нет записей';
  const transactionInfoText = filteredTransactions.length
    ? `${transactionRangeStart}–${transactionRangeEnd} из ${filteredTransactions.length}`
    : 'Нет записей';

  const formatAmount = (value, withSign = false) => {
    const numeric = Number(value ?? 0);
    if (!Number.isFinite(numeric)) {
      return '0.00';
    }
    const formatted = numeric.toFixed(2);
    if (withSign && numeric > 0) {
      return `+${formatted}`;
    }
    return formatted;
  };

  const formatDateTime = value => {
    if (!value) {
      return '—';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleString('ru-RU');
  };

  const walletLabel = type => (type === 'real' ? '💎 Реальный' : '🎮 Демо');

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
                    {Number(stats.netProfit || 0) >= 0 ? '+' : ''}
                    {Number(stats.netProfit || 0).toFixed(2)}
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
                    {Number(stats.wallets?.demo?.netProfit || 0) >= 0 ? '+' : ''}
                    {Number(stats.wallets?.demo?.netProfit || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="table-wrapper">
        <div className="table-controls">
          <h2 className="table-heading">🎲 Последние раунды</h2>
          <div className="table-controls-group">
            <select
              className="pagination-select"
              value={roundFilter}
              onChange={event => setRoundFilter(event.target.value)}
            >
              <option value="all">Все кошельки</option>
              <option value="real">Только реальные</option>
              <option value="demo">Только демо</option>
            </select>
            <select
              className="pagination-select"
              value={roundPageSize}
              onChange={event => setRoundPageSize(Number(event.target.value))}
            >
              {pageSizeOptions.map(size => (
                <option key={size} value={size}>
                  {size} / страницу
                </option>
              ))}
            </select>
            <span className="table-count">{roundInfoText}</span>
          </div>
          <div className="table-pagination">
            <button
              type="button"
              className="pagination-button"
              onClick={() => setRoundPage(page => Math.max(1, page - 1))}
              disabled={roundPage <= 1}
              aria-label="Предыдущая страница"
            >
              ←
            </button>
            <span className="pagination-info">
              Страница {roundPage} / {totalRoundPages}
            </span>
            <button
              type="button"
              className="pagination-button"
              onClick={() => setRoundPage(page => Math.min(totalRoundPages, page + 1))}
              disabled={roundPage >= totalRoundPages}
              aria-label="Следующая страница"
            >
              →
            </button>
          </div>
        </div>
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
            {filteredRounds.length === 0 ? (
              <tr>
                <td colSpan={7} className="table-cell-empty">ℹ️ Под выбранные фильтры раундов нет</td>
              </tr>
            ) : (
              paginatedRounds.map(round => {
                const betAmount = Number(round.final_bet ?? round.base_bet ?? 0);
                const winAmount = Number(round.win_amount ?? 0);
                const winClass = winAmount > 0 ? 'table-cell-positive' : winAmount < 0 ? 'table-cell-negative' : '';

                return (
                  <tr key={round.round_id}>
                    <td className="table-cell-emoji">{round.round_id}</td>
                    <td>{walletLabel(round.wallet_type)}</td>
                    <td className="table-cell-right font-weight-600">{betAmount.toFixed(2)}</td>
                    <td className={`table-cell-right ${winClass}`}>{formatAmount(winAmount, true)}</td>
                    <td>
                      {round.result === 'win' && '✅'}
                      {round.result === 'lose' && '❌'}
                      {round.result === 'push' && '🤝'}
                      {round.result === 'blackjack' && '🎉'}
                      {round.result === 'bust' && '💥'} {round.result || '—'}
                    </td>
                    <td>{round.status || '—'}</td>
                    <td>{formatDateTime(round.settled_at || round.created_at)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="table-wrapper">
        <div className="table-controls">
          <h2 className="table-heading">💸 Движение средств</h2>
          <div className="table-controls-group">
            <select
              className="pagination-select"
              value={transactionFilter}
              onChange={event => setTransactionFilter(event.target.value)}
            >
              <option value="all">Все кошельки</option>
              <option value="real">Только реальные</option>
              <option value="demo">Только демо</option>
            </select>
            <select
              className="pagination-select"
              value={transactionPageSize}
              onChange={event => setTransactionPageSize(Number(event.target.value))}
            >
              {pageSizeOptions.map(size => (
                <option key={size} value={size}>
                  {size} / страницу
                </option>
              ))}
            </select>
            <span className="table-count">{transactionInfoText}</span>
          </div>
          <div className="table-pagination">
            <button
              type="button"
              className="pagination-button"
              onClick={() => setTransactionPage(page => Math.max(1, page - 1))}
              disabled={transactionPage <= 1}
              aria-label="Предыдущая страница"
            >
              ←
            </button>
            <span className="pagination-info">
              Страница {transactionPage} / {totalTransactionPages}
            </span>
            <button
              type="button"
              className="pagination-button"
              onClick={() => setTransactionPage(page => Math.min(totalTransactionPages, page + 1))}
              disabled={transactionPage >= totalTransactionPages}
              aria-label="Следующая страница"
            >
              →
            </button>
          </div>
        </div>
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
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="table-cell-empty">ℹ️ Под выбранные фильтры транзакций нет</td>
              </tr>
            ) : (
              paginatedTransactions.map(tx => {
                const amountValue = Number(tx.amount ?? 0);
                const amountClass = amountValue > 0 ? 'table-cell-positive' : amountValue < 0 ? 'table-cell-negative' : '';

                return (
                  <tr key={tx.id}>
                    <td>{tx.id}</td>
                    <td>{walletLabel(tx.wallet_type)}</td>
                    <td className={`table-cell-right ${amountClass}`}>{formatAmount(amountValue, true)}</td>
                    <td>{tx.reason}</td>
                    <td>{formatDateTime(tx.created_at)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HistoryPage;
