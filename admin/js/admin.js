const API_BASE = '/api/admin';

const state = {
  adminId: '',
  adminSecret: '',
  connected: false,
  settings: null
};

const adminIdInput = document.getElementById('adminId');
const passwordInput = document.getElementById('adminPassword');
const connectButton = document.getElementById('connectButton');
const overviewSection = document.getElementById('overview');
const transactionsSection = document.getElementById('transactions');
const playerLookupSection = document.getElementById('playerLookup');
const settingsSection = document.getElementById('settings');
const withdrawalsSection = document.getElementById('withdrawals');
const playersSection = document.getElementById('playersSection');
const overviewGrid = document.getElementById('overviewGrid');
const transactionsBody = document.getElementById('transactionsBody');
const lookupButton = document.getElementById('lookupButton');
const lookupTelegramId = document.getElementById('lookupTelegramId');
const playerDetails = document.getElementById('playerDetails');
const houseMode = document.getElementById('houseMode');
const houseRigProbability = document.getElementById('houseRigProbability');
const saveSettingsButton = document.getElementById('saveSettingsButton');
const feesTable = document.getElementById('feesTable');
const saveFeesButton = document.getElementById('saveFeesButton');
const withdrawalsBody = document.getElementById('withdrawalsBody');
const playersBody = document.getElementById('playersBody');

const sections = [
  overviewSection,
  transactionsSection,
  playerLookupSection,
  settingsSection,
  withdrawalsSection,
  playersSection
];

const toggleSections = visible => {
  sections.forEach(section => {
    if (!section) return;
    section.classList.toggle('hidden', !visible);
  });
};

toggleSections(false);

const setConnectLoading = isLoading => {
  if (!connectButton) return;
  connectButton.disabled = isLoading;
  connectButton.textContent = isLoading ? 'Подключаюсь...' : 'Подключиться';
};

const escapeHtml = value => {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const formatCurrency = value => {
  const number = Number(value || 0);
  return number.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const formatMethod = method => {
  switch (method) {
    case 'cryptomus':
      return 'Cryptomus';
    case 'telegram_stars':
      return 'Telegram Stars';
    default:
      return method;
  }
};

const formatStatus = status => {
  switch (status) {
    case 'pending':
      return 'В ожидании';
    case 'approved':
      return 'Одобрено';
    case 'rejected':
      return 'Отклонено';
    case 'paid':
      return 'Выплачено';
    default:
      return status;
  }
};

const formatWallet = wallet => (wallet === 'demo' ? 'Демо' : 'Реал');

// Centralised fetch helper that applies admin headers and unified error handling.
const request = async (path, options = {}) => {
  if (!state.adminId || !state.adminSecret) {
    throw new Error('Укажите ID администратора и пароль');
  }

  const { method = 'GET', body, headers } = options;
  const fetchOptions = {
    method,
    headers: new Headers(headers || {})
  };

  fetchOptions.headers.set('X-Admin-Id', state.adminId);
  fetchOptions.headers.set('X-Admin-Secret', state.adminSecret);

  if (body !== undefined) {
    fetchOptions.headers.set('Content-Type', 'application/json');
    fetchOptions.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${path}`, fetchOptions);
  let payload = null;

  try {
    payload = await response.json();
  } catch (error) {
    payload = null;
  }

  if (!response.ok || !payload?.success) {
    const message = payload?.error || response.statusText || 'Запрос завершился ошибкой';
    throw new Error(message);
  }

  return payload.data;
};

const renderOverview = stats => {
  if (!overviewGrid) return;
  const data = stats || {};
  overviewGrid.innerHTML = '';

  const metrics = [
    { label: 'Игроков', value: data.players || 0 },
    { label: 'Раундов (реал)', value: data.rounds || 0 },
    { label: 'Раундов (демо)', value: data.demo_rounds || 0 },
    { label: 'Ставки (реал)', value: formatCurrency(data.total_bet || 0) },
    { label: 'Ставки (демо)', value: formatCurrency(data.demo_total_bet || 0) },
    { label: 'Выплачено (реал)', value: formatCurrency(data.total_paid || 0) },
    { label: 'Выплачено (демо)', value: formatCurrency(data.demo_total_paid || 0) },
    { label: 'Депозиты', value: formatCurrency(data.total_deposit || 0) },
    { label: 'Выводы', value: formatCurrency(data.total_withdraw || 0) }
  ];

  metrics.forEach(metric => {
    const div = document.createElement('div');
    div.className = 'stat-tile';
    div.innerHTML = `
      <div class="label">${metric.label}</div>
      <div class="value">${metric.value}</div>
    `;
    overviewGrid.appendChild(div);
  });
};

const renderTransactions = rows => {
  if (!transactionsBody) return;
  transactionsBody.innerHTML = '';
  (rows || []).forEach(row => {
    const tr = document.createElement('tr');
    const amount = Number(row.amount || 0);
    const color = amount >= 0 ? '#00ff88' : '#f87171';
    tr.innerHTML = `
      <td>${new Date(row.created_at).toLocaleString()}</td>
      <td>${escapeHtml(row.username || row.telegram_id)}</td>
      <td style="color:${color}">${formatCurrency(amount)}</td>
      <td>${escapeHtml(formatWallet(row.wallet_type))}</td>
      <td>${escapeHtml(row.reason)}</td>
      <td>${escapeHtml(row.reference_id || '')}</td>
    `;
    transactionsBody.appendChild(tr);
  });
};

const renderPlayerDetails = payload => {
  if (!playerDetails) return;
  if (!payload || !payload.player) {
    playerDetails.innerHTML = '<div>Игрок не найден</div>';
    return;
  }

  const { player, stats } = payload;
  playerDetails.innerHTML = `
    <div><strong>Игрок:</strong> ${escapeHtml(player.username || 'N/A')} (${escapeHtml(player.telegram_id)})</div>
    <div><strong>Баланс:</strong> ${formatCurrency(player.balance)}</div>
    <div><strong>Уровень:</strong> ${escapeHtml(player.level)}</div>
    <div><strong>Всего игр:</strong> ${stats.totalGames}</div>
    <div><strong>Победы:</strong> ${stats.wins}</div>
    <div><strong>Поражения:</strong> ${stats.losses}</div>
    <div><strong>Блэкджеков:</strong> ${stats.blackjacks}</div>
    <div><strong>Ничьи:</strong> ${stats.pushes}</div>
    <div><strong>Net P&amp;L:</strong> ${formatCurrency(stats.netProfit)}</div>
  `;
};

const renderSettings = settings => {
  state.settings = settings;
  if (settings?.house) {
    houseMode.value = settings.house.biasMode || 'fair';
    const rig = Number(settings.house.rigProbability || 0);
    houseRigProbability.value = (rig * 100).toFixed(0);
  }
  renderFees(settings?.commission || {});
};

const renderFees = commission => {
  if (!feesTable) return;
  feesTable.innerHTML = '';
  const depositConfig = commission.deposit || {};
  const withdrawConfig = commission.withdraw || {};
  const methods = Array.from(new Set([
    ...Object.keys(depositConfig),
    ...Object.keys(withdrawConfig)
  ]));

  methods.forEach(method => {
    const deposit = depositConfig[method] || {};
    const withdraw = withdrawConfig[method] || {};
    const tr = document.createElement('tr');
    tr.dataset.method = method;
    tr.innerHTML = `
      <td>${escapeHtml(formatMethod(method))}</td>
      <td><input type="number" step="0.01" min="0" data-scope="deposit" data-kind="platform" value="${(Number(deposit.platformPercent || 0) * 100).toFixed(2)}"></td>
      <td><input type="number" step="0.01" min="0" data-scope="deposit" data-kind="provider" value="${(Number(deposit.providerPercent || 0) * 100).toFixed(2)}"></td>
      <td><input type="number" step="0.01" min="0" data-scope="withdraw" data-kind="platform" value="${(Number(withdraw.platformPercent || 0) * 100).toFixed(2)}"></td>
      <td><input type="number" step="0.01" min="0" data-scope="withdraw" data-kind="provider" value="${(Number(withdraw.providerPercent || 0) * 100).toFixed(2)}"></td>
    `;
    feesTable.appendChild(tr);
  });
};

const buildCommissionPayload = () => {
  const rows = Array.from(feesTable.querySelectorAll('tr[data-method]'));
  const commission = { deposit: {}, withdraw: {} };

  rows.forEach(row => {
    const method = row.dataset.method;
    const inputs = row.querySelectorAll('input');
    inputs.forEach(input => {
      const scope = input.dataset.scope;
      const kind = input.dataset.kind;
      const raw = Number(input.value);
      if (!Number.isFinite(raw) || raw < 0) {
        throw new Error('Комиссия должна быть неотрицательным числом');
      }
      if (!commission[scope][method]) {
        commission[scope][method] = { platformPercent: 0, providerPercent: 0 };
      }
      if (kind === 'platform') {
        commission[scope][method].platformPercent = raw / 100;
      } else if (kind === 'provider') {
        commission[scope][method].providerPercent = raw / 100;
      }
    });
  });

  return { commission };
};

const renderWithdrawals = withdrawals => {
  if (!withdrawalsBody) return;
  withdrawalsBody.innerHTML = '';
  (withdrawals || []).forEach(withdrawal => {
    const tr = document.createElement('tr');
    tr.dataset.withdrawalId = withdrawal.id;
    const actions = [];

    if (withdrawal.status === 'pending') {
      actions.push('<button data-action="approve">Одобрить</button>');
      actions.push('<button data-action="reject">Отклонить</button>');
    } else if (withdrawal.status === 'approved') {
      actions.push('<button data-action="mark-paid">Пометить выплаченным</button>');
    }

    tr.innerHTML = `
      <td>${escapeHtml(withdrawal.id)}</td>
      <td>${escapeHtml(withdrawal.username || withdrawal.telegram_id)}</td>
      <td>${escapeHtml(formatMethod(withdrawal.method))}</td>
      <td>${formatCurrency(withdrawal.amount)}</td>
      <td>${formatCurrency(withdrawal.platform_fee)} / ${formatCurrency(withdrawal.provider_fee)}</td>
      <td>${escapeHtml(formatStatus(withdrawal.status))}</td>
      <td>${actions.join(' ') || '—'}</td>
    `;
    withdrawalsBody.appendChild(tr);
  });
};

const renderPlayers = players => {
  if (!playersBody) return;
  playersBody.innerHTML = '';
  (players || []).forEach(player => {
    const tr = document.createElement('tr');
    tr.dataset.telegramId = player.telegram_id;
    tr.innerHTML = `
      <td>${escapeHtml(player.telegram_id)}</td>
      <td>${escapeHtml(player.username || '')}</td>
      <td>${formatCurrency(player.balance)}</td>
      <td>${new Date(player.created_at).toLocaleString()}</td>
      <td>
        <button data-action="credit">+ Баланс</button>
        <button data-action="debit">- Баланс</button>
        <button data-action="override">Подкрутка</button>
        <button data-action="clear-override">Сброс</button>
      </td>
    `;
    playersBody.appendChild(tr);
  });
};

const loadOverview = async () => {
  const data = await request('/stats/overview');
  renderOverview(data);
};

const loadTransactions = async () => {
  const data = await request('/transactions/recent?limit=100');
  renderTransactions(data);
};

const loadSettings = async () => {
  const data = await request('/settings');
  renderSettings(data);
};

const loadWithdrawals = async () => {
  const data = await request('/withdrawals');
  renderWithdrawals(data);
};

const loadPlayers = async () => {
  const data = await request('/players?limit=100');
  renderPlayers(data);
};

const refreshAll = async () => {
  await Promise.all([
    loadOverview(),
    loadTransactions(),
    loadSettings(),
    loadWithdrawals(),
    loadPlayers()
  ]);
};

connectButton?.addEventListener('click', async () => {
  const adminId = adminIdInput?.value.trim();
  const adminSecret = passwordInput?.value.trim();

  if (!adminId || !adminSecret) {
    alert('Введите Telegram ID и пароль администратора');
    return;
  }

  state.adminId = adminId;
  state.adminSecret = adminSecret;

  setConnectLoading(true);

  try {
    await refreshAll();
    state.connected = true;
    toggleSections(true);
  } catch (error) {
    state.connected = false;
    toggleSections(false);
    alert(error.message);
  } finally {
    setConnectLoading(false);
  }
});

lookupButton?.addEventListener('click', async () => {
  const telegramId = lookupTelegramId?.value.trim();
  if (!telegramId) {
    alert('Введите Telegram ID');
    return;
  }

  try {
    const data = await request(`/stats/player/${telegramId}`);
    renderPlayerDetails(data);
  } catch (error) {
    alert(error.message);
  }
});

saveSettingsButton?.addEventListener('click', async () => {
  if (!state.settings) {
    alert('Настройки ещё не загружены');
    return;
  }

  const rigPercent = Number(houseRigProbability.value);
  if (!Number.isFinite(rigPercent) || rigPercent < 0 || rigPercent > 100) {
    alert('Вероятность вмешательства должна быть от 0 до 100');
    return;
  }

  try {
    await request('/settings', {
      method: 'PATCH',
      body: {
        house: {
          biasMode: houseMode.value,
          rigProbability: rigPercent / 100
        }
      }
    });
    await loadSettings();
    alert('Настройки сохранены');
  } catch (error) {
    alert(error.message);
  }
});

saveFeesButton?.addEventListener('click', async () => {
  try {
    const payload = buildCommissionPayload();
    await request('/settings', {
      method: 'PATCH',
      body: payload
    });
    await loadSettings();
    alert('Комиссии обновлены');
  } catch (error) {
    alert(error.message);
  }
});

withdrawalsBody?.addEventListener('click', async event => {
  const button = event.target.closest('button');
  if (!button) return;

  const row = button.closest('tr');
  const withdrawalId = row?.dataset.withdrawalId;
  if (!withdrawalId) return;

  let status = '';
  let note = undefined;

  if (button.dataset.action === 'approve') {
    status = 'approved';
  } else if (button.dataset.action === 'reject') {
    status = 'rejected';
    note = prompt('Причина отклонения?', '') || undefined;
  } else if (button.dataset.action === 'mark-paid') {
    status = 'paid';
  }

  if (!status) return;

  try {
    await request(`/withdrawals/${withdrawalId}/status`, {
      method: 'POST',
      body: { status, note }
    });
    await loadWithdrawals();
  } catch (error) {
    alert(error.message);
  }
});

playersBody?.addEventListener('click', async event => {
  const button = event.target.closest('button');
  if (!button) return;

  const row = button.closest('tr');
  const telegramId = row?.dataset.telegramId;
  if (!telegramId) return;

  try {
    if (button.dataset.action === 'credit' || button.dataset.action === 'debit') {
      const title = button.dataset.action === 'credit' ? 'Введите сумму начисления' : 'Введите сумму списания';
      const rawAmount = Number(prompt(title, '100'));
      if (!Number.isFinite(rawAmount) || rawAmount <= 0) {
        alert('Некорректная сумма');
        return;
      }
      const reason = prompt('Комментарий для журнала транзакций?', '') || undefined;
      const amount = button.dataset.action === 'credit' ? rawAmount : -rawAmount;
      await request(`/players/${telegramId}/adjust-balance`, {
        method: 'POST',
        body: { amount, reason }
      });
      await Promise.all([loadPlayers(), loadOverview(), loadTransactions()]);
    } else if (button.dataset.action === 'override') {
      const mode = (prompt('Режим подкрутки (fair / favor_house / favor_player)', 'favor_house') || '').trim();
      const allowed = ['fair', 'favor_house', 'favor_player'];
      if (!allowed.includes(mode)) {
        alert('Некорректный режим');
        return;
      }
      const rigRaw = Number(prompt('Вероятность вмешательства (0-100%)', '20'));
      if (!Number.isFinite(rigRaw) || rigRaw < 0 || rigRaw > 100) {
        alert('Некорректная вероятность');
        return;
      }
      await request(`/house-overrides/${telegramId}`, {
        method: 'PUT',
        body: {
          mode,
          rigProbability: rigRaw / 100
        }
      });
      alert('Подкрутка сохранена');
    } else if (button.dataset.action === 'clear-override') {
      await request(`/house-overrides/${telegramId}`, { method: 'DELETE' });
      alert('Подкрутка сброшена');
    }
  } catch (error) {
    alert(error.message);
  }
});
