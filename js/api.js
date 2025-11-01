(function () {
    const API_BASE_URL = window.__API_BASE_URL__ || 'http://localhost:5050';
    let walletType = 'real';

    const normalizeWallet = value => (value === 'demo' ? 'demo' : 'real');

    const defaultHeaders = () => {
        const headers = {
            'Content-Type': 'application/json'
        };
        if (window.Telegram?.WebApp?.initData) {
            headers['X-Telegram-Init-Data'] = window.Telegram.WebApp.initData;
        }
        return headers;
    };

    const apiClient = async (endpoint, options = {}) => {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers: {
                ...defaultHeaders(),
                ...(options.headers || {})
            }
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: response.statusText }));
            throw new Error(error.error || 'API request failed');
        }

        return response.json();
    };

    const withWallet = type => normalizeWallet(type || walletType);

    window.blackjackApi = {
        getPlayerProfile: () => apiClient('/api/player/profile', { method: 'GET' }),
        setWalletType: type => {
            walletType = normalizeWallet(type);
            return walletType;
        },
        getWalletType: () => walletType,
        startRound: (betAmount, explicitWallet) => apiClient('/api/game/start', {
            method: 'POST',
            body: JSON.stringify({ betAmount, walletType: withWallet(explicitWallet) })
        }),
        hitRound: roundId => apiClient('/api/game/hit', {
            method: 'POST',
            body: JSON.stringify({ roundId })
        }),
        doubleRound: roundId => apiClient('/api/game/double', {
            method: 'POST',
            body: JSON.stringify({ roundId })
        }),
        settleRound: roundId => apiClient('/api/game/settle', {
            method: 'POST',
            body: JSON.stringify({ roundId })
        }),
        requestCryptomusInvoice: payload => apiClient('/api/payments/cryptomus/invoice', {
            method: 'POST',
            body: JSON.stringify(payload)
        }),
        requestTelegramStarsInvoice: payload => apiClient('/api/payments/telegram-stars/invoice', {
            method: 'POST',
            body: JSON.stringify(payload)
        }),
        requestWithdrawal: payload => apiClient('/api/payments/withdraw', {
            method: 'POST',
            body: JSON.stringify(payload)
        }),
        resetDemoBalance: target => apiClient('/api/player/demo/reset', {
            method: 'POST',
            body: JSON.stringify({ target })
        })
    };
})();
