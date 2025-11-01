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
const batchesSection = document.getElementById('batchesSection');
const riskSection = document.getElementById('riskSection');
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
const batchesBody = document.getElementById('batchesBody');
const riskBody = document.getElementById('riskBody');

// Additional control elements
const refreshPlayersButton = document.getElementById('refreshPlayersButton');
const playerSearchInput = document.getElementById('playerSearchInput');
const searchPlayerButton = document.getElementById('searchPlayerButton');
const refreshBatchesButton = document.getElementById('refreshBatchesButton');
const forceBatchButton = document.getElementById('forceBatchButton');
const refreshRiskButton = document.getElementById('refreshRiskButton');
const riskSeverityFilter = document.getElementById('riskSeverityFilter');
const riskTypeFilter = document.getElementById('riskTypeFilter');

const sections = [
  overviewSection,
  transactionsSection,
  playerLookupSection,
  settingsSection,
  withdrawalsSection,
  playersSection,
  batchesSection,
  riskSection
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

const showSuccess = message => {
  // Simple success notification
  alert(`✅ ${message}`);
};

const showError = message => {
  // Simple error notification
  alert(`❌ ${message}`);
};

const showLoading = elementId => {
  const element = document.getElementById(elementId);
  if (element) {
    element.innerHTML = '<tr><td colspan="100%">Загрузка...</td></tr>';
  }
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
  const parseStats = source => ({
    totalGames: Number(source?.totalGames || source?.total_games || 0),
    wins: Number(source?.wins || 0),
    losses: Number(source?.losses || 0),
    blackjacks: Number(source?.blackjacks || 0),
    pushes: Number(source?.pushes || 0),
    netProfit: Number(source?.netProfit || source?.net_profit || 0)
  });

  const realStats = parseStats(stats?.wallets?.real || stats || {});
  const demoStats = parseStats(stats?.wallets?.demo || {});

  playerDetails.innerHTML = `
    <div><strong>Игрок:</strong> ${escapeHtml(player.username || 'N/A')} (${escapeHtml(player.telegram_id)})</div>
    <div><strong>Баланс (реал):</strong> ${formatCurrency(player.balance)}</div>
    <div><strong>Баланс (демо):</strong> ${formatCurrency(player.demo_balance)}</div>
    <div><strong>Уровень:</strong> ${escapeHtml(player.level)}</div>
    <div class="wallet-stats-block">
      <div class="wallet-stats-title">Реал</div>
      <div>Игры: ${realStats.totalGames}</div>
      <div>Победы: ${realStats.wins}</div>
      <div>Поражения: ${realStats.losses}</div>
      <div>Блэкджеков: ${realStats.blackjacks}</div>
      <div>Ничьи: ${realStats.pushes}</div>
      <div>Net P&L: ${formatCurrency(realStats.netProfit)}</div>
    </div>
    <div class="wallet-stats-block demo">
      <div class="wallet-stats-title">Демо</div>
      <div>Игры: ${demoStats.totalGames}</div>
      <div>Победы: ${demoStats.wins}</div>
      <div>Поражения: ${demoStats.losses}</div>
      <div>Блэкджеков: ${demoStats.blackjacks}</div>
      <div>Ничьи: ${demoStats.pushes}</div>
      <div>Net P&L: ${formatCurrency(demoStats.netProfit)}</div>
    </div>
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
      <td>
        <span class="status ${player.is_active ? 'active' : 'inactive'}">
          ${player.is_active ? 'Активен' : 'Заблокирован'}
        </span>
      </td>
      <td>${formatStars(player.balance)}</td>
      <td>${formatStars(player.demo_balance)}</td>
      <td>${player.level || 1}</td>
      <td>${formatDate(player.created_at)}</td>
      <td>
        <button data-action="edit">Редактировать</button>
        <button data-action="toggle-status" data-current="${player.is_active}">${player.is_active ? 'Заблокировать' : 'Разблокировать'}</button>
        <button data-action="credit">+ Баланс</button>
        <button data-action="debit">- Баланс</button>
        <button data-action="override">Подкрутка</button>
        <button data-action="clear-override">Сброс</button>
      </td>
    `;
    playersBody.appendChild(tr);
  });
};

const renderBatches = batches => {
  if (!batchesBody) return;
  batchesBody.innerHTML = '';
  (batches || []).forEach(batch => {
    const tr = document.createElement('tr');
    tr.dataset.batchId = batch.id;
    tr.innerHTML = `
      <td>${escapeHtml(batch.id)}</td>
      <td>${formatDate(batch.scheduled_for)}</td>
      <td>
        <span class="status ${batch.status}">
          ${translateBatchStatus(batch.status)}
        </span>
      </td>
      <td>${batch.withdrawal_count || 0}</td>
      <td>${formatStars(batch.total_amount || 0)}</td>
      <td>
        ${batch.status === 'pending' ? 
          '<button data-action="process">Обработать</button>' : 
          '—'
        }
      </td>
    `;
    batchesBody.appendChild(tr);
  });
};

const renderRiskEvents = events => {
  if (!riskBody) return;
  riskBody.innerHTML = '';
  (events || []).forEach(event => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatDate(event.created_at)}</td>
      <td>${escapeHtml(event.telegram_id)}</td>
      <td>${translateRiskType(event.event_type)}</td>
      <td>
        <span class="risk-severity ${event.severity}">
          ${translateSeverity(event.severity)}
        </span>
      </td>
      <td><pre>${escapeHtml(JSON.stringify(event.details, null, 2))}</pre></td>
    `;
    riskBody.appendChild(tr);
  });
};

// Translation helpers
const translateBatchStatus = status => {
  const translations = {
    'pending': 'Ожидает',
    'processing': 'Обрабатывается',
    'completed': 'Завершен',
    'failed': 'Ошибка'
  };
  return translations[status] || status;
};

const translateRiskType = type => {
  const translations = {
    'velocity_threshold': 'Превышение скорости игры',
    'profit_threshold': 'Превышение лимита прибыли',
    'win_rate_anomaly': 'Аномальная частота побед'
  };
  return translations[type] || type;
};

const translateSeverity = severity => {
  const translations = {
    'low': 'Низкая',
    'medium': 'Средняя',
    'high': 'Высокая'
  };
  return translations[severity] || severity;
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

const loadBatches = async () => {
  const data = await request('/withdrawal-batches');
  renderBatches(data);
};

const loadRiskEvents = async () => {
  const severityFilter = riskSeverityFilter?.value;
  const typeFilter = riskTypeFilter?.value;
  
  let url = '/risk-events';
  const params = new URLSearchParams();
  if (severityFilter) params.append('severity', severityFilter);
  if (typeFilter) params.append('type', typeFilter);
  if (params.toString()) url += '?' + params.toString();

  const data = await request(url);
  renderRiskEvents(data);
};

const searchPlayers = async () => {
  const query = playerSearchInput?.value.trim();
  if (!query) {
    await loadPlayers();
    return;
  }

  try {
    const data = await request(`/players/search?q=${encodeURIComponent(query)}`);
    renderPlayers(data);
  } catch (error) {
    showError('Ошибка поиска игроков');
    console.error(error);
  }
};

const refreshAll = async () => {
  await Promise.all([
    loadOverview(),
    loadTransactions(),
    loadSettings(),
    loadWithdrawals(),
    loadPlayers(),
    loadBatches(),
    loadRiskEvents()
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
    } else if (button.dataset.action === 'edit') {
      const balance = prompt('Новый баланс (в звездах):');
      if (balance !== null && !isNaN(balance)) {
        await request(`/players/${telegramId}/balance`, {
          method: 'PUT',
          body: { balance: parseInt(balance) }
        });
        showSuccess('Баланс игрока обновлен');
        await loadPlayers();
      }
    } else if (button.dataset.action === 'toggle-status') {
      const currentStatus = button.dataset.current === 'true';
      const newStatus = !currentStatus;
      await request(`/players/${telegramId}/status`, {
        method: 'PUT',
        body: { is_active: newStatus }
      });
      showSuccess(`Статус игрока ${newStatus ? 'активирован' : 'деактивирован'}`);
      await loadPlayers();
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

// Event listeners for new controls
refreshPlayersButton?.addEventListener('click', loadPlayers);
searchPlayerButton?.addEventListener('click', searchPlayers);
playerSearchInput?.addEventListener('keypress', event => {
  if (event.key === 'Enter') {
    searchPlayers();
  }
});

refreshBatchesButton?.addEventListener('click', loadBatches);
forceBatchButton?.addEventListener('click', async () => {
  try {
    await request('/withdrawal-batches/force', { method: 'POST' });
    showSuccess('Внеочередной батч создан');
    await loadBatches();
  } catch (error) {
    showError('Ошибка создания батча');
    console.error(error);
  }
});

batchesBody?.addEventListener('click', async event => {
  const button = event.target.closest('button');
  if (!button) return;

  const row = button.closest('tr');
  const batchId = row?.dataset.batchId;
  if (!batchId) return;

  if (button.dataset.action === 'process') {
    try {
      await request(`/withdrawal-batches/${batchId}/process`, { method: 'POST' });
      showSuccess('Батч запущен в обработку');
      await loadBatches();
    } catch (error) {
      showError('Ошибка обработки батча');
      console.error(error);
    }
  }
});

refreshRiskButton?.addEventListener('click', loadRiskEvents);
riskSeverityFilter?.addEventListener('change', loadRiskEvents);
riskTypeFilter?.addEventListener('change', loadRiskEvents);
