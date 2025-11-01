module.exports = {
  apps: [
    {
      name: 'blackjack-casino-main',
      script: './src/app.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        // Database configuration
        DATABASE_URL: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/blackjack_casino',
        
        // Redis configuration
        REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
        
        // Telegram configuration
        TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
        TELEGRAM_WEBHOOK_URL: process.env.TELEGRAM_WEBHOOK_URL,
        
        // Admin configuration
        ADMIN_IDS: process.env.ADMIN_IDS || 'admin1,admin2',
        ADMIN_SECRETS: process.env.ADMIN_SECRETS || 'secret1,secret2',
        
        // Game configuration
        HOUSE_EDGE: process.env.HOUSE_EDGE || '0.005',
        MAX_BET: process.env.MAX_BET || '1000',
        MIN_BET: process.env.MIN_BET || '10',
        
        // Anti-fraud configuration
        VELOCITY_LIMIT_GAMES_PER_HOUR: process.env.VELOCITY_LIMIT_GAMES_PER_HOUR || '100',
        DAILY_PROFIT_LIMIT: process.env.DAILY_PROFIT_LIMIT || '10000',
        
        // Crypto withdrawal configuration
        CRYPTO_BATCH_SIZE: process.env.CRYPTO_BATCH_SIZE || '10',
        CRYPTO_BATCH_INTERVAL_MINUTES: process.env.CRYPTO_BATCH_INTERVAL_MINUTES || '60',
        CRYPTO_AUTO_APPROVAL_THRESHOLD: process.env.CRYPTO_AUTO_APPROVAL_THRESHOLD || '100',
        CRYPTO_URGENT_FEE_MULTIPLIER: process.env.CRYPTO_URGENT_FEE_MULTIPLIER || '2.0',
        
        // Payment provider configuration
        CRYPTOMUS_API_KEY: process.env.CRYPTOMUS_API_KEY,
        CRYPTOMUS_MERCHANT_ID: process.env.CRYPTOMUS_MERCHANT_ID,
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 4000,
    },
    {
      name: 'blackjack-casino-worker',
      script: './src/workers/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        // Inherit same environment variables as main app
        DATABASE_URL: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/blackjack_casino',
        REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
        VELOCITY_LIMIT_GAMES_PER_HOUR: process.env.VELOCITY_LIMIT_GAMES_PER_HOUR || '100',
        DAILY_PROFIT_LIMIT: process.env.DAILY_PROFIT_LIMIT || '10000',
        CRYPTO_BATCH_SIZE: process.env.CRYPTO_BATCH_SIZE || '10',
        CRYPTO_BATCH_INTERVAL_MINUTES: process.env.CRYPTO_BATCH_INTERVAL_MINUTES || '60',
        CRYPTO_AUTO_APPROVAL_THRESHOLD: process.env.CRYPTO_AUTO_APPROVAL_THRESHOLD || '100',
        CRYPTO_URGENT_FEE_MULTIPLIER: process.env.CRYPTO_URGENT_FEE_MULTIPLIER || '2.0',
      },
      error_file: './logs/worker-err.log',
      out_file: './logs/worker-out.log',
      log_file: './logs/worker-combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 4000,
    }
  ],

  deploy: {
    production: {
      user: 'deploy',
      host: ['your-server.com'],
      ref: 'origin/main',
      repo: 'https://github.com/your-username/blackjack-casino-webapp.git',
      path: '/var/www/blackjack-casino',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run migrate && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};