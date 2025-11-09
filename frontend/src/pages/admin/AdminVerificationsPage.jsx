import { useEffect, useState } from 'react';
import { useAdmin } from '../../providers/AdminProvider.jsx';

const statusOptions = ['', 'pending', 'resubmit', 'approved', 'rejected'];

const AdminVerificationsPage = () => {
  const { api } = useAdmin();
  const [verifications, setVerifications] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [actionNote, setActionNote] = useState('');
  const [actionReason, setActionReason] = useState('');
  const [message, setMessage] = useState('');

  const showMessage = msg => {
    setMessage(msg);
    window.setTimeout(() => setMessage(''), 4000);
  };

  const loadList = async () => {
    if (!api) {
      return;
    }
    setLoading(true);
    setError('');
    try {
      const list = await api.listVerifications({ status: statusFilter || undefined, limit: 100 });
      setVerifications(list || []);
    } catch (err) {
      setError(err.message || 'Не удалось загрузить верификации');
    } finally {
      setLoading(false);
    }
  };

  const selectVerification = async id => {
    if (!api || !id) {
      return;
    }
    setSelectedId(id);
    setSelected(null);
    setError('');
    try {
      const data = await api.getVerification(id);
      setSelected(data);
      setActionNote('');
      setActionReason('');
    } catch (err) {
      setError(err.message || 'Не удалось загрузить запрос');
    }
  };

  useEffect(() => {
    loadList();
  }, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const afterAction = async msg => {
    showMessage(msg);
    await loadList();
    if (selectedId) {
      await selectVerification(selectedId);
    }
  };

  const approve = async () => {
    if (!api || !selectedId) {
      return;
    }
    try {
      setError('');
      await api.approveVerification(selectedId, { note: actionNote || undefined });
      await afterAction('Заявка одобрена');
    } catch (err) {
      setError(err.message || 'Не удалось одобрить заявку');
    }
  };

  const reject = async () => {
    if (!api || !selectedId) {
      return;
    }
    try {
      setError('');
      await api.rejectVerification(selectedId, { note: actionNote || undefined, reason: actionReason || undefined });
      await afterAction('Заявка отклонена');
    } catch (err) {
      setError(err.message || 'Не удалось отклонить заявку');
    }
  };

  const requestResubmission = async () => {
    if (!api || !selectedId) {
      return;
    }
    try {
      setError('');
      await api.requestVerificationResubmission(selectedId, { note: actionNote || undefined, reason: actionReason || undefined });
      await afterAction('Запрошено повторное предоставление документов');
    } catch (err) {
      setError(err.message || 'Не удалось запросить повторную подачу');
    }
  };

  return (
    <div className="space-y-6">
      <section className="card">
        <div className="flex items-center gap-4">
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
          <button className="primary" onClick={loadList}>Обновить</button>
        </div>
        {message && <div className="alert alert-success mt-4">{message}</div>}
        {error && <div className="alert alert-error mt-4">{error}</div>}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="card lg:col-span-1">
          <h2>Запросы ({verifications.length})</h2>
          {loading && <p>Загрузка…</p>}
          {!loading && (
            <div className="space-y-2">
              {verifications.length === 0 && <p className="text-center text-slate-400 py-4">Нет запросов.</p>}
              {verifications.map(item => (
                <button
                  key={item.id}
                  onClick={() => selectVerification(item.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedId === item.id 
                      ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400' 
                      : 'border-slate-700 hover:border-slate-600 hover:bg-slate-800'
                  }`}
                >
                  <div className="font-semibold">{item.id}</div>
                  <div className="text-sm text-slate-400">{item.status} · {item.document_type}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    Игрок: {item.player?.telegram_id || item.player_id} · Обновлено: {item.updated_at ? new Date(item.updated_at).toLocaleString() : '—'}
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="card lg:col-span-2">
          {!selected && <p className="text-center text-slate-400 py-8">Выберите заявку, чтобы увидеть подробности.</p>}
          {selected && (
            <div className="space-y-4">
              <header>
                <h2 className="mb-1">Заявка #{selected.id}</h2>
                <div className="text-sm text-slate-400">
                  Игрок {selected.player?.telegram_id || selected.player_id} · статус {selected.status}
                </div>
              </header>

              <div className="card">
                <h3>Документы</h3>
                <ul className="space-y-2">
                  <li>Тип: {selected.document_type}</li>
                  <li>Номер: {selected.document_number || '—'}</li>
                  <li>Страна: {selected.country || '—'}</li>
                  <li>
                    Лицевая сторона: {selected.document_front_url ? (
                      <a href={selected.document_front_url} target="_blank" rel="noopener noreferrer">открыть</a>
                    ) : '—'}
                  </li>
                  <li>
                    Оборотная сторона: {selected.document_back_url ? (
                      <a href={selected.document_back_url} target="_blank" rel="noopener noreferrer">открыть</a>
                    ) : '—'}
                  </li>
                  <li>
                    Селфи: {selected.selfie_url ? (
                      <a href={selected.selfie_url} target="_blank" rel="noopener noreferrer">открыть</a>
                    ) : '—'}
                  </li>
                  <li>
                    Дополнительный документ: {selected.additional_document_url ? (
                      <a href={selected.additional_document_url} target="_blank" rel="noopener noreferrer">открыть</a>
                    ) : '—'}
                  </li>
                </ul>
              </div>

              <div className="card">
                <h3>История</h3>
                <p>Отправлено: {selected.submitted_at ? new Date(selected.submitted_at).toLocaleString() : '—'}</p>
                <p>Проверено: {selected.reviewed_at ? new Date(selected.reviewed_at).toLocaleString() : '—'}</p>
                <p>Примечание: {selected.note || '—'}</p>
                <p>Причина: {selected.rejection_reason || '—'}</p>
              </div>

              <div className="card">
                <h3>Действия</h3>
                <div className="space-y-4">
                  <div className="input-group">
                    <label className="input-label">Примечание ревью</label>
                    <textarea rows={3} value={actionNote} onChange={event => setActionNote(event.target.value)} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Причина / комментарий для игрока</label>
                    <textarea rows={3} value={actionReason} onChange={event => setActionReason(event.target.value)} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button className="primary" onClick={approve}>Одобрить</button>
                    <button className="secondary" onClick={requestResubmission}>Запросить повторную подачу</button>
                    <button className="danger" onClick={reject}>Отклонить</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default AdminVerificationsPage;
