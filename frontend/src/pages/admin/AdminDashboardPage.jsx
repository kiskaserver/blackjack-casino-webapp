import { useEffect, useMemo, useState } from 'react';
import { useAdmin } from '../../providers/AdminProvider.jsx';

const formatNumber = value => {
  if (value === null || value === undefined) {
    return '—';
  }
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return String(value);
  }
  return num.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
};

const formatPercent = value => {
  if (value === null || value === undefined) {
    return '—';
  }
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return '—';
  }
  return `${num.toFixed(2)}%`;
};

const MetricCard = ({ title, value, hint }) => (
  <div className="card" style={{ minWidth: 200 }}>
    <h3 style={{ margin: 0 }}>{title}</h3>
    <p style={{ fontSize: '2rem', margin: '0.25rem 0' }}>{value}</p>
    {hint && <small style={{ opacity: 0.7 }}>{hint}</small>}
  </div>
);

const AdminDashboardPage = () => {
  const { api } = useAdmin();
  const [overview, setOverview] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [riskEvents, setRiskEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!api) {
        return;
      }
      setLoading(true);
      setError('');
      try {
        const [metrics, recentTxs, recentRisk] = await Promise.all([
          api.getOverview(),
          api.getRecentTransactions(25),
          api.listRiskEvents({ limit: 10 })
        ]);
        if (!cancelled) {
          setOverview(metrics);
          setTransactions(recentTxs || []);
          setRiskEvents(recentRisk || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Не удалось загрузить сводку');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();
    const interval = window.setInterval(load, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [api]);

  const txByWallet = useMemo(() => {
    return transactions.reduce((acc, tx) => {
  const recentSampleLabel = overview?.fairness?.recent?.sampleSize
    ? `RTP · последние ${overview.fairness.recent.sampleSize.toLocaleString('ru-RU')} рук`
    : 'RTP · последние раунды';

      const key = tx.wallet_type || 'real';
      acc[key] = (acc[key] || 0) + Number(tx.amount || 0);
      return acc;
    }, {});
  }, [transactions]);

  if (loading) {
    return <div className="card">Загрузка панели…</div>;
  }

  if (error) {
    return <div className="card alert error">{error}</div>;
  }

  if (!overview) {
    return <div className="card alert">Сводка недоступна.</div>;
  }

  return (
    <div className="flex-col" style={{ gap: '1.5rem' }}>
      <section className="card-grid">
        <MetricCard title="Игроки" value={formatNumber(overview.players)} hint="Уникальные Telegram ID" />
        <MetricCard title="Раунды (реал)" value={formatNumber(overview.rounds)} hint="game_rounds с wallet=real" />
        <MetricCard title="Раунды (демо)" value={formatNumber(overview.demo_rounds)} hint="game_rounds с wallet=demo" />
        <MetricCard title="Ставки" value={`${formatNumber(overview.total_bet)} 💎`} hint="Сумма final_bet (реал)" />
        <MetricCard title="Выплаты" value={`${formatNumber(overview.total_paid)} 💎`} hint="Сумма win_amount (реал)" />
        <MetricCard title="Депозиты" value={`${formatNumber(overview.total_deposit)} 💎`} hint="transactions.deposit*" />
        <MetricCard title="Выводы" value={`${formatNumber(overview.total_withdraw)} 💎`} hint="transactions.withdraw*" />
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
              hint={`Выборка: ${overview.fairness.recent?.sampleSize?.toLocaleString('ru-RU') || '—'}`}
            />
            <MetricCard
              title="Целевой RTP"
              value={formatPercent(overview.fairness.settings?.transparency?.targetRtpPercent)}
              hint="Из настроек"
            />
          </>
        )}
      </section>

      <section className="card">
        <h2>Последние транзакции</h2>
        <div className="table-wrapper">
          <table>
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
                  <td colSpan={6} style={{ textAlign: 'center', opacity: 0.7 }}>Записей нет</td>
                </tr>
              )}
              {transactions.map(tx => (
                <tr key={tx.id}>
                  <td>{tx.id}</td>
                  <td>{tx.telegram_id || '—'}</td>
                  <td>{tx.wallet_type}</td>
                  <td style={{ color: Number(tx.amount) >= 0 ? '#34d399' : '#f87171' }}>{formatNumber(tx.amount)}</td>
                  <td>{tx.reason}</td>
                  <td>{new Date(tx.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', opacity: 0.7 }}>
          Итог по кошелькам: {Object.entries(txByWallet).map(([wallet, total]) => `${wallet}: ${formatNumber(total)}`).join(' · ')}
        </div>
      </section>

      <section className="card">
        <h2>Риск-события</h2>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Игрок</th>
                <th>Тип</th>
                <th>Уровень</th>
                <th>Создано</th>
              </tr>
            </thead>
            <tbody>
              {riskEvents.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', opacity: 0.7 }}>Активных событий нет</td>
                </tr>
              )}
              {riskEvents.map(event => (
                <tr key={event.id}>
                  <td>{event.id}</td>
                  <td>{event.telegram_id || event.player_id || '—'}</td>
                  <td>{event.event_type}</td>
                  <td>{event.severity}</td>
                  <td>{new Date(event.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default AdminDashboardPage;
