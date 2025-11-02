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
    <div className="flex-col gap-15">
      <section className="card">
        <form onSubmit={handleSearch} className="flex-row flex-wrap gap-1">
          <label className="flex-basis-240">
            Поиск по Telegram ID / username
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="12345 или @nickname" />
          </label>
          <button className="primary" type="submit" disabled={loading}>Найти</button>
          <button type="button" onClick={loadPlayers} disabled={loading}>Сбросить</button>
        </form>
        {error && <div className="alert error mt-1">{error}</div>}
        {toast && <div className="alert success mt-1">{toast}</div>}
      </section>

      <div className="flex-row flex-wrap align-start gap-15">
        <section className="card flex-basis-340 max-w-420">
          <h2>Игроки ({players.length})</h2>
          <div className="max-h-520">
            {loading && <p>Загрузка…</p>}
            {!loading && players.length === 0 && <p className="opacity-70">Нет игроков.</p>}
            <ul className="list-none flex-col gap-05">
              {players.map(player => (
                <li key={player.telegram_id || player.id}>
                  <button
                    onClick={() => loadDetail(player.telegram_id)}
                    className={`btn-player-item ${selected === player.telegram_id ? 'selected' : ''}`}
                  >
                    <strong>{player.telegram_id}</strong>
                    <div className="text-085 opacity-80">
                      @{player.username || '—'} · Баланс: {Number(player.balance || 0).toFixed(2)} · {player.status}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="card flex-basis-480">
          {!selected && <p className="opacity-75">Выберите игрока для просмотра подробностей.</p>}
          {detailLoading && <p>Загрузка данных игрока…</p>}
          {detail && !detailLoading && (
            <div className="flex-col gap-125">
              <header>
                <h2 className="mb-025">{detail.player.telegram_id}</h2>
                <div className="opacity-75">
                  @{detail.player.username || '—'} · статус {detail.player.status} · верификация {detail.player.verification_status || 'unverified'}
                </div>
                <div className="flex-row flex-wrap mt-075 gap-15">
                  <div><strong>Баланс:</strong> {Number(detail.player.balance || 0).toFixed(2)}</div>
                  <div><strong>Демо:</strong> {Number(detail.player.demo_balance || 0).toFixed(2)}</div>
                  <div><strong>Создан:</strong> {detail.player.created_at ? new Date(detail.player.created_at).toLocaleString() : '—'}</div>
                </div>
              </header>

              {stats && (
                <div className="card bg-card-dark">
                  <h3>Статистика</h3>
                  <div className="flex-row flex-wrap gap-15">
                    <div>
                      <strong>Реал</strong>
                      <ul className="list-none">
                        <li>Игр: {stats.totalGames}</li>
                        <li>Побед: {stats.wins}</li>
                        <li>Поражений: {stats.losses}</li>
                        <li>Блэкджеков: {stats.blackjacks}</li>
                        <li>Net P&L: {Number(stats.netProfit || 0).toFixed(2)}</li>
                      </ul>
                    </div>
                    <div>
                      <strong>Демо</strong>
                      <ul className="list-none">
                        <li>Игр: {stats.wallets?.demo?.totalGames || 0}</li>
                        <li>Побед: {stats.wallets?.demo?.wins || 0}</li>
                        <li>Поражений: {stats.wallets?.demo?.losses || 0}</li>
                        <li>Net P&L: {Number(stats.wallets?.demo?.netProfit || 0).toFixed(2)}</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              <form className="card bg-card-dark" onSubmit={handleAdjustSubmit}>
                <h3>Корректировка баланса</h3>
                <div className="flex-row flex-wrap gap-1">
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
                  <label className="flex-basis-200">
                    Причина (лог)
                    <input value={adjustForm.reason} onChange={event => setAdjustForm(prev => ({ ...prev, reason: event.target.value }))} placeholder="admin_manual_adjust" />
                  </label>
                  <div className="flex-row justify-end w-full">
                    <button className="primary" type="submit">Сохранить</button>
                  </div>
                </div>
              </form>

              <form className="card bg-card-dark" onSubmit={handleSetBalance}>
                <h3>Установить точный баланс</h3>
                <div className="flex-row flex-wrap align-end gap-1">
                  <label>
                    Баланс
                    <input type="number" min="0" step="0.01" value={balanceForm.balance} onChange={event => setBalanceForm({ balance: event.target.value })} required />
                  </label>
                  <button className="primary" type="submit">Обновить</button>
                </div>
              </form>

              <form className="card bg-card-dark" onSubmit={handleUpdateStatus}>
                <h3>Статус игрока</h3>
                <div className="flex-row flex-wrap align-end gap-1">
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

              <form className="card bg-card-dark" onSubmit={handleResetDemo}>
                <h3>Сброс демо баланса</h3>
                <div className="flex-row flex-wrap align-end gap-1">
                  <label>
                    Целевой баланс
                    <input type="number" min="0" step="1" value={demoResetTarget} onChange={event => setDemoResetTarget(event.target.value)} placeholder="оставьте пустым для дефолта" />
                  </label>
                  <button className="primary" type="submit">Сбросить</button>
                </div>
              </form>

              <form className="card bg-card-dark" onSubmit={handleSaveDemoSettings}>
                <h3>Индивидуальные настройки демо</h3>
                <div className="flex-row flex-wrap gap-1">
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
                <div className="flex-row justify-end gap-075">
                  <button type="button" onClick={handleClearDemoSettings}>Удалить кастомизацию</button>
                  <button className="primary" type="submit">Сохранить</button>
                </div>
              </form>

              <section className="card bg-card-dark">
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
                          <td colSpan={4} className="table-cell-empty opacity-70">Активных событий нет</td>
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
