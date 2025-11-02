import { useEffect, useMemo, useState } from 'react';
import { createPlayerApi } from '../../api/playerApi.js';
import { useTelegram } from '../../providers/TelegramProvider.jsx';

const initialForm = {
  documentType: 'passport',
  documentNumber: '',
  country: '',
  documentFrontUrl: '',
  documentBackUrl: '',
  selfieUrl: '',
  additionalDocumentUrl: ''
};

const VerificationPage = () => {
  const { initData } = useTelegram();
  const api = useMemo(() => createPlayerApi(() => initData), [initData]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [verification, setVerification] = useState(null);
  const [form, setForm] = useState(initialForm);

  const loadVerification = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getVerification();
      setVerification(data);
    } catch (err) {
      setError(err.message || 'Не удалось получить данные KYC');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVerification();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async event => {
    event.preventDefault();
    setError('');
    setSuccess('');
    try {
      await api.submitVerification({
        ...form,
        metadata: {
          submittedAt: new Date().toISOString()
        }
      });
      setForm(initialForm);
      setSuccess('Документы отправлены на проверку.');
      await loadVerification();
    } catch (err) {
      setError(err.message || 'Ошибка отправки документов');
    }
  };

  return (
    <div className="flex-col" style={{ gap: '1.5rem' }}>
      <div className="page-section">
        <h2 className="page-section-title">✅ Статус верификации</h2>
        {loading && <p style={{ color: '#94a3b8' }}>⏳ Загрузка…</p>}
        {!loading && verification && (
          <div className="flex-col" style={{ gap: '1rem' }}>
            <div className="card" style={{ padding: '1rem' }}>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>
                <strong style={{ color: '#60a5fa' }}>Статус аккаунта:</strong> <span style={{ color: verification.verification_status === 'verified' ? '#10b981' : '#f59e0b' }}>{verification.verification_status === 'verified' ? '✅ Верифицирован' : '⏳ Не верифицирован'}</span>
              </p>
            </div>
            {verification.request ? (
              <div className="card">
                <h3 style={{ margin: '0 0 1rem 0', color: '#60a5fa', fontSize: '1rem' }}>📋 Последний запрос</h3>
                <div className="flex-col" style={{ gap: '0.75rem' }}>
                  <div><strong style={{ color: '#94a3b8' }}>Статус:</strong> <span style={{ color: verification.request.status === 'approved' ? '#10b981' : verification.request.status === 'rejected' ? '#ef4444' : '#f59e0b' }}>{verification.request.status}</span></div>
                  <div><strong style={{ color: '#94a3b8' }}>Документ:</strong> <span>{verification.request.document_type}</span></div>
                  <div><strong style={{ color: '#94a3b8' }}>Комментарий:</strong> <span>{verification.request.note || verification.request.rejection_reason || '—'}</span></div>
                  <div><strong style={{ color: '#94a3b8' }}>Обновлено:</strong> <span>{verification.request.reviewed_at || '—'}</span></div>
                </div>
              </div>
            ) : (
              <p style={{ color: '#94a3b8', padding: '1rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '8px', margin: 0 }}>ℹ️ Заявок на верификацию пока нет.</p>
            )}
          </div>
        )}
      </div>

      <div className="page-section">
        <h2 className="page-section-title">📤 Отправить документы</h2>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          ℹ️ Используйте только HTTPS ссылки с одобренных доменов. Telegram позволяет загружать файлы через <code style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '2px 4px', borderRadius: '4px' }}>https://t.me/+…</code>
        </p>
        <form onSubmit={handleSubmit} className="form-group">
          <label className="form-label-group">
            <span className="form-label">Тип документа</span>
            <select value={form.documentType} onChange={event => handleChange('documentType', event.target.value)} className="form-select">
              <option value="passport">Паспорт</option>
              <option value="id_card">ID-карта</option>
              <option value="driver_license">Водительское удостоверение</option>
            </select>
          </label>
          <label className="form-label-group">
            <span className="form-label">Номер документа</span>
            <input type="text" value={form.documentNumber} onChange={event => handleChange('documentNumber', event.target.value)} placeholder="AA1234567" className="form-input" />
          </label>
          <label className="form-label-group">
            <span className="form-label">Страна выдачи</span>
            <input type="text" value={form.country} onChange={event => handleChange('country', event.target.value)} placeholder="RU" className="form-input" />
          </label>
          <label className="form-label-group">
            <span className="form-label">⭐ Ссылка на лицевую сторону документа</span>
            <input type="url" value={form.documentFrontUrl} onChange={event => handleChange('documentFrontUrl', event.target.value)} required className="form-input" />
          </label>
          <label className="form-label-group">
            <span className="form-label">Ссылка на оборотную сторону</span>
            <input type="url" value={form.documentBackUrl} onChange={event => handleChange('documentBackUrl', event.target.value)} className="form-input" />
          </label>
          <label className="form-label-group">
            <span className="form-label">⭐ Ссылка на селфи с документом</span>
            <input type="url" value={form.selfieUrl} onChange={event => handleChange('selfieUrl', event.target.value)} required className="form-input" />
          </label>
          <label className="form-label-group">
            <span className="form-label">Дополнительный документ</span>
            <input type="url" value={form.additionalDocumentUrl} onChange={event => handleChange('additionalDocumentUrl', event.target.value)} className="form-input" />
          </label>
          <button type="submit" className="payment-btn" style={{ marginTop: '1rem' }}>
            📤 Отправить на проверку
          </button>
        </form>
        {success && <div className="alert alert-success" style={{ marginTop: '1rem' }}>✅ {success}</div>}
        {error && <div className="alert alert-error" style={{ marginTop: '1rem' }}>⚠️ {error}</div>}
      </div>
    </div>
  );
};

export default VerificationPage;
