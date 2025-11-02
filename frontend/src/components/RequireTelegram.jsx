import { useState } from 'react';
import { useTelegram } from '../providers/TelegramProvider.jsx';

export const RequireTelegram = ({ children }) => {
  const { initData, setInitData } = useTelegram();
  const [manualValue, setManualValue] = useState('');
  const [error, setError] = useState('');

  if (initData) {
    return children;
  }

  const handleSubmit = event => {
    event.preventDefault();
    if (!manualValue.trim()) {
      setError('Вставьте строку initData из Telegram Web App');
      return;
    }
    setError('');
    setInitData(manualValue.trim());
  };

  return (
    <div className="content" style={{ marginTop: '3rem' }}>
      <div className="card" style={{ maxWidth: 720, margin: '0 auto' }}>
        <h2>Требуется Telegram WebApp</h2>
        <p>
          Приложение должно запускаться внутри Telegram. Если вы тестируете локально, вставьте значение <code>initData</code>
          , полученное в <code>Telegram.WebApp.initData</code>.
        </p>
        <form onSubmit={handleSubmit}>
          <label>
            initData
            <textarea
              value={manualValue}
              onChange={event => setManualValue(event.target.value)}
              rows={6}
              placeholder="query_id=...&user=..."
            />
          </label>
          {error && <div className="alert error">{error}</div>}
          <div className="flex-row" style={{ justifyContent: 'flex-end' }}>
            <button type="submit" className="primary">
              Использовать initData
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
