import { API_BASE_URL, handleResponse } from './baseClient.js';

const buildHeaders = token => ({
  'Content-Type': 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {})
});

export const createAdminApi = getToken => {
  const request = async (path, { method = 'GET', body, headers = {}, searchParams } = {}) => {
    const token = getToken();
    const url = new URL(`${API_BASE_URL}/admin${path}`, window.location.origin);
    if (searchParams) {
      Object.entries(searchParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.set(key, value);
        }
      });
    }

    const response = await fetch(url.toString(), {
      method,
      headers: {
        ...buildHeaders(token),
        ...headers
      },
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include'
    });

    return handleResponse(response);
  };

  return {
    login: payload => fetch(`${API_BASE_URL}/admin/auth/login`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(payload),
      credentials: 'include'
    }).then(handleResponse),
    logout: () => request('/auth/logout', { method: 'POST' }),
    getOverview: () => request('/stats/overview'),
    getPlayerByTelegramId: telegramId => request(`/stats/player/${telegramId}`),
    getRecentTransactions: limit => request('/transactions/recent', { searchParams: { limit } }),
    listPlayers: params => request('/players', { searchParams: params }),
    searchPlayers: params => request('/players/search', { searchParams: params }),
    adjustBalance: (telegramId, payload) => request(`/players/${telegramId}/adjust-balance`, { method: 'POST', body: payload }),
    setBalance: (telegramId, payload) => request(`/players/${telegramId}/balance`, { method: 'PUT', body: payload }),
    updateStatus: (telegramId, payload) => request(`/players/${telegramId}/status`, { method: 'PUT', body: payload }),
  resetDemoBalance: (telegramId, payload) => request(`/players/${telegramId}/demo/reset`, { method: 'POST', body: payload }),
  saveDemoSettings: (telegramId, payload) => request(`/players/${telegramId}/demo/settings`, { method: 'POST', body: payload }),
  clearDemoSettings: telegramId => request(`/players/${telegramId}/demo/settings`, { method: 'DELETE' }),
    listVerifications: params => request('/verifications', { searchParams: params }),
    getVerification: id => request(`/verifications/${id}`),
    approveVerification: (id, payload) => request(`/verifications/${id}/approve`, { method: 'POST', body: payload }),
    rejectVerification: (id, payload) => request(`/verifications/${id}/reject`, { method: 'POST', body: payload }),
    requestVerificationResubmission: (id, payload) => request(`/verifications/${id}/request-resubmission`, { method: 'POST', body: payload }),
    getSettings: () => request('/settings'),
    updateSettings: payload => request('/settings', { method: 'PATCH', body: payload }),
  getVerificationHosts: () => request('/security/verification-hosts'),
    listWithdrawals: params => request('/withdrawals', { searchParams: params }),
    listWithdrawalBatches: params => request('/withdrawal-batches', { searchParams: params }),
    processBatch: id => request(`/withdrawal-batches/${id}/process`, { method: 'POST' }),
    forceBatch: () => request('/withdrawal-batches/force', { method: 'POST' }),
    updateWithdrawalStatus: (id, payload) => request(`/withdrawals/${id}/status`, { method: 'POST', body: payload }),
    enqueueUrgentWithdrawal: id => request(`/withdrawals/${id}/urgent`, { method: 'POST' }),
    listRiskEvents: params => request('/risk-events', { searchParams: params })
  };
};
