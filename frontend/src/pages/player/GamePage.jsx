import { useCallback, useMemo, useState } from 'react';
import { createPlayerApi } from '../../api/playerApi.js';
import { useTelegram } from '../../providers/TelegramProvider.jsx';

const formatCard = card => `${card.rank}${card.suit}`;

const defaultRound = {
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
};

const GamePage = () => {
  const { initData } = useTelegram();
  const api = useMemo(() => createPlayerApi(() => initData), [initData]);
  const [round, setRound] = useState(defaultRound);
  const [betAmount, setBetAmount] = useState('50');
  const [walletType, setWalletType] = useState('real');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const resetError = () => setError('');

  const updateRound = payload => {
    setRound(prev => ({ ...prev, ...payload }));
  };

  const handleStartRound = useCallback(async () => {
    resetError();
    setLoading(true);
    try {
      const result = await api.startRound({ betAmount: Number(betAmount), walletType });
      updateRound({ ...result, status: result.status || 'pending', walletType });
    } catch (err) {
      setError(err.message || 'Не удалось начать раунд');
    } finally {
      setLoading(false);
    }
  }, [api, betAmount, walletType]);

  const makeRoundAction = useCallback(
    action => async () => {
      if (!round.roundId) {
        return;
      }
      resetError();
      setLoading(true);
      try {
        let result;
        if (action === 'hit') {
          result = await api.hitRound(round.roundId);
        } else if (action === 'double') {
          result = await api.doubleDown(round.roundId);
        } else if (action === 'settle') {
          result = await api.settleRound(round.roundId);
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
    [api, round.roundId]
  );

  const isPending = round.status === 'pending';

  return (
    <div className="flex-col" style={{ gap: '1.5rem' }}>
      <div className="card">
        <h2>Новый раунд</h2>
        <div className="flex-row" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <label style={{ minWidth: 140 }}>
            Тип кошелька
            <select value={walletType} onChange={event => setWalletType(event.target.value)}>
              <option value="real">Реальный</option>
              <option value="demo">Демо</option>
            </select>
          </label>
          <label style={{ minWidth: 140 }}>
            Ставка
            <input
              type="number"
              min="1"
              step="1"
              value={betAmount}
              onChange={event => setBetAmount(event.target.value)}
            />
          </label>
          <button className="primary" onClick={handleStartRound} disabled={loading}>
            Стартовать
          </button>
        </div>
        {error && <div className="alert error" style={{ marginTop: '1rem' }}>{error}</div>}
      </div>

      {round.roundId && (
        <div className="card">
          <div className="flex-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>Раунд #{round.roundId}</h2>
            <span className={`status-pill ${round.status}`}>{round.status}</span>
          </div>

          <div className="flex-row" style={{ gap: '2rem', flexWrap: 'wrap' }}>
            <section>
              <h3>Игрок ({round.playerScore})</h3>
              <div className="tag-list">
                {round.playerCards.map((card, index) => (
                  <span className="tag" key={`${card.rank}-${card.suit}-${index}`}>
                    {card.hidden ? '??' : formatCard(card)}
                  </span>
                ))}
              </div>
            </section>
            <section>
              <h3>Дилер ({round.dealerScore})</h3>
              <div className="tag-list">
                {round.dealerCards.map((card, index) => (
                  <span className="tag" key={`${card.rank}-${card.suit}-${index}`}>
                    {card.hidden ? '??' : formatCard(card)}
                  </span>
                ))}
              </div>
            </section>
          </div>

          <div className="flex-row" style={{ marginTop: '1.5rem', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button onClick={makeRoundAction('hit')} disabled={!isPending || loading}>
              Взять карту
            </button>
            <button onClick={makeRoundAction('double')} disabled={!isPending || loading || round.doubleDown}>
              Удвоить
            </button>
            <button className="primary" onClick={makeRoundAction('settle')} disabled={!isPending || loading}>
              Остановиться
            </button>
          </div>

          <div className="flex-row" style={{ marginTop: '1.5rem', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div>
              <strong>Баланс (реал):</strong> {Number(round.balances?.real || 0).toFixed(2)}
            </div>
            <div>
              <strong>Баланс (демо):</strong> {Number(round.balances?.demo || 0).toFixed(2)}
            </div>
            <div>
              <strong>Итог:</strong> {round.result || '—'} ({Number(round.winAmount || 0).toFixed(2)})
            </div>
          </div>

          {round.message && <div className="alert success" style={{ marginTop: '1rem' }}>{round.message}</div>}
        </div>
      )}
    </div>
  );
};

export default GamePage;
