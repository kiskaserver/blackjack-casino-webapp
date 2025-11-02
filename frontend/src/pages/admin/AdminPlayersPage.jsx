import { useEffect, useState } from 'react';
import { useAdmin } from '../../providers/AdminProvider.jsx';

const statusOptions = [
  { value: 'active', label: 'Активен' },
  { value: 'suspended', label: 'Заморожен' },
  { value: 'limited', label: 'Ограничен' },
  { value: 'verified', label: 'Верифицирован' },
  { value: 'banned', label: 'Заблокирован' }
];

const AdminPlayersPage = () => {
  const { api } = useAdmin();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [adjustForm, setAdjustForm] = useState({ amount: '', walletType: 'real', reason: '' });
  const [balanceForm, setBalanceForm] = useState({ balance: '' });
  const [demoResetTarget, setDemoResetTarget] = useState('');
  const [demoSettingsForm, setDemoSettingsForm] = useState({ enabled: true, initialBalance: '', topupThreshold: '' });
  const [statusForm, setStatusForm] = useState('active');

  const showToast = message => {
    setToast(message);
    window.setTimeout(() => setToast(''), 4000);
  };

  const loadPlayers = async () => {
    if (!api) {
      return;
    }
    setLoading(true);
    setError('');
    try {
      const list = await api.listPlayers({ limit: 50 });
      setPlayers(list || []);
    } catch (err) {
      setError(err.message || 'Не удалось загрузить игроков');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlayers();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = async event => {
    event.preventDefault();
    if (!api) {
      return;
    }
    const query = search.trim();
    if (!query) {
      await loadPlayers();
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await api.searchPlayers({ q: query, limit: 50 });
      setPlayers(result || []);
    } catch (err) {
      setError(err.message || 'Ошибка поиска');
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async telegramId => {
    if (!api || !telegramId) {
      return;
    }
    setSelected(telegramId);
    setDetail(null);
    setDetailLoading(true);
    setError('');
    try {
      const info = await api.getPlayerByTelegramId(telegramId);
      setDetail(info);
      setStatusForm(info?.player?.status || 'active');
      setDemoSettingsForm({
        enabled: info?.playerSettings?.demo_enabled ?? info?.playerSettings?.demoEnabled ?? info?.player?.demo_enabled ?? true,
        initialBalance: info?.playerSettings?.demo_initial_balance ?? info?.playerSettings?.demoInitialBalance ?? '',
        topupThreshold: info?.playerSettings?.demo_topup_threshold ?? info?.playerSettings?.demoTopupThreshold ?? ''
      });
    } catch (err) {
      setError(err.message || 'Не удалось загрузить данные игрока');
    } finally {
      setDetailLoading(false);
    }
  };

  const refreshSelected = async () => {
    if (selected) {
      await loadDetail(selected);
    }
  };

  const handleAdjustSubmit = async event => {
    event.preventDefault();
    if (!api || !selected) {
      return;
    }
    try {
      setError('');
      const numericAmount = Number(adjustForm.amount);
      if (!Number.isFinite(numericAmount) || numericAmount === 0) {
        throw new Error('Введите ненулевую сумму');
      }
      await api.adjustBalance(selected, {
        amount: numericAmount,
        walletType: adjustForm.walletType,
        reason: adjustForm.reason || undefined
      });
      showToast('Баланс скорректирован');
      setAdjustForm({ amount: '', walletType: adjustForm.walletType, reason: '' });
      await refreshSelected();
    } catch (err) {
      setError(err.message || 'Не удалось скорректировать баланс');
    }
  };

  const handleSetBalance = async event => {
    event.preventDefault();
    if (!api || !selected) {
      return;
    }
    try {
      setError('');
      const target = Number(balanceForm.balance);
      if (!Number.isFinite(target) || target < 0) {
        throw new Error('Баланс должен быть неотрицательным числом');
      }
      await api.setBalance(selected, { balance: target });
      showToast('Баланс установлен');
      setBalanceForm({ balance: '' });
      await refreshSelected();
    } catch (err) {
      setError(err.message || 'Не удалось обновить баланс');
    }
  };

  const handleUpdateStatus = async event => {
    event.preventDefault();
    if (!api || !selected) {
      return;
    }
    try {
      setError('');
      await api.updateStatus(selected, { status: statusForm });
      showToast('Статус обновлён');
      await refreshSelected();
    } catch (err) {
      setError(err.message || 'Не удалось обновить статус');
    }
  };

  const handleResetDemo = async event => {
    event.preventDefault();
    if (!api || !selected) {
      return;
    }
    try {
      setError('');
      const payload = demoResetTarget ? Number(demoResetTarget) : undefined;
      await api.resetDemoBalance(selected, { targetBalance: payload });
      showToast('Демо баланс обновлён');
      setDemoResetTarget('');
      await refreshSelected();
    } catch (err) {
      setError(err.message || 'Не удалось обновить демо баланс');
    }
  };

  const handleSaveDemoSettings = async event => {
    event.preventDefault();
    if (!api || !selected) {
      return;
    }
    try {
      setError('');
      await api.saveDemoSettings(selected, {
        enabled: Boolean(demoSettingsForm.enabled),
        initialBalance: demoSettingsForm.initialBalance === '' ? undefined : Number(demoSettingsForm.initialBalance),
        topupThreshold: demoSettingsForm.topupThreshold === '' ? undefined : Number(demoSettingsForm.topupThreshold)
      });
      showToast('Настройки демо сохранены');
      await refreshSelected();
    } catch (err) {
      setError(err.message || 'Не удалось сохранить настройки демо');
    }
  };

  const handleClearDemoSettings = async () => {
    if (!api || !selected) {
      return;
    }
    try {
      setError('');
      await api.clearDemoSettings(selected);
      showToast('Индивидуальные настройки демо удалены');
      await refreshSelected();
    } catch (err) {
      setError(err.message || 'Не удалось удалить настройки');
    }
  };

  const stats = detail?.stats;
  const riskEvents = detail?.riskEvents || [];

  return (
    <div className="flex-col" style={{ gap: '1.5rem' }}>
      <section className="card">
        <form onSubmit={handleSearch} className="flex-row" style={{ gap: '1rem', flexWrap: 'wrap' }}>
          <label style={{ flex: '1 1 240px' }}>
            Поиск по Telegram ID / username
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="12345 или @nickname" />
          </label>
          <button className="primary" type="submit" disabled={loading}>Найти</button>
          <button type="button" onClick={loadPlayers} disabled={loading}>Сбросить</button>
        </form>
        {error && <div className="alert error" style={{ marginTop: '1rem' }}>{error}</div>}
        {toast && <div className="alert success" style={{ marginTop: '1rem' }}>{toast}</div>}
      </section>

      <div className="flex-row" style={{ gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <section className="card" style={{ flex: '1 1 340px', maxWidth: 420 }}>
          <h2>Игроки ({players.length})</h2>
          <div style={{ maxHeight: 520, overflowY: 'auto' }}>
            {loading && <p>Загрузка…</p>}
            {!loading && players.length === 0 && <p style={{ opacity: 0.7 }}>Нет игроков.</p>}
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {players.map(player => (
                <li key={player.telegram_id || player.id}>
                  <button
                    onClick={() => loadDetail(player.telegram_id)}
                    style={{
                      width: '100%',
                      background: selected === player.telegram_id ? 'rgba(59,130,246,0.25)' : 'rgba(15,23,42,0.6)',
                      border: '1px solid rgba(59,130,246,0.35)',
                      borderRadius: 8,
                      padding: '0.6rem 0.8rem',
                      textAlign: 'left'
                    }}
                  >
                    <strong>{player.telegram_id}</strong>
                    <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                      @{player.username || '—'} · Баланс: {Number(player.balance || 0).toFixed(2)} · {player.status}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="card" style={{ flex: '2 1 480px' }}>
          {!selected && <p style={{ opacity: 0.75 }}>Выберите игрока для просмотра подробностей.</p>}
          {detailLoading && <p>Загрузка данных игрока…</p>}
          {detail && !detailLoading && (
            <div className="flex-col" style={{ gap: '1.25rem' }}>
              <header>
                <h2 style={{ marginBottom: '0.25rem' }}>{detail.player.telegram_id}</h2>
                <div style={{ opacity: 0.75 }}>
                  @{detail.player.username || '—'} · статус {detail.player.status} · верификация {detail.player.verification_status || 'unverified'}
                </div>
                <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                  <div><strong>Баланс:</strong> {Number(detail.player.balance || 0).toFixed(2)}</div>
                  <div><strong>Демо:</strong> {Number(detail.player.demo_balance || 0).toFixed(2)}</div>
                  <div><strong>Создан:</strong> {detail.player.created_at ? new Date(detail.player.created_at).toLocaleString() : '—'}</div>
                </div>
              </header>

              {stats && (
                <div className="card" style={{ background: 'rgba(30,41,59,0.6)' }}>
                  <h3>Статистика</h3>
                  <div className="flex-row" style={{ gap: '1.5rem', flexWrap: 'wrap' }}>
                    <div>
                      <strong>Реал</strong>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        <li>Игр: {stats.totalGames}</li>
                        <li>Побед: {stats.wins}</li>
                        <li>Поражений: {stats.losses}</li>
                        <li>Блэкджеков: {stats.blackjacks}</li>
                        <li>Net P&L: {Number(stats.netProfit || 0).toFixed(2)}</li>
                      </ul>
                    </div>
                    <div>
                      <strong>Демо</strong>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        <li>Игр: {stats.wallets?.demo?.totalGames || 0}</li>
                        <li>Побед: {stats.wallets?.demo?.wins || 0}</li>
                        <li>Поражений: {stats.wallets?.demo?.losses || 0}</li>
                        <li>Net P&L: {Number(stats.wallets?.demo?.netProfit || 0).toFixed(2)}</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              <form className="card" onSubmit={handleAdjustSubmit} style={{ background: 'rgba(30,41,59,0.6)' }}>
                <h3>Корректировка баланса</h3>
                <div className="flex-row" style={{ gap: '1rem', flexWrap: 'wrap' }}>
                  <label>
                    Сумма
                    <input type="number" step="0.01" value={adjustForm.amount} onChange={event => setAdjustForm(prev => ({ ...prev, amount: event.target.value }))} required />
                  </label>
                  <label>
                    Кошелёк
                    <select value={adjustForm.walletType} onChange={event => setAdjustForm(prev => ({ ...prev, walletType: event.target.value }))}>
                      <option value="real">Реальный</option>
                      <option value="demo">Демо</option>
                    </select>
                  </label>
                  <label style={{ flex: '1 1 200px' }}>
                    Причина (лог)
                    <input value={adjustForm.reason} onChange={event => setAdjustForm(prev => ({ ...prev, reason: event.target.value }))} placeholder="admin_manual_adjust" />
                  </label>
                  <div className="flex-row" style={{ justifyContent: 'flex-end', width: '100%' }}>
                    <button className="primary" type="submit">Сохранить</button>
                  </div>
                </div>
              </form>

              <form className="card" onSubmit={handleSetBalance} style={{ background: 'rgba(30,41,59,0.6)' }}>
                <h3>Установить точный баланс</h3>
                <div className="flex-row" style={{ gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <label>
                    Баланс
                    <input type="number" min="0" step="0.01" value={balanceForm.balance} onChange={event => setBalanceForm({ balance: event.target.value })} required />
                  </label>
                  <button className="primary" type="submit">Обновить</button>
                </div>
              </form>

              <form className="card" onSubmit={handleUpdateStatus} style={{ background: 'rgba(30,41,59,0.6)' }}>
                <h3>Статус игрока</h3>
                <div className="flex-row" style={{ gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <label>
                    Статус
                    <select value={statusForm} onChange={event => setStatusForm(event.target.value)}>
                      {statusOptions.map(option => (
                        <option value={option.value} key={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <button className="primary" type="submit">Сохранить</button>
                </div>
              </form>

              <form className="card" onSubmit={handleResetDemo} style={{ background: 'rgba(30,41,59,0.6)' }}>
                <h3>Сброс демо баланса</h3>
                <div className="flex-row" style={{ gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <label>
                    Целевой баланс
                    <input type="number" min="0" step="1" value={demoResetTarget} onChange={event => setDemoResetTarget(event.target.value)} placeholder="оставьте пустым для дефолта" />
                  </label>
                  <button className="primary" type="submit">Сбросить</button>
                </div>
              </form>

              <form className="card" onSubmit={handleSaveDemoSettings} style={{ background: 'rgba(30,41,59,0.6)' }}>
                <h3>Индивидуальные настройки демо</h3>
                <div className="flex-row" style={{ gap: '1rem', flexWrap: 'wrap' }}>
                  <label>
                    Включено
                    <select value={String(demoSettingsForm.enabled)} onChange={event => setDemoSettingsForm(prev => ({ ...prev, enabled: event.target.value === 'true' }))}>
                      <option value="true">Да</option>
                      <option value="false">Нет</option>
                    </select>
                  </label>
                  <label>
                    Стартовый баланс
                    <input type="number" min="0" step="1" value={demoSettingsForm.initialBalance} onChange={event => setDemoSettingsForm(prev => ({ ...prev, initialBalance: event.target.value }))} placeholder="по умолчанию" />
                  </label>
                  <label>
                    Порог автопополнения
                    <input type="number" min="0" step="1" value={demoSettingsForm.topupThreshold} onChange={event => setDemoSettingsForm(prev => ({ ...prev, topupThreshold: event.target.value }))} placeholder="по умолчанию" />
                  </label>
                </div>
                <div className="flex-row" style={{ justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button type="button" onClick={handleClearDemoSettings}>Удалить кастомизацию</button>
                  <button className="primary" type="submit">Сохранить</button>
                </div>
              </form>

              <section className="card" style={{ background: 'rgba(30,41,59,0.6)' }}>
                <h3>Риск-события ({riskEvents.length})</h3>
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Тип</th>
                        <th>Серьёзность</th>
                        <th>Создано</th>
                      </tr>
                    </thead>
                    <tbody>
                      {riskEvents.length === 0 && (
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'center', opacity: 0.7 }}>Активных событий нет</td>
                        </tr>
                      )}
                      {riskEvents.map(event => (
                        <tr key={event.id}>
                          <td>{event.id}</td>
                          <td>{event.event_type || event.type}</td>
                          <td>{event.severity}</td>
                          <td>{event.created_at ? new Date(event.created_at).toLocaleString() : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default AdminPlayersPage;
