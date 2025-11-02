import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAdmin } from '../../providers/AdminProvider.jsx';

const AdminLoginPage = () => {
  const { login } = useAdmin();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/admin/dashboard';

  const [adminId, setAdminId] = useState('');
  const [secret, setSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async event => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (!adminId.trim() || !secret.trim()) {
        throw new Error('Укажите adminId и secret');
      }
      await login({ adminId: adminId.trim(), secret: secret.trim() });
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div className="card" style={{ width: '100%', maxWidth: 420 }}>
        <h1 style={{ marginBottom: '1rem' }}>Вход в админку</h1>
        <form onSubmit={handleSubmit}>
          <label>
            adminId (Telegram ID)
            <input value={adminId} onChange={event => setAdminId(event.target.value)} placeholder="123456789" autoComplete="username" />
          </label>
          <label>
            secret
            <input value={secret} onChange={event => setSecret(event.target.value)} placeholder="••••••" type="password" autoComplete="current-password" />
          </label>
          {error && <div className="alert error">{error}</div>}
          <button className="primary" type="submit" disabled={loading}>
            {loading ? 'Вход...' : 'Продолжить'}
          </button>
        </form>
        <p style={{ marginTop: '1rem', fontSize: '0.85rem', opacity: 0.75 }}>
          Доступ разрешен только Telegram ID, перечисленным в переменной окружения <code>ADMIN_TELEGRAM_IDS</code>. Секрет храните вне Git.
        </p>
      </div>
    </div>
  );
};

export default AdminLoginPage;
