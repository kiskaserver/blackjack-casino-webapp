import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPlayerApi } from '../../api/playerApi.js';
import { useTelegram } from '../../providers/TelegramProvider.jsx';
import { usePlayerContext } from '../../layouts/PlayerLayout.jsx';
import { soundManager, ensureUserGesture } from '../../utils/sound.js';
import { haptics } from '../../utils/haptics.js';
import { useSettings } from '../../providers/SettingsProvider.jsx';
import { useStatistics } from '../../providers/StatisticsProvider.jsx';

const formatCard = card => `${card.rank}${card.suit}`;

const getCardColorClass = suit => (['♥', '♦'].includes(suit) ? 'red' : 'black');

const resultMessages = {
  blackjack: '🎉 БЛЭКДЖЕК! Поздравляем! ',
  win: '🎉 Победа! У вас больше очков! ',
  lose: '😔 Поражение. Попробуйте ещё раз. ',
  bust: '💥 Перебор! Выше 21 очка. ',
  push: '🤝 Ничья — ставка возвращена. '
};

const createDefaultRound = () => ({
  roundId: null,
  status: 'idle',
  walletType: 'real',
  playerCards: [],
  dealerCards: [],
  playerScore: 0,
  dealerScore: 0,
  balance: 0,
  balances: { real: 0, demo: 0 },
  doubleDown: false,
  baseBet: 0,
  finalBet: 0,
  result: null,
  winAmount: 0,
  message: ''
});

const GamePage = () => {
  const { initData } = useTelegram();
  const api = useMemo(() => createPlayerApi(() => initData), [initData]);
  const { updateBalances } = usePlayerContext();
  const { updateAfterRound } = useStatistics();
  const { settings } = useSettings();
  const [round, setRound] = useState(() => createDefaultRound());
  const [betAmount, setBetAmount] = useState(50);
  const [walletType, setWalletType] = useState('real');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('🎮 Добро пожаловать в BlackJack Casino!');
  const [fairness, setFairness] = useState(null);
  const [fairnessError, setFairnessError] = useState('');
  const [showFairness, setShowFairness] = useState(false);

  useEffect(() => {
    ensureUserGesture();
  }, []);

  const formatPercent = value => {
    if (value === null || value === undefined) {
      return '—';
    }
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return '—';
    }
    return `${numeric.toFixed(2)}%`;
  };

  const formatCount = value => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return '—';
    }
    return numeric.toLocaleString('ru-RU');
  };

  useEffect(() => {
    let cancelled = false;
    const loadFairness = async () => {
      try {
        const report = await api.getFairness();
        if (!cancelled) {
          setFairness(report);
          setFairnessError('');
        }
      } catch (err) {
        if (!cancelled) {
          setFairnessError(err.message || 'Не удалось получить статистику RTP');
        }
      }
    };

    loadFairness();
    const timer = window.setInterval(loadFairness, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [api]);

  const resetError = () => setError('');

  const updateRound = payload => {
    setRound(prev => ({ ...prev, ...payload }));
    if (payload?.balances) {
      updateBalances(payload.balances);
    }
    if (payload?.status && payload.status !== 'pending' && payload?.result) {
      const base = resultMessages[payload.result] || 'Раунд завершён.';
      const win = Number(payload.winAmount || 0);
      const suffix = win ? `Выигрыш: ${win.toFixed(2)}.` : '';
      setMessage(`${base}${suffix}`.trim());

      // Sounds + haptics on final result
      const result = payload.result;
      if (result === 'blackjack') {
        soundManager.play('win');
        if (settings.hapticsEnabled) haptics.notify('success');
      } else if (result === 'win') {
        soundManager.play('win');
        if (settings.hapticsEnabled) haptics.notify('success');
      } else if (result === 'push') {
        soundManager.play('push');
        if (settings.hapticsEnabled) haptics.impact('light');
      } else if (result === 'bust' || result === 'lose') {
        soundManager.play('lose');
        if (settings.hapticsEnabled) haptics.notify('error');
      }

      // Update local statistics
      const usedBet = Number(payload.finalBet || payload.baseBet || betAmount || 0);
      updateAfterRound({ result: payload.result, betAmount: usedBet, winAmount: Number(payload.winAmount || 0) });

      // Win effects (fireworks/confetti) on big wins
      const winAmount = Number(payload.winAmount || 0);
      const bigWin = (payload.result === 'blackjack') || (payload.result === 'win' && winAmount >= usedBet * 2);
      if (bigWin) {
        triggerWinEffects();
      }
    }
  };

  const handleStartRound = useCallback(async () => {
    if (loading) return;
    resetError();
    setLoading(true);
    try {
      const payload = {
        betAmount: Number.isFinite(Number(betAmount)) ? Number(betAmount) : 0,
        walletType
      };
      const result = await api.startRound(payload);
      updateRound({ ...result, status: result.status || 'pending', walletType });
      setMessage('🎯 Ваша ставка принята. Взять карту или остановиться?');
  soundManager.play('bet');
  soundManager.play('deal');
  if (settings.hapticsEnabled) haptics.selection();
    } catch (err) {
      setError(err.message || 'Не удалось начать раунд');
    } finally {
      setLoading(false);
    }
  }, [api, betAmount, walletType, loading]);

  const makeRoundAction = useCallback(
    action => async () => {
      if (!round.roundId) {
        return;
      }
      if (loading) return;
      resetError();
      setLoading(true);
      try {
        let result;
        if (action === 'hit') {
          result = await api.hitRound(round.roundId);
          setMessage('🎯 Взяли карту. Ещё или остановиться?');
          soundManager.play('hit');
          if (settings.hapticsEnabled) haptics.impact('light');
        } else if (action === 'double') {
          result = await api.doubleDown(round.roundId);
          setMessage('💰 Ставка удвоена! Ход дилера...');
          soundManager.play('double');
          if (settings.hapticsEnabled) haptics.impact('medium');
        } else if (action === 'settle') {
          result = await api.settleRound(round.roundId);
          setMessage('🎩 Ход дилера...');
          soundManager.play('stand');
          if (settings.hapticsEnabled) haptics.selection();
        }
        if (result) {
          updateRound(result);
        }
      } catch (err) {
        setError(err.message || 'Ошибка выполнения действия');
      } finally {
        setLoading(false);
      }
    },
    [api, round.roundId, loading]
  );

  const isRoundActive = round.status === 'pending' && Boolean(round.roundId);

  const triggerWinEffects = () => {
    const container = document.getElementById('winEffects');
    if (!container) return;
    const colors = ['#ffd700', '#ff6b6b', '#00ff88', '#3498db', '#e74c3c'];
    const count = 24;
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const firework = document.createElement('div');
        firework.className = 'firework';
        firework.style.left = `${Math.random() * 100}%`;
        firework.style.top = `${Math.random() * 60 + 10}%`;
        firework.style.background = colors[Math.floor(Math.random() * colors.length)];
        container.appendChild(firework);
        setTimeout(() => firework.remove(), 1100);
      }, i * 60);
    }
  };

  return (
    <div className="game-table">
        <div className="win-effects" id="winEffects" />
        {(fairness || fairnessError) && (
          <section className={`fairness-section ${showFairness ? 'expanded' : 'collapsed'}`}>
            <button 
              className="fairness-toggle"
              onClick={() => setShowFairness(!showFairness)}
              title={showFairness ? 'Свернуть' : 'Развернуть'}
            >
              <span className="fairness-toggle-icon">📊</span>
              <span className="fairness-toggle-text">Честность игры (RTP)</span>
              <span className="fairness-toggle-arrow">{showFairness ? '▼' : '▶'}</span>
            </button>
            {showFairness && fairness && (
              <div className="fairness-content">
                <div className="fairness-card">
                  <span className="fairness-label">RTP · вся история</span>
                  <div className="fairness-value">{formatPercent(fairness?.lifetime?.rtpPercent)}</div>
                  <span className="fairness-note">Преимущество: {formatPercent(fairness?.lifetime?.houseEdgePercent)}</span>
                </div>
                <div className="fairness-card">
                  <span className="fairness-label">RTP · 24 часа</span>
                  <div className="fairness-value">{formatPercent(fairness?.last24h?.rtpPercent)}</div>
                  <span className="fairness-note">Преимущество: {formatPercent(fairness?.last24h?.houseEdgePercent)}</span>
                </div>
                <div className="fairness-card">
                  <span className="fairness-label">
                    RTP · недавние {formatCount(fairness?.recent?.rounds || fairness?.recent?.sampleSize)}
                  </span>
                  <div className="fairness-value">{formatPercent(fairness?.recent?.rtpPercent)}</div>
                  <span className="fairness-note">Выборка: {formatCount(fairness?.recent?.sampleSize)}</span>
                </div>
                {fairness?.settings?.transparency?.targetRtpPercent && (
                  <div className="fairness-card fairness-card-target">
                    <span className="fairness-label">Целевой RTP</span>
                    <div className="fairness-value">{formatPercent(fairness.settings.transparency.targetRtpPercent)}</div>
                    <span className="fairness-note">По правилам</span>
                  </div>
                )}
              </div>
            )}
            {fairnessError && (
              <div className="fairness-error">
                ⚠️ {fairnessError}
              </div>
            )}
          </section>
        )}
        <section className="dealer-section">
          <div className="dealer-info">
            <span className="dealer-label">🎩 ДИЛЕР</span>
            <span className="dealer-score">{round.dealerScore || 0}</span>
          </div>
          <div className="cards-area dealer-cards" id="dealerCards">
            {round.dealerCards.length === 0 && <span>Раздача ожидается…</span>}
            {round.dealerCards.map((card, index) => (
              <div
                key={`${card.rank}-${card.suit}-${index}`}
                className={`card ${card.hidden ? 'face-down' : getCardColorClass(card.suit)} ${index === round.dealerCards.length - 1 ? 'last-dealer-card' : ''}`}
              >
                {!card.hidden && (
                  <>
                    <div className="card-value">{card.rank}</div>
                    <div className="card-suit">{card.suit}</div>
                  </>
                )}
              </div>
            ))}
          </div>
        </section>

        <div className="game-messages">
          <div className="message">{message}</div>
        </div>

        <section className="player-section">
          <div className="player-info">
            <span className="player-label">👤 ВЫ</span>
            <span className="player-score">{round.playerScore || 0}</span>
          </div>
          <div className="cards-area player-cards" id="playerCards">
            {round.playerCards.length === 0 && <span>Нажмите «Начать игру»</span>}
            {round.playerCards.map((card, index) => (
              <div key={`${card.rank}-${card.suit}-${index}`} className={`card ${getCardColorClass(card.suit)}`}>
                <div className="card-value">{card.rank}</div>
                <div className="card-suit">{card.suit}</div>
              </div>
            ))}
          </div>
        </section>

        <section className={`betting-section ${isRoundActive ? 'locked' : ''}`} id="bettingSection">
          <div className="bet-amount">
            <span className="bet-label">СТАВКА</span>
            <div className="bet-controls">
              <button
                className="bet-btn decrease"
                onClick={() => setBetAmount(prev => Math.max(1, Number(prev) - 10))}
                disabled={loading || isRoundActive}
              >
                −
              </button>
              <span className="bet-value" id="currentBet">{Number(betAmount).toFixed(0)}</span>
              <button
                className="bet-btn increase"
                onClick={() => setBetAmount(prev => Number(prev) + 10)}
                disabled={loading || isRoundActive}
              >
                +
              </button>
            </div>
              <div className="wallet-toggle">
                <span className="bet-label">КОШЕЛЁК</span>
                <div className="quick-bets">
                  <button
                    className={`quick-bet ${walletType === 'real' ? 'active' : ''}`}
                    type="button"
                    onClick={() => setWalletType('real')}
                    disabled={loading || isRoundActive}
                  >
                    💎 Реальный
                  </button>
                  <button
                    className={`quick-bet ${walletType === 'demo' ? 'active' : ''}`}
                    type="button"
                    onClick={() => setWalletType('demo')}
                    disabled={loading || isRoundActive}
                  >
                    🎮 Демо
                  </button>
                </div>
              </div>
          </div>

          <div className="quick-bets">
            {[25, 50, 100, 250].map(value => (
              <button
                key={value}
                className="quick-bet"
                onClick={() => setBetAmount(value)}
                disabled={loading || isRoundActive}
              >
                {value}
              </button>
            ))}
          </div>
        </section>

        <section className="game-controls">
          <div className={`action-buttons ${isRoundActive ? 'hide' : ''}`} id="actionButtons">
            <button className="game-btn start-btn" onClick={handleStartRound} disabled={loading} title="Сделайте ставку и начните новую раздачу">
              <div className="btn-content">
                <span className="btn-icon">🎯</span>
                <span className="btn-text">НАЧАТЬ ИГРУ</span>
              </div>
            </button>
          </div>

          <div className={`play-buttons ${isRoundActive ? '' : 'hide'}`} id="playButtons">
            <button className="game-btn hit-btn" onClick={makeRoundAction('hit')} disabled={!isRoundActive || loading}>
              <div className="btn-content">
                <span className="btn-icon">🎯</span>
                <span className="btn-text">ВЗЯТЬ</span>
              </div>
            </button>
            <button className="game-btn stand-btn" onClick={makeRoundAction('settle')} disabled={!isRoundActive || loading}>
              <div className="btn-content">
                <span className="btn-icon">🛑</span>
                <span className="btn-text">СТОП</span>
              </div>
            </button>
            <button className="game-btn double-btn" onClick={makeRoundAction('double')} disabled={!isRoundActive || loading || round.doubleDown}>
              <div className="btn-content">
                <span className="btn-icon">💰</span>
                <span className="btn-text">УДВОИТЬ</span>
              </div>
            </button>
          </div>
        </section>

        {error && (
          <div className="game-messages">
            <div className="message error-message">
              {error}
            </div>
          </div>
        )}
    </div>
  );
};

export default GamePage;
