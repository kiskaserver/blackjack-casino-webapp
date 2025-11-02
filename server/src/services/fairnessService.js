const db = require('../config/database');
const settingsService = require('./settingsService');

const DEFAULT_REPORT_WINDOW = 5000;

const toNumber = value => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const formatAggregateRow = row => {
  if (!row) {
    return {
      rounds: 0,
      totalWagered: 0,
      totalReturned: 0,
      net: 0,
      wins: 0,
      blackjacks: 0,
      pushes: 0,
      busts: 0,
      losses: 0,
      averageBet: 0,
      rtpPercent: null,
      houseEdgePercent: null
    };
  }

  const rounds = toNumber(row.rounds);
  const totalWagered = toNumber(row.total_wagered);
  const totalReturned = toNumber(row.total_returned);
  const net = totalReturned - totalWagered;
  const wins = toNumber(row.wins);
  const blackjacks = toNumber(row.blackjacks);
  const pushes = toNumber(row.pushes);
  const busts = toNumber(row.busts);
  const losses = toNumber(row.losses);
  const averageBet = rounds > 0 ? totalWagered / rounds : 0;
  const rtpPercent = totalWagered > 0 ? (totalReturned / totalWagered) * 100 : null;
  const houseEdgePercent = rtpPercent === null ? null : 100 - rtpPercent;

  return {
    rounds,
    totalWagered,
    totalReturned,
    net,
    wins,
    blackjacks,
    pushes,
    busts,
    losses,
    averageBet,
    rtpPercent: rtpPercent === null ? null : Number(rtpPercent.toFixed(2)),
    houseEdgePercent: houseEdgePercent === null ? null : Number(houseEdgePercent.toFixed(2))
  };
};

const aggregateBase = async (extraWhere = '', params = []) => {
  const query = `
    SELECT
      COUNT(*) AS rounds,
      COALESCE(SUM(final_bet), 0) AS total_wagered,
      COALESCE(SUM(win_amount), 0) AS total_returned,
      COUNT(*) FILTER (WHERE result = 'win') AS wins,
      COUNT(*) FILTER (WHERE result = 'blackjack') AS blackjacks,
      COUNT(*) FILTER (WHERE result = 'push') AS pushes,
      COUNT(*) FILTER (WHERE result = 'bust') AS busts,
      COUNT(*) FILTER (WHERE result = 'lose') AS losses
    FROM game_rounds
    WHERE wallet_type = 'real'
      AND status = 'finished'
      AND settled_at IS NOT NULL
      ${extraWhere}
  `;

  const res = await db.query(query, params);
  return formatAggregateRow(res.rows[0]);
};

const aggregateRecentRounds = async limit => {
  const safeLimit = Number.isFinite(Number(limit)) && Number(limit) > 0
    ? Math.min(Number(limit), 50_000)
    : DEFAULT_REPORT_WINDOW;

  const res = await db.query(
    `WITH recent AS (
      SELECT final_bet, win_amount, result
      FROM game_rounds
      WHERE wallet_type = 'real'
        AND status = 'finished'
        AND settled_at IS NOT NULL
      ORDER BY settled_at DESC NULLS LAST
      LIMIT $1
    )
    SELECT
      COUNT(*) AS rounds,
      COALESCE(SUM(final_bet), 0) AS total_wagered,
      COALESCE(SUM(win_amount), 0) AS total_returned,
      COUNT(*) FILTER (WHERE result = 'win') AS wins,
      COUNT(*) FILTER (WHERE result = 'blackjack') AS blackjacks,
      COUNT(*) FILTER (WHERE result = 'push') AS pushes,
      COUNT(*) FILTER (WHERE result = 'bust') AS busts,
      COUNT(*) FILTER (WHERE result = 'lose') AS losses
    FROM recent`,
    [safeLimit]
  );

  const formatted = formatAggregateRow(res.rows[0]);
  return { ...formatted, sampleSize: safeLimit };
};

const getGameFairnessReport = async () => {
  const settings = await settingsService.getSettings();
  const transparency = settings.transparency || {};
  const windowSize = Number(transparency.reportWindowSize || DEFAULT_REPORT_WINDOW);
  const sampleSize = Number.isFinite(windowSize) && windowSize > 0 ? Math.floor(windowSize) : DEFAULT_REPORT_WINDOW;

  const [lifetime, last24h, recent] = await Promise.all([
    aggregateBase(),
    aggregateBase('AND settled_at >= NOW() - $1::interval', ['24 hours']),
    aggregateRecentRounds(sampleSize)
  ]);

  return {
    lifetime,
    last24h,
    recent,
    settings: {
      payouts: settings.payouts,
      gameplay: settings.gameplay,
      transparency: transparency
    }
  };
};

module.exports = {
  getGameFairnessReport
};
