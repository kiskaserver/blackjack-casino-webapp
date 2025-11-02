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
      <div className="card">
        <h2>Статус верификации</h2>
        {loading && <p>Загрузка…</p>}
        {!loading && verification && (
          <div>
            <p>
              <strong>Статус аккаунта:</strong> {verification.verification_status || 'unverified'}
            </p>
            {verification.request ? (
              <div className="card" style={{ background: 'rgba(75,85,99,0.15)', marginTop: '1rem' }}>
                <h3>Последний запрос</h3>
                <p>
                  <strong>Статус:</strong> {verification.request.status}
                </p>
                <p>
                  <strong>Документ:</strong> {verification.request.document_type}
                </p>
                <p>
                  <strong>Комментарий:</strong> {verification.request.note || verification.request.rejection_reason || '—'}
                </p>
                <p>
                  <strong>Обновлено:</strong> {verification.request.reviewed_at || '—'}
                </p>
              </div>
            ) : (
              <p>Заявок на верификацию пока нет.</p>
            )}
          </div>
        )}
      </div>

      <div className="card">
        <h2>Отправить документы</h2>
        <p style={{ opacity: 0.75 }}>
          Используйте только HTTPS ссылки с доменов, одобренных командой (см. <code>VERIFICATION_ALLOWED_HOSTS</code>). Telegram позволяет
          загружать файлы и получать прямые ссылки через <code>https://t.me/+…</code>.
        </p>
        <form onSubmit={handleSubmit}>
          <label>
            Тип документа
            <select value={form.documentType} onChange={event => handleChange('documentType', event.target.value)}>
              <option value="passport">Паспорт</option>
              <option value="id_card">ID-карта</option>
              <option value="driver_license">Водительское удостоверение</option>
            </select>
          </label>
          <label>
            Номер документа
            <input type="text" value={form.documentNumber} onChange={event => handleChange('documentNumber', event.target.value)} placeholder="AA1234567" />
          </label>
          <label>
            Страна выдачи
            <input type="text" value={form.country} onChange={event => handleChange('country', event.target.value)} placeholder="RU" />
          </label>
          <label>
            Ссылка на лицевую сторону документа (обязательно)
            <input type="url" value={form.documentFrontUrl} onChange={event => handleChange('documentFrontUrl', event.target.value)} required />
          </label>
          <label>
            Ссылка на оборотную сторону
            <input type="url" value={form.documentBackUrl} onChange={event => handleChange('documentBackUrl', event.target.value)} />
          </label>
          <label>
            Ссылка на селфи с документом (обязательно)
            <input type="url" value={form.selfieUrl} onChange={event => handleChange('selfieUrl', event.target.value)} required />
          </label>
          <label>
            Дополнительный документ (при необходимости)
            <input type="url" value={form.additionalDocumentUrl} onChange={event => handleChange('additionalDocumentUrl', event.target.value)} />
          </label>
          <div className="flex-row" style={{ justifyContent: 'flex-end' }}>
            <button className="primary" type="submit">
              Отправить на проверку
            </button>
          </div>
        </form>
        {success && <div className="alert success" style={{ marginTop: '1rem' }}>{success}</div>}
        {error && <div className="alert error" style={{ marginTop: '1rem' }}>{error}</div>}
      </div>
    </div>
  );
};

export default VerificationPage;
