# Blackjack Casino - Production Deployment Guide

## Overview

This Blackjack Casino webapp now includes comprehensive features:

- **Background Anti-Fraud Checks**: Redis queues with velocity and daily profit cap monitoring
- **Crypto Withdrawal Batching**: Automated batch processing with urgency handling
- **Enhanced Admin Panel**: Complete user management, demo account controls, and security monitoring
- **Comprehensive Testing**: Jest test framework with full coverage
- **Database Migrations**: Knex.js migration system for schema management

## Prerequisites

- Node.js 16+
- PostgreSQL 12+
- Redis 6+
- PM2 (for production process management)

## Quick Start

### 1. Database Setup

```bash
# Create production database
createdb blackjack_casino_production

# Run migrations
cd server
npm run migrate
```

### 2. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your production values
nano .env
```

### 3. Install Dependencies

```bash
# Install server dependencies
cd server
npm install

# Install admin dependencies (if separate)
cd ../admin
npm install
```

### 4. Run Tests

```bash
cd server
npm test
```

### 5. Start Services

#### Development Mode
```bash
cd server
npm run dev
```

#### Production Mode with PM2
```bash
cd server
pm2 start ecosystem.config.js
```

## Key Features

### Anti-Fraud System

- **Velocity Checking**: Monitors games per hour per player
- **Daily Profit Caps**: Limits maximum daily winnings
- **Background Processing**: Redis queues handle checks asynchronously
- **Risk Event Logging**: Comprehensive audit trail

### Crypto Withdrawal Batching

- **Automated Batching**: Groups withdrawals for efficient processing
- **Urgency Handling**: Higher fees for immediate processing
- **Batch Scheduling**: Configurable intervals and sizes
- **Admin Controls**: Manual batch creation and processing

### Enhanced Admin Panel

- **Player Management**: View, edit, block/unblock players
- **Demo Account Controls**: Configure demo balances and settings
- **Withdrawal Monitoring**: Track and manage crypto batches
- **Security Dashboard**: Monitor risk events and fraud detection

### Database Schema

Key tables include:
- `players`: User accounts and balances
- `player_settings`: Individual player configurations
- `withdrawal_batches`: Crypto payout batching
- `risk_events`: Anti-fraud event logging
- `transactions`: Financial transaction history

## Configuration

### Environment Variables

See `.env.example` for all available configuration options.

Key production settings:

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Redis
REDIS_URL=redis://host:6379

# Anti-Fraud
VELOCITY_LIMIT_GAMES_PER_HOUR=100
DAILY_PROFIT_LIMIT=10000

# Crypto Batching
CRYPTO_BATCH_SIZE=10
CRYPTO_BATCH_INTERVAL_MINUTES=60
```

### Admin Access

Configure admin users in environment:

```bash
ADMIN_IDS=123456789,987654321
ADMIN_SECRETS=secret1,secret2
```

Access admin panel at: `https://yourdomain.com/admin/`

## Monitoring

### Health Checks

```bash
# Check main application
curl https://yourdomain.com/health

# Check Redis connection
redis-cli ping

# Check database connection
psql $DATABASE_URL -c "SELECT 1;"
```

### Logs

PM2 logs are stored in:
- `./logs/out.log` - Application output
- `./logs/err.log` - Application errors
- `./logs/worker-out.log` - Worker output
- `./logs/worker-err.log` - Worker errors

View logs:
```bash
pm2 logs
pm2 logs blackjack-casino-main
pm2 logs blackjack-casino-worker
```

## Maintenance

### Database Migrations

Create new migration:
```bash
npx knex migrate:make migration_name
```

Run migrations:
```bash
npm run migrate
```

Rollback migration:
```bash
npx knex migrate:rollback
```

### Redis Queue Management

Monitor queues:
```bash
# Check risk assessment queue
redis-cli LLEN risk_assessment_queue

# Check payout queue  
redis-cli LLEN payout_queue
```

### Worker Management

```bash
# Restart workers
pm2 restart blackjack-casino-worker

# Check worker status
pm2 show blackjack-casino-worker
```

## Security

### Anti-Fraud Configuration

The system includes multiple layers of fraud detection:

1. **Velocity Limits**: Configurable games per hour
2. **Profit Caps**: Daily winning limits
3. **Pattern Detection**: Unusual win rate analysis
4. **Real-time Monitoring**: Immediate risk event logging

### Data Protection

- All sensitive data is encrypted in transit
- Database passwords should use strong authentication
- Redis should be secured with AUTH if exposed
- Admin access requires strong secrets

## Troubleshooting

### Common Issues

1. **Worker not processing jobs**
   - Check Redis connection
   - Verify worker is running: `pm2 list`
   - Check worker logs: `pm2 logs blackjack-casino-worker`

2. **Database connection errors**
   - Verify DATABASE_URL format
   - Check PostgreSQL service status
   - Ensure database exists and user has permissions

3. **Admin panel not loading**
   - Check ADMIN_IDS and ADMIN_SECRETS configuration
   - Verify admin static files are served correctly
   - Check browser console for JavaScript errors

### Performance Tuning

- Monitor Redis memory usage
- Consider connection pooling for high traffic
- Use PM2 clustering for horizontal scaling
- Implement database query optimization

## Deployment Scripts

The repository includes:
- `ecosystem.config.js` - PM2 configuration
- `package.json` - NPM scripts for common tasks
- Migration files for database schema
- Comprehensive test suite

For production deployment, consider using:
- Nginx as reverse proxy
- SSL/TLS certificates
- Database connection pooling
- Redis clustering for high availability

## Support

For issues or questions:
1. Check logs for error details
2. Review configuration in `.env`
3. Verify all services are running
4. Test with provided test suite: `npm test`