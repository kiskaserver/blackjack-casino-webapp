import { useEffect, useState } from 'react';
import { useAdmin } from '../../providers/AdminProvider.jsx';

const statusOptions = ['', 'pending', 'approved', 'processing', 'paid', 'rejected', 'failed'];

const AdminWithdrawalsPage = () => {
  const { api } = useAdmin();
  const [withdrawals, setWithdrawals] = useState([]);
  const [batches, setBatches] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [notes, setNotes] = useState({});

  const showMessage = msg => {
    setMessage(msg);
    window.setTimeout(() => setMessage(''), 4000);
  };

  const loadData = async () => {
    if (!api) {
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [list, batchList] = await Promise.all([
        api.listWithdrawals({ status: statusFilter || undefined, limit: 100 }),
        api.listWithdrawalBatches({ limit: 20 })
      ]);
      setWithdrawals(list || []);
      setBatches(batchList || []);
    } catch (err) {
      setError(err.message || 'Не удалось загрузить заявки');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateStatus = async (id, nextStatus) => {
    if (!api) {
      return;
    }
    try {
      setError('');
      await api.updateWithdrawalStatus(id, { status: nextStatus, note: notes[id] || undefined });
      showMessage(`Статус обновлён на ${nextStatus}`);
      await loadData();
    } catch (err) {
      setError(err.message || 'Не удалось обновить статус');
    }
  };

  const enqueueUrgent = async id => {
    if (!api) {
      return;
    }
    try {
      setError('');
      await api.enqueueUrgentWithdrawal(id);
      showMessage('Заявка отправлена на срочную обработку');
      await loadData();
    } catch (err) {
      setError(err.message || 'Не удалось отправить на срочную обработку');
    }
  };

  const processBatch = async id => {
    if (!api) {
      return;
    }
    try {
      setError('');
      await api.processBatch(id);
      showMessage('Батч отправлен в обработку');
      await loadData();
    } catch (err) {
      setError(err.message || 'Не удалось обработать батч');
    }
  };

  const forceBatch = async () => {
    if (!api) {
      return;
    }
    try {
      setError('');
      await api.forceBatch();
      showMessage('Создан срочный батч');
      await loadData();
    } catch (err) {
      setError(err.message || 'Не удалось создать батч');
    }
  };

  return (
    <div className="space-y-6">
      <section className="card">
        <div className="flex flex-wrap items-center gap-4">
          <div className="input-group flex-1 min-w-[200px]">
            <label className="input-label">Статус</label>
            <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
              {statusOptions.map(option => (
                <option key={option} value={option}>
                  {option ? option : 'Все'}
                </option>
              ))}
            </select>
          </div>
          <button onClick={forceBatch} className="secondary">Создать батч немедленно</button>
          <button className="primary" onClick={loadData}>Обновить</button>
        </div>
        {message && <div className="alert alert-success mt-4">{message}</div>}
        {error && <div className="alert alert-error mt-4">{error}</div>}
      </section>

      <section className="card">
        <h2>Заявки на вывод ({withdrawals.length})</h2>
        {loading && <p>Загрузка…</p>}
        {!loading && (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Игрок</th>
                  <th>Метод</th>
                  <th>Сумма</th>
                  <th>Чистая сумма</th>
                  <th>Статус</th>
                  <th>Приоритет</th>
                  <th>Запланировано</th>
                  <th>Примечание</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.length === 0 && (
                  <tr>
                    <td colSpan={10} className="table-cell-empty">Записей нет</td>
                  </tr>
                )}
                {withdrawals.map(withdrawal => (
                  <tr key={withdrawal.id}>
                    <td>{withdrawal.id}</td>
                    <td>{withdrawal.telegram_id || withdrawal.player_id}</td>
                    <td>{withdrawal.method}</td>
                    <td>{Number(withdrawal.amount || 0).toFixed(2)}</td>
                    <td>{Number(withdrawal.net_amount || withdrawal.netAmount || 0).toFixed(2)}</td>
                    <td>{withdrawal.status}</td>
                    <td>{withdrawal.priority}{withdrawal.is_urgent ? ' · срочно' : ''}</td>
                    <td>{withdrawal.scheduled_for ? new Date(withdrawal.scheduled_for).toLocaleString() : '—'}</td>
                    <td>
                      <textarea
                        rows={2}
                        className="w-180"
                        value={notes[withdrawal.id] || ''}
                        onChange={event => setNotes(prev => ({ ...prev, [withdrawal.id]: event.target.value }))}
                      />
                    </td>
                    <td className="table-cell-flex-col">
                      <button onClick={() => updateStatus(withdrawal.id, 'approved')}>Approve</button>
                      <button onClick={() => updateStatus(withdrawal.id, 'paid')}>Mark paid</button>
                      <button onClick={() => updateStatus(withdrawal.id, 'rejected')}>Reject</button>
                      <button onClick={() => updateStatus(withdrawal.id, 'failed')}>Fail</button>
                      <button onClick={() => enqueueUrgent(withdrawal.id)}>Urgent queue</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <h2>График батчей</h2>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Статус</th>
                <th>Запланировано</th>
                <th>Всего</th>
                <th>Сумма</th>
                <th>Действие</th>
              </tr>
            </thead>
            <tbody>
              {batches.length === 0 && (
                <tr>
                  <td colSpan={6} className="table-cell-empty">Батчей нет</td>
                </tr>
              )}
              {batches.map(batch => (
                <tr key={batch.id}>
                  <td>{batch.id}</td>
                  <td>{batch.status}</td>
                  <td>{batch.scheduled_for ? new Date(batch.scheduled_for).toLocaleString() : '—'}</td>
                  <td>{batch.withdrawalCount}</td>
                  <td>{Number(batch.totalAmount || 0).toFixed(2)}</td>
                  <td>
                    <button onClick={() => processBatch(batch.id)}>Process now</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default AdminWithdrawalsPage;
