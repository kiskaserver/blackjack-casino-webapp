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
    <div className="flex-col" style={{ gap: '1.5rem' }}>
      <section className="card admin-controls">
        <label>
          Статус
          <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
            {statusOptions.map(option => (
              <option key={option} value={option}>
                {option ? option : 'Все'}
              </option>
            ))}
          </select>
        </label>
        <button className="primary" onClick={loadList}>Обновить</button>
        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-error">{error}</div>}
      </section>

      <div className="section-flex">
        <section className="card section-narrow">
          <h2>Запросы ({verifications.length})</h2>
          {loading && <p>Загрузка…</p>}
          {!loading && (
            <ul className="section-list">
              {verifications.length === 0 && <li className="section-list-item-empty">Нет запросов.</li>}
              {verifications.map(item => (
                <li key={item.id}>
                  <button
                    onClick={() => selectVerification(item.id)}
                    className="section-list-item"
                    style={{
                      width: '100%',
                      background: selectedId === item.id ? 'rgba(96,165,250,0.25)' : undefined
                    }}
                  >
                    <strong>{item.id}</strong> · {item.status} · {item.document_type}
                    <div className="section-list-item-text">
                      Игрок: {item.player?.telegram_id || item.player_id} · Обновлено: {item.updated_at ? new Date(item.updated_at).toLocaleString() : '—'}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card section-wide">
          {!selected && <p className="section-empty-text">Выберите заявку, чтобы увидеть подробности.</p>}
          {selected && (
            <div className="flex-col" style={{ gap: '1rem' }}>
              <header>
                <h2 style={{ marginBottom: '0.25rem' }}>Заявка #{selected.id}</h2>
                <div className="admin-details-meta">
                  Игрок {selected.player?.telegram_id || selected.player_id} · статус {selected.status}
                </div>
              </header>

              <div className="card" style={{ background: 'rgba(30,41,59,0.6)' }}>
                <h3>Документы</h3>
                <ul className="section-list" style={{ gap: '0.5rem' }}>
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

              <div className="card" style={{ background: 'rgba(30,41,59,0.6)' }}>
                <h3>История</h3>
                <p>Отправлено: {selected.submitted_at ? new Date(selected.submitted_at).toLocaleString() : '—'}</p>
                <p>Проверено: {selected.reviewed_at ? new Date(selected.reviewed_at).toLocaleString() : '—'}</p>
                <p>Примечание: {selected.note || '—'}</p>
                <p>Причина: {selected.rejection_reason || '—'}</p>
              </div>

              <div className="card" style={{ background: 'rgba(30,41,59,0.6)' }}>
                <h3>Действия</h3>
                <label>
                  Примечание ревью
                  <textarea rows={3} value={actionNote} onChange={event => setActionNote(event.target.value)} />
                </label>
                <label>
                  Причина / комментарий для игрока
                  <textarea rows={3} value={actionReason} onChange={event => setActionReason(event.target.value)} />
                </label>
                <div className="flex-row" style={{ gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button className="primary" onClick={approve}>Одобрить</button>
                  <button onClick={requestResubmission}>Запросить повторную подачу</button>
                  <button className="danger" onClick={reject}>Отклонить</button>
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
