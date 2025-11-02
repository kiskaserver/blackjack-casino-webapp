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
    <div className="flex-col verification-page">
      <div className="page-section">
        <h2 className="page-section-title">✅ Статус верификации</h2>
        {loading && <p className="loading-text">⏳ Загрузка…</p>}
        {!loading && verification && (
          <div className="flex-col verification-status">
            <div className="card">
              <p className="verification-status-text">
                <strong className="status-label">Статус аккаунта:</strong> 
                <span className={`status-value ${verification.verification_status === 'verified' ? 'verified' : 'pending'}`}>
                  {verification.verification_status === 'verified' ? '✅ Верифицирован' : '⏳ Не верифицирован'}
                </span>
              </p>
            </div>
            {verification.request ? (
              <div className="card verification-request">
                <h3 className="request-title">📋 Последний запрос</h3>
                <div className="flex-col request-details">
                  <div className="request-row">
                    <strong className="request-label">Статус:</strong> 
                    <span className={`request-status ${verification.request.status}`}>{verification.request.status}</span>
                  </div>
                  <div className="request-row">
                    <strong className="request-label">Документ:</strong> 
                    <span className="request-value">{verification.request.document_type}</span>
                  </div>
                  <div className="request-row">
                    <strong className="request-label">Комментарий:</strong> 
                    <span className="request-value">{verification.request.note || verification.request.rejection_reason || '—'}</span>
                  </div>
                  <div className="request-row">
                    <strong className="request-label">Обновлено:</strong> 
                    <span className="request-value">{verification.request.reviewed_at || '—'}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="no-requests">ℹ️ Заявок на верификацию пока нет.</p>
            )}
          </div>
        )}
      </div>

      <div className="page-section">
        <h2 className="page-section-title">📤 Отправить документы</h2>
        <p className="verification-hint">
          ℹ️ Используйте только HTTPS ссылки с одобренных доменов. Telegram позволяет загружать файлы через <code>https://t.me/+…</code>
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
          <button type="submit" className="payment-btn">
            📤 Отправить на проверку
          </button>
        </form>
        {success && <div className="alert alert-success">✅ {success}</div>}
        {error && <div className="alert alert-error">⚠️ {error}</div>}
      </div>
    </div>
  );
};

export default VerificationPage;
