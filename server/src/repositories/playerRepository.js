const db = require('../config/database');

const findPlayerByTelegramId = async telegramId => {
  const result = await db.query(
    `SELECT id, telegram_id, username, first_name, last_name, balance, demo_balance, level, created_at
     FROM players
     WHERE telegram_id = $1
    `,
    [telegramId]
  );
  return result.rows[0] || null;
};

const getPlayerById = async playerId => {
  const res = await db.query(
    `SELECT id, telegram_id, username, first_name, last_name, balance, demo_balance, level, created_at
     FROM players
     WHERE id = $1
    `,
    [playerId]
  );
  return res.rows[0] || null;
};

const getOrCreatePlayer = async ({ telegramId, username, firstName, lastName }) => {
  const existing = await findPlayerByTelegramId(telegramId);
  if (existing) {
    return existing;
  }

  const inserted = await db.query(
    `INSERT INTO players (telegram_id, username, first_name, last_name)
     VALUES ($1, $2, $3, $4)
     RETURNING id, telegram_id, username, first_name, last_name, balance, demo_balance, level, created_at
    `,
    [telegramId, username, firstName, lastName]
  );

  return inserted.rows[0];
};

const updateBalance = async ({ playerId, amount, reason, referenceId, walletType = 'real' }) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const lock = await client.query('SELECT balance, demo_balance FROM players WHERE id = $1 FOR UPDATE', [playerId]);
    if (lock.rows.length === 0) {
      throw new Error('Player not found');
    }

    const row = lock.rows[0];
    const targetColumn = walletType === 'demo' ? 'demo_balance' : 'balance';
    const currentValue = Number(row[targetColumn]);
    const newBalance = currentValue + Number(amount);

    if (newBalance < 0) {
      throw new Error(walletType === 'demo' ? 'Demo balance cannot go negative' : 'Insufficient balance');
    }

    const update = await client.query(
      `UPDATE players SET ${targetColumn} = $1, updated_at = NOW() WHERE id = $2 RETURNING balance, demo_balance`,
      [newBalance, playerId]
    );

    await client.query(
      `INSERT INTO transactions (player_id, amount, reason, reference_id, wallet_type)
       VALUES ($1, $2, $3, $4, $5)
      `,
      [playerId, amount, reason, referenceId, walletType]
    );

    await client.query('COMMIT');

    const balances = update.rows[0];
    const realBalance = Number(balances.balance);
    const demoBalance = Number(balances.demo_balance);

    return {
      walletType,
      walletBalance: walletType === 'demo' ? demoBalance : realBalance,
      realBalance,
      demoBalance
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const getPlayerStats = async ({ playerId }) => {
  const res = await db.query(
    `SELECT
        wallet_type,
        COUNT(*) FILTER (WHERE result IS NOT NULL) AS total_games,
        COUNT(*) FILTER (WHERE result = 'win') AS wins,
        COUNT(*) FILTER (WHERE result = 'lose') AS losses,
        COUNT(*) FILTER (WHERE result = 'blackjack') AS blackjacks,
        COUNT(*) FILTER (WHERE result = 'push') AS pushes,
        COALESCE(SUM(win_amount) - SUM(final_bet), 0) AS net_profit
     FROM game_rounds
     WHERE player_id = $1
     GROUP BY wallet_type
    `,
    [playerId]
  );

  const defaultStats = () => ({
    totalGames: 0,
    wins: 0,
    losses: 0,
    blackjacks: 0,
    pushes: 0,
    netProfit: 0
  });

  const wallets = {
    real: defaultStats(),
    demo: defaultStats()
  };

  res.rows.forEach(row => {
    const key = row.wallet_type === 'demo' ? 'demo' : 'real';
    wallets[key] = {
      totalGames: Number(row.total_games || 0),
      wins: Number(row.wins || 0),
      losses: Number(row.losses || 0),
      blackjacks: Number(row.blackjacks || 0),
      pushes: Number(row.pushes || 0),
      netProfit: Number(row.net_profit || 0)
    };
  });

  return {
    totalGames: wallets.real.totalGames,
    wins: wallets.real.wins,
    losses: wallets.real.losses,
    blackjacks: wallets.real.blackjacks,
    pushes: wallets.real.pushes,
    netProfit: wallets.real.netProfit,
    wallets
  };
};

const listPlayers = async ({ limit = 50, offset = 0 }) => {
  const res = await db.query(
    `SELECT id, telegram_id, username, first_name, last_name, balance, demo_balance, level, created_at, updated_at
     FROM players
     ORDER BY created_at DESC
     LIMIT $1 OFFSET $2
    `,
    [limit, offset]
  );
  return res.rows;
};

const updateStatus = async ({ playerId, status }) => {
  const res = await db.query(
    `UPDATE players SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING status`,
    [playerId, status]
  );
  return res.rows[0] || null;
};

module.exports = {
  getOrCreatePlayer,
  updateBalance,
  getPlayerStats,
  findPlayerByTelegramId,
  getPlayerById,
  listPlayers,
  updateStatus
};
