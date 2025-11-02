import { API_BASE_URL, handleResponse } from './baseClient.js';

const ensureInitData = initData => {
  if (!initData) {
    throw new Error('Telegram init data is required to call player API');
  }
  return initData;
};

export const createPlayerApi = getInitData => {
  const request = async (path, { method = 'GET', body, headers = {}, searchParams } = {}) => {
    const initData = ensureInitData(getInitData());
    const url = new URL(`${API_BASE_URL}${path}`, window.location.origin);
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
        'Content-Type': 'application/json',
        'X-Telegram-Init-Data': initData,
        ...headers
      },
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include'
    });

    return handleResponse(response);
  };

  return {
    getProfile: () => request('/player/profile'),
    getHistory: params => request('/player/history', { searchParams: params }),
    resetDemoBalance: payload => request('/player/demo/reset', { method: 'POST', body: payload }),
    getVerification: () => request('/player/verification'),
    submitVerification: payload => request('/player/verification', { method: 'POST', body: payload }),
    startRound: payload => request('/game/start', { method: 'POST', body: payload }),
    hitRound: roundId => request('/game/hit', { method: 'POST', body: { roundId } }),
    doubleDown: roundId => request('/game/double', { method: 'POST', body: { roundId } }),
    settleRound: roundId => request('/game/settle', { method: 'POST', body: { roundId } }),
  getFairness: () => request('/game/fairness'),
    createCryptomusInvoice: payload => request('/payments/cryptomus/invoice', { method: 'POST', body: payload }),
    createTelegramStarsInvoice: payload => request('/payments/telegram-stars/invoice', { method: 'POST', body: payload }),
    requestWithdrawal: payload => request('/payments/withdraw', { method: 'POST', body: payload })
  };
};
