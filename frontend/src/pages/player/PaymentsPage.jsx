import { useMemo, useState } from 'react';
import { createPlayerApi } from '../../api/playerApi.js';
import { useTelegram } from '../../providers/TelegramProvider.jsx';

const defaultWithdraw = {
  amount: '50',
  method: 'cryptomus',
  destination: '',
  currency: 'USDT',
  network: 'TRC20',
  isUrgent: false
};

const PaymentsPage = () => {
  const { initData } = useTelegram();
  const api = useMemo(() => createPlayerApi(() => initData), [initData]);
  const [cryptomusAmount, setCryptomusAmount] = useState('50');
  const [cryptomusCurrency, setCryptomusCurrency] = useState('USDT');
  const [cryptomusNetwork, setCryptomusNetwork] = useState('TRC20');
  const [cryptomusInvoice, setCryptomusInvoice] = useState(null);
  const [telegramStarsAmount, setTelegramStarsAmount] = useState('100');
  const [telegramStarsLink, setTelegramStarsLink] = useState('');
  const [withdrawal, setWithdrawal] = useState(defaultWithdraw);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const wrap = async callback => {
    setLoading(true);
    setError('');
    setStatusMessage('');
    try {
      await callback();
    } catch (err) {
      setError(err.message || 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCryptomusInvoice = () =>
    wrap(async () => {
      const payload = await api.createCryptomusInvoice({
        amount: Number(cryptomusAmount),
        currency: cryptomusCurrency,
        network: cryptomusNetwork
      });
      setCryptomusInvoice(payload.invoice);
      setStatusMessage('Счёт создан. Завершите оплату на стороне Cryptomus.');
    });

  const handleCreateTelegramStarsInvoice = () =>
    wrap(async () => {
      const invoiceResponse = await api.createTelegramStarsInvoice({
        amount: Number(telegramStarsAmount),
        description: 'Blackjack Casino пополнение'
      });
      const link = typeof invoiceResponse === 'string'
        ? invoiceResponse
        : invoiceResponse?.invoiceLink || invoiceResponse?.link || '';
      if (!link) {
        throw new Error('Ссылка на оплату не получена');
      }
      setTelegramStarsLink(link);
      setStatusMessage('Ссылка на пополнение Telegram Stars готова.');
      window.open(link, '_blank', 'noopener');
    });

  const handleWithdrawalChange = (field, value) => {
    setWithdrawal(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmitWithdrawal = () =>
    wrap(async () => {
      const payload = {
        amount: Number(withdrawal.amount),
        method: withdrawal.method,
        destination: withdrawal.destination,
        currency: withdrawal.currency,
        network: withdrawal.network,
        isUrgent: withdrawal.isUrgent
      };
      await api.requestWithdrawal(payload);
      setWithdrawal(defaultWithdraw);
      setStatusMessage('Заявка на вывод отправлена.');
    });

  return (
    <div className="payments-container">
      <div className="payment-section">
        <h2>💳 Пополнение Cryptomus</h2>
        <div className="payment-form">
          <label className="form-field">
            <span className="form-field-label">Сумма</span>
            <input type="number" min="1" step="1" value={cryptomusAmount} onChange={event => setCryptomusAmount(event.target.value)} />
          </label>
          <label className="form-field">
            <span className="form-field-label">Валюта</span>
            <select value={cryptomusCurrency} onChange={event => setCryptomusCurrency(event.target.value)}>
              <option value="USDT">USDT</option>
              <option value="USDC">USDC</option>
              <option value="BTC">BTC</option>
              <option value="ETH">ETH</option>
              <option value="LTC">LTC</option>
            </select>
          </label>
          <label className="form-field">
            <span className="form-field-label">Сеть</span>
            <select value={cryptomusNetwork} onChange={event => setCryptomusNetwork(event.target.value)}>
              <option value="TRC20">TRC20</option>
              <option value="ERC20">ERC20</option>
              <option value="BEP20">BEP20</option>
            </select>
          </label>
          <button onClick={handleCreateCryptomusInvoice} disabled={loading} className="payment-btn">
            💳 Создать счёт
          </button>
        </div>
        {cryptomusInvoice && (
          <div className="payment-success">
            Счёт готов. Отсканируйте QR или перейдите по ссылке:<br />
            <a href={cryptomusInvoice.url} target="_blank" rel="noopener noreferrer">
              {cryptomusInvoice.url}
            </a>
          </div>
        )}
      </div>

      <div className="payment-section">
        <h2>⭐ Пополнение Telegram Stars</h2>
        <div className="payment-form">
          <label className="form-field">
            <span className="form-field-label">Количество Star</span>
            <input type="number" min="1" step="1" value={telegramStarsAmount} onChange={event => setTelegramStarsAmount(event.target.value)} />
          </label>
          <button onClick={handleCreateTelegramStarsInvoice} disabled={loading} className="payment-btn">
            ⭐ Получить ссылку оплаты
          </button>
        </div>
        {telegramStarsLink && (
          <div className="payment-success">
            Ссылка на оплату:<br />
            <a href={telegramStarsLink} target="_blank" rel="noopener noreferrer">
              {telegramStarsLink}
            </a>
          </div>
        )}
      </div>

      <div className="payment-section">
        <h2 className="page-section-title">💰 Запрос на вывод средств</h2>
        <div className="withdrawal-form">
          <div className="withdrawal-method-section">
            <label className="form-label-group">
              <span className="form-label">Сумма</span>
              <input
                type="number"
                min="1"
                step="1"
                value={withdrawal.amount}
                onChange={event => handleWithdrawalChange('amount', event.target.value)}
                className="form-input"
              />
            </label>
            <label className="form-label-group">
              <span className="form-label">Метод</span>
              <select
                value={withdrawal.method}
                onChange={event => handleWithdrawalChange('method', event.target.value)}
                className="form-select"
              >
                <option value="cryptomus">Cryptomus</option>
                <option value="telegram_stars">Telegram Stars</option>
              </select>
            </label>
          </div>
          
          {withdrawal.method === 'cryptomus' && (
            <div className="withdrawal-crypto-fields">
              <label className="form-label-group-wide">
                <span className="form-label">Адрес кошелька</span>
                <input
                  type="text"
                  value={withdrawal.destination}
                  onChange={event => handleWithdrawalChange('destination', event.target.value)}
                  placeholder="USDT адрес"
                  className="form-input"
                />
              </label>
              <label className="form-label-group">
                <span className="form-label">Валюта</span>
                <input
                  type="text"
                  value={withdrawal.currency}
                  onChange={event => handleWithdrawalChange('currency', event.target.value)}
                  className="form-input"
                />
              </label>
              <label className="form-label-group">
                <span className="form-label">Сеть</span>
                <input
                  type="text"
                  value={withdrawal.network}
                  onChange={event => handleWithdrawalChange('network', event.target.value)}
                  className="form-input"
                />
              </label>
            </div>
          )}
          
          {withdrawal.method === 'telegram_stars' && (
            <label className="form-label-group">
              <span className="form-label">Telegram ID получателя</span>
              <input
                type="text"
                value={withdrawal.destination}
                onChange={event => handleWithdrawalChange('destination', event.target.value)}
                placeholder="ID пользователя"
                className="form-input"
              />
            </label>
          )}

          <label className="withdrawal-urgent-checkbox">
            <input
              type="checkbox"
              checked={withdrawal.isUrgent}
              onChange={event => handleWithdrawalChange('isUrgent', event.target.checked)}
            />
            <span className="withdrawal-urgent-text">⚡ Срочный вывод (дополнительная комиссия)</span>
          </label>

          <button onClick={handleSubmitWithdrawal} disabled={loading} className="payment-btn">
            💰 Отправить заявку
          </button>
        </div>
      </div>

      {statusMessage && <div className="alert alert-success">✅ {statusMessage}</div>}
      {error && <div className="alert alert-error">⚠️ {error}</div>}
    </div>
  );
};

export default PaymentsPage;
