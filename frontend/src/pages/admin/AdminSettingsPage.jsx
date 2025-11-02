import { useEffect, useState } from 'react';
import { useAdmin } from '../../providers/AdminProvider.jsx';

const AdminSettingsPage = () => {
  const { api } = useAdmin();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [verificationHosts, setVerificationHosts] = useState([]);

  const [demo, setDemo] = useState({ enabled: true, defaultBalance: 10000, topUpThreshold: 500, allowPlayerOverrides: true });
  const [payouts, setPayouts] = useState({ blackjackMultiplier: 1.5, winMultiplier: 1, pushReturn: 1 });
  const [crypto, setCrypto] = useState({
    autoApprovalThreshold: 200,
    manualReviewThreshold: 1000,
    urgentFeePercent: 0.02,
    allowUrgent: true,
    batchHourUtc: 23,
    cutoffHourUtc: 22
  });
  const [commissionWithdraw, setCommissionWithdraw] = useState({
    cryptomusPlatformPercent: 0.02,
    cryptomusProviderPercent: 0.01,
    telegramPlatformPercent: 0.08,
    telegramProviderPercent: 0.35
  });
  const [gameplay, setGameplay] = useState({ deckCount: 6, dealerHitsSoft17: false });
  const [transparency, setTransparency] = useState({ targetRtpPercent: 97.5, reportWindowSize: 5000 });

  const showMessage = text => {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 4000);
  };

  const buildPayoutsPayload = () => ({
    blackjackMultiplier: Number(payouts.blackjackMultiplier),
    winMultiplier: Number(payouts.winMultiplier),
    pushReturn: Number(payouts.pushReturn),
    crypto: {
      autoApprovalThreshold: Number(crypto.autoApprovalThreshold),
      manualReviewThreshold: Number(crypto.manualReviewThreshold),
      urgentFeePercent: Number(crypto.urgentFeePercent),
      allowUrgent: Boolean(crypto.allowUrgent),
      batchHourUtc: Number(crypto.batchHourUtc),
      cutoffHourUtc: Number(crypto.cutoffHourUtc)
    }
  });

  useEffect(() => {
    const load = async () => {
      if (!api) {
        return;
      }
      setLoading(true);
      setError('');
      try {
        const [settings, hosts] = await Promise.all([
          api.getSettings(),
          api.getVerificationHosts().catch(() => ({ allowedHosts: [] }))
        ]);
        setVerificationHosts(hosts?.allowedHosts || []);
        if (settings?.demo) {
          setDemo({
            enabled: settings.demo.enabled,
            defaultBalance: settings.demo.defaultBalance,
            topUpThreshold: settings.demo.topUpThreshold,
            allowPlayerOverrides: settings.demo.allowPlayerOverrides
          });
        }
        if (settings?.payouts) {
          setPayouts({
            blackjackMultiplier: settings.payouts.blackjackMultiplier ?? 1.5,
            winMultiplier: settings.payouts.winMultiplier ?? 1,
            pushReturn: settings.payouts.pushReturn ?? 1
          });
        }
        if (settings?.payouts?.crypto) {
          setCrypto({
            autoApprovalThreshold: settings.payouts.crypto.autoApprovalThreshold,
            manualReviewThreshold: settings.payouts.crypto.manualReviewThreshold,
            urgentFeePercent: settings.payouts.crypto.urgentFeePercent,
            allowUrgent: settings.payouts.crypto.allowUrgent,
            batchHourUtc: settings.payouts.crypto.batchHourUtc,
            cutoffHourUtc: settings.payouts.crypto.cutoffHourUtc
          });
        }
        if (settings?.commission?.withdraw) {
          setCommissionWithdraw({
            cryptomusPlatformPercent: settings.commission.withdraw.cryptomus.platformPercent,
            cryptomusProviderPercent: settings.commission.withdraw.cryptomus.providerPercent,
            telegramPlatformPercent: settings.commission.withdraw.telegram_stars.platformPercent,
            telegramProviderPercent: settings.commission.withdraw.telegram_stars.providerPercent
          });
        }
        if (settings?.gameplay) {
          setGameplay({
            deckCount: settings.gameplay.deckCount ?? 6,
            dealerHitsSoft17: Boolean(settings.gameplay.dealerHitsSoft17)
          });
        }
        if (settings?.transparency) {
          setTransparency({
            targetRtpPercent: settings.transparency.targetRtpPercent ?? 97.5,
            reportWindowSize: settings.transparency.reportWindowSize ?? 5000
          });
        }
      } catch (err) {
        setError(err.message || 'Не удалось загрузить настройки');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [api]);

  const handleSaveDemo = async event => {
    event.preventDefault();
    if (!api) {
      return;
    }
    try {
      setError('');
      await api.updateSettings({
        demo: {
          enabled: Boolean(demo.enabled),
          defaultBalance: Number(demo.defaultBalance),
          topUpThreshold: Number(demo.topUpThreshold),
          allowPlayerOverrides: Boolean(demo.allowPlayerOverrides)
        }
      });
      showMessage('Настройки демо сохранены');
    } catch (err) {
      setError(err.message || 'Не удалось сохранить демо настройки');
    }
  };

  const handleSavePayouts = async event => {
    event.preventDefault();
    if (!api) {
      return;
    }
    try {
      setError('');
      await api.updateSettings({
        payouts: buildPayoutsPayload()
      });
      showMessage('Параметры выплат сохранены');
    } catch (err) {
      setError(err.message || 'Не удалось сохранить параметры выплат');
    }
  };

  const handleSaveCrypto = async event => {
    event.preventDefault();
    if (!api) {
      return;
    }
    try {
      setError('');
      await api.updateSettings({
        payouts: buildPayoutsPayload()
      });
      showMessage('Настройки Cryptomus обновлены');
    } catch (err) {
      setError(err.message || 'Не удалось сохранить настройки Cryptomus');
    }
  };

  const handleSaveCommission = async event => {
    event.preventDefault();
    if (!api) {
      return;
    }
    try {
      setError('');
      await api.updateSettings({
        commission: {
          withdraw: {
            cryptomus: {
              platformPercent: Number(commissionWithdraw.cryptomusPlatformPercent),
              providerPercent: Number(commissionWithdraw.cryptomusProviderPercent)
            },
            telegram_stars: {
              platformPercent: Number(commissionWithdraw.telegramPlatformPercent),
              providerPercent: Number(commissionWithdraw.telegramProviderPercent)
            }
          }
        }
      });
      showMessage('Комиссии сохранены');
    } catch (err) {
      setError(err.message || 'Не удалось сохранить комиссии');
    }
  };

  const handleSaveGameplay = async event => {
    event.preventDefault();
    if (!api) {
      return;
    }
    try {
      setError('');
      await api.updateSettings({
        gameplay: {
          deckCount: Number(gameplay.deckCount),
          dealerHitsSoft17: Boolean(gameplay.dealerHitsSoft17)
        }
      });
      showMessage('Правила стола сохранены');
    } catch (err) {
      setError(err.message || 'Не удалось сохранить правила стола');
    }
  };

  const handleSaveTransparency = async event => {
    event.preventDefault();
    if (!api) {
      return;
    }
    try {
      setError('');
      await api.updateSettings({
        transparency: {
          targetRtpPercent: Number(transparency.targetRtpPercent),
          reportWindowSize: Number(transparency.reportWindowSize)
        }
      });
      showMessage('Параметры прозрачности обновлены');
    } catch (err) {
      setError(err.message || 'Не удалось сохранить параметры прозрачности');
    }
  };

  const disabled = loading;

  return (
    <div className="flex-col gap-15">
      {message && <div className="alert success">{message}</div>}
      {error && <div className="alert error">{error}</div>}

      <section className="card">
        <h2>Разрешённые хосты для KYC</h2>
        {loading ? (
          <p>Загрузка…</p>
        ) : (
          <ul className="list-none">
            {verificationHosts.length === 0 && <li className="opacity-70">Список пуст. Укажите переменную окружения VERIFICATION_ALLOWED_HOSTS.</li>}
            {verificationHosts.map(host => (
              <li key={host}>{host}</li>
            ))}
          </ul>
        )}
      </section>

      <form className="card" onSubmit={handleSaveDemo}>
        <h2>Демо кошелёк</h2>
        <div className="flex-row flex-wrap gap-1">
          <label>
            Включено
            <select value={String(demo.enabled)} onChange={event => setDemo(prev => ({ ...prev, enabled: event.target.value === 'true' }))} disabled={disabled}>
              <option value="true">Да</option>
              <option value="false">Нет</option>
            </select>
          </label>
          <label>
            Стартовый баланс
            <input type="number" min="0" step="1" value={demo.defaultBalance} onChange={event => setDemo(prev => ({ ...prev, defaultBalance: event.target.value }))} disabled={disabled} />
          </label>
          <label>
            Порог автопополнения
            <input type="number" min="0" step="1" value={demo.topUpThreshold} onChange={event => setDemo(prev => ({ ...prev, topUpThreshold: event.target.value }))} disabled={disabled} />
          </label>
          <label>
            Игроки могут менять настройки
            <select value={String(demo.allowPlayerOverrides)} onChange={event => setDemo(prev => ({ ...prev, allowPlayerOverrides: event.target.value === 'true' }))} disabled={disabled}>
              <option value="true">Да</option>
              <option value="false">Нет</option>
            </select>
          </label>
        </div>
        <div className="flex-row justify-end">
          <button className="primary" type="submit" disabled={disabled}>Сохранить</button>
        </div>
      </form>

      <form className="card" onSubmit={handleSavePayouts}>
        <h2>Выплаты (основная игра)</h2>
        <div className="flex-row flex-wrap gap-1">
          <label>
            Блэкджек · множитель
            <input
              type="number"
              min="1"
              step="0.1"
              value={payouts.blackjackMultiplier}
              onChange={event => setPayouts(prev => ({ ...prev, blackjackMultiplier: event.target.value }))}
              disabled={disabled}
            />
          </label>
          <label>
            Победа · множитель
            <input
              type="number"
              min="1"
              step="0.1"
              value={payouts.winMultiplier}
              onChange={event => setPayouts(prev => ({ ...prev, winMultiplier: event.target.value }))}
              disabled={disabled}
            />
          </label>
          <label>
            Возврат при ничье
            <input
              type="number"
              min="0"
              step="0.1"
              value={payouts.pushReturn}
              onChange={event => setPayouts(prev => ({ ...prev, pushReturn: event.target.value }))}
              disabled={disabled}
            />
          </label>
        </div>
        <div className="flex-row justify-end">
          <button className="primary" type="submit" disabled={disabled}>Сохранить</button>
        </div>
      </form>

      <form className="card" onSubmit={handleSaveCrypto}>
        <h2>Выплаты (Cryptomus)</h2>
        <div className="flex-row flex-wrap gap-1">
          <label>
            Автоапрув до, 💎
            <input type="number" min="0" step="1" value={crypto.autoApprovalThreshold} onChange={event => setCrypto(prev => ({ ...prev, autoApprovalThreshold: event.target.value }))} disabled={disabled} />
          </label>
          <label>
            Ручная проверка с, 💎
            <input type="number" min="0" step="1" value={crypto.manualReviewThreshold} onChange={event => setCrypto(prev => ({ ...prev, manualReviewThreshold: event.target.value }))} disabled={disabled} />
          </label>
          <label>
            Доп. комиссия за срочность
            <input type="number" min="0" step="0.001" value={crypto.urgentFeePercent} onChange={event => setCrypto(prev => ({ ...prev, urgentFeePercent: event.target.value }))} disabled={disabled} />
          </label>
          <label>
            Разрешить срочные
            <select value={String(crypto.allowUrgent)} onChange={event => setCrypto(prev => ({ ...prev, allowUrgent: event.target.value === 'true' }))} disabled={disabled}>
              <option value="true">Да</option>
              <option value="false">Нет</option>
            </select>
          </label>
          <label>
            Cutoff час (UTC)
            <input type="number" min="0" max="23" value={crypto.cutoffHourUtc} onChange={event => setCrypto(prev => ({ ...prev, cutoffHourUtc: event.target.value }))} disabled={disabled} />
          </label>
          <label>
            Батч час (UTC)
            <input type="number" min="0" max="23" value={crypto.batchHourUtc} onChange={event => setCrypto(prev => ({ ...prev, batchHourUtc: event.target.value }))} disabled={disabled} />
          </label>
        </div>
        <div className="flex-row justify-end">
          <button className="primary" type="submit" disabled={disabled}>Сохранить</button>
        </div>
      </form>

      <form className="card" onSubmit={handleSaveCommission}>
        <h2>Комиссии на вывод</h2>
        <div className="flex-row flex-wrap gap-1">
          <label>
            Cryptomus · платформа
            <input type="number" min="0" step="0.001" value={commissionWithdraw.cryptomusPlatformPercent} onChange={event => setCommissionWithdraw(prev => ({ ...prev, cryptomusPlatformPercent: event.target.value }))} disabled={disabled} />
          </label>
          <label>
            Cryptomus · провайдер
            <input type="number" min="0" step="0.001" value={commissionWithdraw.cryptomusProviderPercent} onChange={event => setCommissionWithdraw(prev => ({ ...prev, cryptomusProviderPercent: event.target.value }))} disabled={disabled} />
          </label>
          <label>
            Telegram Stars · платформа
            <input type="number" min="0" step="0.001" value={commissionWithdraw.telegramPlatformPercent} onChange={event => setCommissionWithdraw(prev => ({ ...prev, telegramPlatformPercent: event.target.value }))} disabled={disabled} />
          </label>
          <label>
            Telegram Stars · провайдер
            <input type="number" min="0" step="0.001" value={commissionWithdraw.telegramProviderPercent} onChange={event => setCommissionWithdraw(prev => ({ ...prev, telegramProviderPercent: event.target.value }))} disabled={disabled} />
          </label>
        </div>
        <div className="flex-row justify-end">
          <button className="primary" type="submit" disabled={disabled}>Сохранить</button>
        </div>
      </form>

      <form className="card" onSubmit={handleSaveGameplay}>
        <h2>Правила стола</h2>
        <div className="flex-row flex-wrap gap-1">
          <label>
            Количество колод
            <input
              type="number"
              min="1"
              max="8"
              step="1"
              value={gameplay.deckCount}
              onChange={event => setGameplay(prev => ({ ...prev, deckCount: event.target.value }))}
              disabled={disabled}
            />
          </label>
          <label>
            Дилер берёт на soft 17
            <select
              value={String(gameplay.dealerHitsSoft17)}
              onChange={event => setGameplay(prev => ({ ...prev, dealerHitsSoft17: event.target.value === 'true' }))}
              disabled={disabled}
            >
              <option value="false">Нет</option>
              <option value="true">Да</option>
            </select>
          </label>
        </div>
        <div className="flex-row justify-end">
          <button className="primary" type="submit" disabled={disabled}>Сохранить</button>
        </div>
      </form>

      <form className="card" onSubmit={handleSaveTransparency}>
        <h2>Прозрачность RTP</h2>
        <div className="flex-row flex-wrap gap-1">
          <label>
            Целевой RTP, %
            <input
              type="number"
              min="80"
              max="100"
              step="0.1"
              value={transparency.targetRtpPercent}
              onChange={event => setTransparency(prev => ({ ...prev, targetRtpPercent: event.target.value }))}
              disabled={disabled}
            />
          </label>
          <label>
            Окно отчёта (раундов)
            <input
              type="number"
              min="100"
              step="100"
              value={transparency.reportWindowSize}
              onChange={event => setTransparency(prev => ({ ...prev, reportWindowSize: event.target.value }))}
              disabled={disabled}
            />
          </label>
        </div>
        <div className="flex-row justify-end">
          <button className="primary" type="submit" disabled={disabled}>Сохранить</button>
        </div>
      </form>
    </div>
  );
};

export default AdminSettingsPage;
