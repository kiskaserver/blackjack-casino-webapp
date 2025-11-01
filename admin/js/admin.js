const API_BASE = '/api/admin';

const state = {
  adminId: '',
  connected: false,
  settings: null,
  sessionToken: '',
  tokenExpiresAt: null
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
const verificationsSection = document.getElementById('verificationsSection');
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
const verificationsBody = document.getElementById('verificationsBody');
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
const refreshVerificationsButton = document.getElementById('refreshVerificationsButton');
const verificationStatusFilter = document.getElementById('verificationStatusFilter');

const sections = [
  overviewSection,
  transactionsSection,
  playerLookupSection,
  settingsSection,
  withdrawalsSection,
  playersSection,
  verificationsSection,
  batchesSection,
  riskSection
];

const toggleSections = visible => {
  sections.forEach(section => {
    if (!section) return;
    section.classList.toggle('hidden', !visible);
  });
};

const formatStars = value => {
  const number = Number(value || 0);
  return number.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const formatDate = value => {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return date.toLocaleString('ru-RU');
};

const translatePlayerStatus = status => {
  const map = {
    active: 'Активен',
    suspended: 'Приостановлен',
    limited: 'Ограничен',
    verified: 'Верифицирован',
    banned: 'Заблокирован'
  };
  return map[status] || status || 'Неизвестно';
};

const translateVerificationStatus = status => {
  const map = {
    unverified: 'Не проверен',
    pending: 'На проверке',
    verified: 'Подтвержден',
    rejected: 'Отклонен',
    review: 'Нужны данные'
  };
  return map[status] || status || 'Неизвестно';
};

const translateVerificationRequestStatus = status => {
  const map = {
    pending: 'На проверке',
    approved: 'Одобрено',
    rejected: 'Отклонено',
    resubmit: 'Нужны документы'
  };
  return map[status] || status || 'Неизвестно';
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
const handleUnauthorized = () => {
  state.sessionToken = '';
  state.tokenExpiresAt = null;
  state.connected = false;
  state.settings = null;
  toggleSections(false);
};

const request = async (path, options = {}) => {
  if (!state.sessionToken) {
    throw new Error('Требуется авторизация');
  }

  const { method = 'GET', body, headers } = options;
  const fetchOptions = {
    method,
    headers: new Headers(headers || {})
  };

  fetchOptions.headers.set('Authorization', `Bearer ${state.sessionToken}`);

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

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error('Сессия администратора истекла, авторизуйтесь повторно');
  }

  if (!response.ok || !payload?.success) {
    const message = payload?.error || response.statusText || 'Запрос завершился ошибкой';
    throw new Error(message);
  }

  return payload.data;
};

const loginAdmin = async ({ adminId, secret }) => {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ adminId, secret })
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch (error) {
    payload = null;
  }

  if (!response.ok || !payload?.success) {
    const message = payload?.error || response.statusText || 'Не удалось авторизоваться';
    throw new Error(message);
  }

  return payload.data;
};

const logoutAdmin = async () => {
  if (!state.sessionToken) {
    handleUnauthorized();
    return;
  }
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${state.sessionToken}`
      }
    });
  } catch (error) {
    // ignore network errors on logout
  } finally {
    handleUnauthorized();
  }
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
    <div><strong>Статус:</strong> ${escapeHtml(translatePlayerStatus(player.status))}</div>
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
    tr.dataset.playerId = player.id;
    const isActive = Boolean(player.is_active);
    const statusLabel = translatePlayerStatus(player.status);
    const verificationStatus = String(player.verification_status || 'unverified').toLowerCase();
    const verificationLabel = translateVerificationStatus(verificationStatus);
    const verificationClass = `verification-${verificationStatus}`;
    const actions = [
      '<button data-action="edit">Редактировать</button>',
      `<button data-action="toggle-status" data-current="${isActive}">${isActive ? 'Заблокировать' : 'Разблокировать'}</button>`,
      '<button data-action="credit">+ Баланс</button>',
      '<button data-action="debit">- Баланс</button>',
      '<button data-action="override">Подкрутка</button>',
      '<button data-action="clear-override">Сброс</button>'
    ];
    if (verificationStatus !== 'unverified') {
      actions.push('<button data-action="view-verification">KYC</button>');
    }
    tr.innerHTML = `
      <td>${escapeHtml(player.telegram_id)}</td>
      <td>${escapeHtml(player.username || '')}</td>
      <td>
        <span class="status ${isActive ? 'active' : 'inactive'}">
          ${escapeHtml(statusLabel)}
        </span>
      </td>
      <td>
        <span class="status ${verificationClass}">
          ${escapeHtml(verificationLabel)}
        </span>
      </td>
      <td>${formatStars(player.balance)}</td>
      <td>${formatStars(player.demo_balance)}</td>
      <td>${player.level || 1}</td>
      <td>${formatDate(player.created_at)}</td>
      <td>
        ${actions.join(' ')}
      </td>
    `;
    playersBody.appendChild(tr);
  });
};

const renderVerifications = requests => {
  if (!verificationsBody) return;
  verificationsBody.innerHTML = '';
  (requests || []).forEach(request => {
    const tr = document.createElement('tr');
    tr.dataset.verificationId = request.id;
    tr.dataset.playerId = request.player_id;
    const status = String(request.status || '').toLowerCase();
    const statusLabel = translateVerificationRequestStatus(status);
    const statusClass = `verification-${status}`;
    const playerInfo = request.player
      ? `${escapeHtml(request.player.username || request.player.telegram_id || '')} (${escapeHtml(request.player.telegram_id || '')})`
      : `ID ${escapeHtml(String(request.player_id))}`;
    const docLinks = [];
    if (request.document_front_url) {
      docLinks.push(`<a href="${escapeHtml(request.document_front_url)}" target="_blank" rel="noopener noreferrer">Лицевая</a>`);
    }
    if (request.document_back_url) {
      docLinks.push(`<a href="${escapeHtml(request.document_back_url)}" target="_blank" rel="noopener noreferrer">Оборот</a>`);
    }
    if (request.selfie_url) {
      docLinks.push(`<a href="${escapeHtml(request.selfie_url)}" target="_blank" rel="noopener noreferrer">Селфи</a>`);
    }
    if (request.additional_document_url) {
      docLinks.push(`<a href="${escapeHtml(request.additional_document_url)}" target="_blank" rel="noopener noreferrer">Дополнительно</a>`);
    }
    const actions = [];
    if (status === 'pending' || status === 'resubmit') {
      actions.push('<button data-action="approve" class="btn-small btn-success">Одобрить</button>');
      actions.push('<button data-action="reject" class="btn-small btn-danger">Отклонить</button>');
    }
    if (status === 'pending') {
      actions.push('<button data-action="resubmit" class="btn-small">Запросить доп. документы</button>');
    }
    actions.push('<button data-action="view" class="btn-small">Просмотр</button>');

    tr.innerHTML = `
      <td>${escapeHtml(request.id)}</td>
      <td>${playerInfo}</td>
      <td>
        <span class="status ${statusClass}">${escapeHtml(statusLabel)}</span>
      </td>
      <td>${escapeHtml(request.document_type || '—')}</td>
      <td>${formatDate(request.submitted_at)}</td>
      <td>${formatDate(request.reviewed_at)}</td>
      <td>${docLinks.length ? docLinks.join('<br>') : '—'}</td>
      <td>${escapeHtml(request.note || request.rejection_reason || '—')}</td>
      <td>${actions.join(' ')}</td>
    `;
    verificationsBody.appendChild(tr);
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
    const details = event.payload || event.details || {};
    tr.innerHTML = `
      <td>${formatDate(event.created_at)}</td>
      <td>${escapeHtml(event.telegram_id)}</td>
      <td>${translateRiskType(event.event_type)}</td>
      <td>
        <span class="risk-severity ${event.severity}">
          ${translateSeverity(event.severity)}
        </span>
      </td>
      <td><pre>${escapeHtml(JSON.stringify(details, null, 2))}</pre></td>
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

const loadVerifications = async () => {
  let url = '/verifications?limit=100';
  const status = verificationStatusFilter?.value;
  if (status) {
    url += `&status=${encodeURIComponent(status)}`;
  }
  const data = await request(url);
  renderVerifications(data);
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
    loadVerifications(),
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

  setConnectLoading(true);

  try {
    const session = await loginAdmin({ adminId, secret: adminSecret });
    state.adminId = adminId;
    state.sessionToken = session.token;
    state.tokenExpiresAt = session.expiresIn ? Date.now() + session.expiresIn * 1000 : null;
    state.connected = true;
    passwordInput.value = '';
    toggleSections(true);
    await refreshAll();
  } catch (error) {
    handleUnauthorized();
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
  const playerId = row?.dataset.playerId;
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
      if (balance !== null) {
        const numericBalance = Number(balance);
        if (!Number.isFinite(numericBalance) || numericBalance < 0) {
          alert('Некорректный баланс');
          return;
        }
        await request(`/players/${telegramId}/balance`, {
          method: 'PUT',
          body: { balance: numericBalance }
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
    } else if (button.dataset.action === 'view-verification') {
      if (!playerId) {
        alert('Нет данных для верификации');
        return;
      }
      const data = await request(`/verifications?playerId=${encodeURIComponent(playerId)}&limit=1`);
      const requestData = Array.isArray(data) && data.length ? data[0] : null;
      if (!requestData) {
        alert('Запросы на верификацию не найдены');
        return;
      }
      const details = [
        `Статус: ${translateVerificationRequestStatus(requestData.status)}`,
        `Тип документа: ${requestData.document_type || '—'}`,
        `Номер: ${requestData.document_number || '—'}`,
        `Страна: ${requestData.country || '—'}`,
        `Комментарий: ${requestData.note || requestData.rejection_reason || '—'}`,
        `Лицевая: ${requestData.document_front_url || '—'}`,
        `Оборот: ${requestData.document_back_url || '—'}`,
        `Селфи: ${requestData.selfie_url || '—'}`,
        `Дополнительно: ${requestData.additional_document_url || '—'}`
      ].join('\n');
      alert(details);
    }
  } catch (error) {
    alert(error.message);
  }
});

verificationsBody?.addEventListener('click', async event => {
  const button = event.target.closest('button');
  if (!button) return;

  const row = button.closest('tr');
  const verificationId = row?.dataset.verificationId;
  if (!verificationId) return;

  try {
    if (button.dataset.action === 'view') {
      const data = await request(`/verifications/${verificationId}`);
      const info = data ? [
        `Игрок: ${data.player ? `${data.player.username || data.player.telegram_id || ''} (${data.player.telegram_id || ''})` : '—'}`,
        `Статус: ${translateVerificationRequestStatus(data.status)}`,
        `Тип документа: ${data.document_type || '—'}`,
        `Номер: ${data.document_number || '—'}`,
        `Страна: ${data.country || '—'}`,
        `Комментарий: ${data.note || data.rejection_reason || '—'}`,
        `Лицевая: ${data.document_front_url || '—'}`,
        `Оборот: ${data.document_back_url || '—'}`,
        `Селфи: ${data.selfie_url || '—'}`,
        `Дополнительно: ${data.additional_document_url || '—'}`,
        `Метаданные: ${JSON.stringify(data.metadata || {}, null, 2)}`
      ].join('\n') : 'Данные не найдены';
      alert(info);
      return;
    }

    let endpoint = '';
    const body = {};

    if (button.dataset.action === 'approve') {
      const note = prompt('Комментарий для записи (необязательно):', '') || undefined;
      endpoint = `/verifications/${verificationId}/approve`;
      if (note) {
        body.note = note;
      }
    } else if (button.dataset.action === 'reject') {
      const reason = prompt('Причина отклонения?', '');
      if (!reason) {
        alert('Причина обязательна');
        return;
      }
      const note = prompt('Комментарий для записи (необязательно):', '') || undefined;
      endpoint = `/verifications/${verificationId}/reject`;
      body.reason = reason;
      if (note) {
        body.note = note;
      }
    } else if (button.dataset.action === 'resubmit') {
      const reason = prompt('Опишите необходимые дополнения для игрока', '');
      if (!reason) {
        alert('Описание необходимо для повторного запроса');
        return;
      }
      const note = prompt('Комментарий для записи (необязательно):', '') || undefined;
      endpoint = `/verifications/${verificationId}/request-resubmission`;
      body.reason = reason;
      if (note) {
        body.note = note;
      }
    } else {
      return;
    }

    await request(endpoint, { method: 'POST', body });
    showSuccess('Статус верификации обновлен');
    await Promise.all([loadVerifications(), loadPlayers()]);
  } catch (error) {
    showError(error.message || 'Ошибка обновления статуса');
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

refreshVerificationsButton?.addEventListener('click', loadVerifications);
verificationStatusFilter?.addEventListener('change', loadVerifications);

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

window.adminPanel = {
  logout: logoutAdmin
};
