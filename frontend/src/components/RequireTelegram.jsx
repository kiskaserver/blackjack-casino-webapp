import { useEffect, useState } from 'react';
import { useTelegram } from '../providers/TelegramProvider.jsx';

export const RequireTelegram = ({ children }) => {
  const { initData, setInitData } = useTelegram();
  const [manualValue, setManualValue] = useState('');
  const [error, setError] = useState('');
  const [rawTelegramInitData, setRawTelegramInitData] = useState(() => {
    if (typeof window === 'undefined') {
      return '';
    }
    return window.Telegram?.WebApp?.initData || '';
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const str = window.Telegram?.WebApp?.initData || '';
    setRawTelegramInitData(str);
  }, [initData]);

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
    <div className="content mt-3">
      <div className="card max-w-720 mx-auto">
        <h2>Требуется Telegram WebApp</h2>
        <p>
          Приложение должно запускаться внутри Telegram. Если вы тестируете локально, вставьте значение <code>initData</code>
          , полученное в <code>Telegram.WebApp.initData</code>.
        </p>
        <details className="mb-1">
          <summary>Отладка initData</summary>
          <p>
            <strong>window.Telegram.WebApp.initData:</strong>
          </p>
          <pre className="pre-wrap">
            {rawTelegramInitData || '(пусто)'}
          </pre>
        </details>
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
          <div className="flex-row justify-end">
            <button type="submit" className="primary">
              Использовать initData
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
