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
      const invoiceLink = await api.createTelegramStarsInvoice({
        amount: Number(telegramStarsAmount),
        description: 'Blackjack Casino пополнение'
      });
      setTelegramStarsLink(invoiceLink);
      setStatusMessage('Ссылка на пополнение Telegram Stars готова.');
      window.open(invoiceLink, '_blank', 'noopener');
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
    <div className="flex-col" style={{ gap: '1.5rem' }}>
      <div className="card">
        <h2>Пополнение через Cryptomus</h2>
        <div className="flex-row" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <label>
            Сумма
            <input type="number" min="1" step="1" value={cryptomusAmount} onChange={event => setCryptomusAmount(event.target.value)} />
          </label>
          <label>
            Валюта
            <select value={cryptomusCurrency} onChange={event => setCryptomusCurrency(event.target.value)}>
              <option value="USDT">USDT</option>
              <option value="USDC">USDC</option>
              <option value="BTC">BTC</option>
              <option value="ETH">ETH</option>
              <option value="LTC">LTC</option>
            </select>
          </label>
          <label>
            Сеть
            <select value={cryptomusNetwork} onChange={event => setCryptomusNetwork(event.target.value)}>
              <option value="TRC20">TRC20</option>
              <option value="ERC20">ERC20</option>
              <option value="BEP20">BEP20</option>
            </select>
          </label>
          <button className="primary" onClick={handleCreateCryptomusInvoice} disabled={loading}>
            Создать счёт
          </button>
        </div>
        {cryptomusInvoice && (
          <div className="alert success" style={{ marginTop: '1rem' }}>
            Счёт готов. Отсканируйте QR или перейдите по ссылке:
            <br />
            <a href={cryptomusInvoice.url} target="_blank" rel="noopener noreferrer">
              {cryptomusInvoice.url}
            </a>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Пополнение Telegram Stars</h2>
        <div className="flex-row" style={{ flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
          <label>
            Количество Star
            <input type="number" min="1" step="1" value={telegramStarsAmount} onChange={event => setTelegramStarsAmount(event.target.value)} />
          </label>
          <button className="primary" onClick={handleCreateTelegramStarsInvoice} disabled={loading}>
            Получить ссылку оплаты
          </button>
        </div>
        {telegramStarsLink && (
          <div className="alert success" style={{ marginTop: '1rem' }}>
            Ссылка на оплату:
            <br />
            <a href={telegramStarsLink} target="_blank" rel="noopener noreferrer">
              {telegramStarsLink}
            </a>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Запрос на вывод средств</h2>
        <div className="flex-row" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <label>
            Сумма
            <input type="number" min="1" step="1" value={withdrawal.amount} onChange={event => handleWithdrawalChange('amount', event.target.value)} />
          </label>
          <label>
            Метод
            <select value={withdrawal.method} onChange={event => handleWithdrawalChange('method', event.target.value)}>
              <option value="cryptomus">Cryptomus</option>
              <option value="telegram_stars">Telegram Stars</option>
            </select>
          </label>
          {withdrawal.method === 'cryptomus' && (
            <>
              <label>
                Адрес кошелька
                <input type="text" value={withdrawal.destination} onChange={event => handleWithdrawalChange('destination', event.target.value)} placeholder="USDT адрес" />
              </label>
              <label>
                Валюта
                <input type="text" value={withdrawal.currency} onChange={event => handleWithdrawalChange('currency', event.target.value)} />
              </label>
              <label>
                Сеть
                <input type="text" value={withdrawal.network} onChange={event => handleWithdrawalChange('network', event.target.value)} />
              </label>
            </>
          )}
          {withdrawal.method === 'telegram_stars' && (
            <label style={{ flex: '1 1 240px' }}>
              Telegram ID получателя
              <input type="text" value={withdrawal.destination} onChange={event => handleWithdrawalChange('destination', event.target.value)} placeholder="ID пользователя" />
            </label>
          )}
        </div>
        <label style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem', width: 'fit-content' }}>
          <input
            type="checkbox"
            checked={withdrawal.isUrgent}
            onChange={event => handleWithdrawalChange('isUrgent', event.target.checked)}
            style={{ width: 18, height: 18 }}
          />
          Срочный вывод (дополнительная комиссия)
        </label>
        <div className="flex-row" style={{ justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button className="primary" onClick={handleSubmitWithdrawal} disabled={loading}>
            Отправить заявку
          </button>
        </div>
      </div>

      {statusMessage && <div className="alert success">{statusMessage}</div>}
      {error && <div className="alert error">{error}</div>}
    </div>
  );
};

export default PaymentsPage;
