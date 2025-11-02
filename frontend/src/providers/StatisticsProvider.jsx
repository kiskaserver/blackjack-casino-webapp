import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const defaultStats = {
  totalGames: 0,
  wins: 0,
  losses: 0,
  pushes: 0,
  blackjacks: 0,
  busts: 0,
  totalWinnings: 0,
  totalLosses: 0,
  currentStreak: 0,
  bestWinStreak: 0,
  bestLoseStreak: 0,
  biggestWin: 0,
  biggestLoss: 0,
  handsPlayed: 0,
  averageBet: 0,
  sessionsPlayed: 0,
  timePlayedMinutes: 0,
  lastPlayDate: null,
  achievements: []
};

const STORAGE_KEY = 'blackjack_player_stats_v2';

const StatisticsContext = createContext({
  stats: defaultStats,
  updateAfterRound: (_payload) => {},
  reset: () => {},
});

export const useStatistics = () => useContext(StatisticsContext);

export const StatisticsProvider = ({ children }) => {
  const [stats, setStats] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return { ...defaultStats, ...JSON.parse(saved) };
    } catch {}
    return { ...defaultStats };
  });

  const sessionRef = useRef({ startTime: Date.now(), gamesPlayed: 0, netWinnings: 0, biggestWin: 0, winStreak: 0 });

  // persist periodically
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(stats)); } catch {}
  }, [stats]);

  useEffect(() => {
    setStats(s => ({ ...s, sessionsPlayed: (s.sessionsPlayed || 0) + 1, lastPlayDate: new Date().toISOString() }));
    const id = setInterval(() => {
      setStats(s => ({ ...s, timePlayedMinutes: (s.timePlayedMinutes || 0) + 1 }));
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  const updateStreaks = (prev, result) => {
    let current = prev.currentStreak || 0;
    if (result === 'win' || result === 'blackjack') {
      current = current >= 0 ? current + 1 : 1;
    } else if (result === 'lose' || result === 'bust') {
      current = current <= 0 ? current - 1 : -1;
    }
    return {
      currentStreak: current,
      bestWinStreak: Math.max(prev.bestWinStreak || 0, current > 0 ? current : 0),
      bestLoseStreak: Math.max(prev.bestLoseStreak || 0, current < 0 ? Math.abs(current) : 0)
    };
  };

  const updateAfterRound = useCallback(({ result, betAmount, winAmount = 0 }) => {
    setStats(prev => {
      const next = { ...prev };
      next.totalGames = (next.totalGames || 0) + 1;
      next.handsPlayed = (next.handsPlayed || 0) + 1;

      // averageBet
      const games = next.totalGames;
      const prevAvg = next.averageBet || 0;
      next.averageBet = Math.round(((prevAvg * (games - 1)) + (Number(betAmount) || 0)) / games);

      switch (result) {
        case 'blackjack':
          next.blackjacks = (next.blackjacks || 0) + 1;
          next.wins = (next.wins || 0) + 1;
          next.totalWinnings = (next.totalWinnings || 0) + (Number(winAmount) || 0);
          break;
        case 'win':
          next.wins = (next.wins || 0) + 1;
          next.totalWinnings = (next.totalWinnings || 0) + (Number(winAmount) || 0);
          break;
        case 'bust':
          next.busts = (next.busts || 0) + 1;
          next.losses = (next.losses || 0) + 1;
          next.totalLosses = (next.totalLosses || 0) + (Number(betAmount) || 0);
          break;
        case 'lose':
          next.losses = (next.losses || 0) + 1;
          next.totalLosses = (next.totalLosses || 0) + (Number(betAmount) || 0);
          break;
        case 'push':
          next.pushes = (next.pushes || 0) + 1;
          break;
        default: break;
      }

      // records
      const netWin = (Number(winAmount) || 0) - (['lose','bust'].includes(result) ? Number(betAmount) || 0 : 0);
      if (netWin > (next.biggestWin || 0)) next.biggestWin = netWin;
      if (['lose','bust'].includes(result) && (Number(betAmount) || 0) > (next.biggestLoss || 0)) next.biggestLoss = Number(betAmount) || 0;

      // streaks
      const s = updateStreaks(next, result);
      next.currentStreak = s.currentStreak;
      next.bestWinStreak = s.bestWinStreak;
      next.bestLoseStreak = s.bestLoseStreak;

      // session mirror
      sessionRef.current.gamesPlayed += 1;
      sessionRef.current.netWinnings += (Number(winAmount) || 0) - (['lose','bust'].includes(result) ? Number(betAmount) || 0 : 0);
      sessionRef.current.biggestWin = Math.max(sessionRef.current.biggestWin || 0, netWin);
      sessionRef.current.winStreak = (result === 'win' || result === 'blackjack') ? (sessionRef.current.winStreak || 0) + 1 : 0;

      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setStats({ ...defaultStats });
    sessionRef.current = { startTime: Date.now(), gamesPlayed: 0, netWinnings: 0, biggestWin: 0, winStreak: 0 };
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }, []);

  const value = useMemo(() => ({ stats, updateAfterRound, reset }), [stats, updateAfterRound, reset]);

  return (
    <StatisticsContext.Provider value={value}>
      {children}
    </StatisticsContext.Provider>
  );
};
