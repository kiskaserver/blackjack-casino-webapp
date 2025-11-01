# 🎰 BlackJack Casino - Enterprise-Grade Gaming Platform

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-12+-blue.svg)](https://postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-6+-red.svg)](https://redis.io/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Полнофункциональная платформа онлайн-казино с игрой в Блэкджек, построенная на современных веб-технологиях с поддержкой Telegram Web App, продвинутой системой антифрода и криптовалютными выплатами.

## 🌟 Основные возможности

### 🎮 Игровая механика
- **Классический Блэкджек** с соблюдением всех правил казино
- **Серверная авторитетность** - вся логика на backend, защита от читов
- **Двойные счета**: реальный и демо режимы с гибкими настройками
- **Адаптивный интерфейс** для всех устройств и Telegram Web App
- **Реалистичная анимация карт** и профессиональные игровые эффекты
- **Звуковое сопровождение** с Web Audio API и Haptic Feedback
- **Система достижений** и детальная статистика игрока

### 🛡️ Безопасность и антифрод
- **Фоновые проверки скорости игры** (Redis + BullMQ)
- **Лимиты дневной прибыли** с автоматическим мониторингом
- **Система анализа рисков** с логированием подозрительной активности
- **Background Workers** для асинхронной обработки безопасности
- **JWT аутентификация** и защищенные API endpoints
- **Валидация всех пользовательских данных** на сервере

### 💳 Платежная система
- **Telegram Stars** интеграция для микроплатежей
- **Cryptomus** поддержка для всех основных криптовалют
- **Батчинг выводов** с автоматическим группированием транзакций
- **Срочные выплаты** с настраиваемыми комиссиями
- **Автоматическое одобрение** мелких сумм с защитой от злоупотреблений

### 👨‍💼 Административная панель
- **Управление игроками**: просмотр, блокировка, редактирование балансов
- **Настройка демо-счетов** с полной конфигурацией
- **Мониторинг выводов** и управление батчами криптоплатежей
- **Панель безопасности** с детальным анализом событий рисков
- **Статистика и аналитика** в реальном времени
- **Настройки house edge** и индивидуальная подкрутка

### 📱 Telegram интеграция
- **Native Web App** с полной поддержкой API
- **Haptic Feedback** для реалистичных тактильных ощущений
- **Theme Adaptation** автоматическая под темы Telegram
- **Push уведомления** о важных игровых событиях
- **Seamless интеграция** с ботом для UX без швов

## 🏗️ Архитектура системы

```
BlackJack Casino Enterprise Platform
├── 🎮 Frontend Layer
│   ├── Game Engine (game.js) - Игровая логика клиента
│   ├── API Client (api.js) - HTTP клиент с авторизацией
│   ├── Telegram Integration (telegram.js) - Native Web App
│   ├── Sound System (sounds.js) - Web Audio API
│   ├── Statistics Engine (statistics.js) - Аналитика
│   └── Animation Controller (animations.js) - Эффекты
├── 🔧 Backend Layer
│   ├── Express.js API Server - RESTful endpoints
│   ├── Game Logic Service - Серверная логика игры
│   ├── Anti-Fraud Service - Система безопасности
│   ├── Payment Processing - Обработка платежей
│   ├── Admin Panel API - Административные функции
│   └── Background Workers - Асинхронные задачи
├── 🗄️ Data Layer
│   ├── PostgreSQL Database
│   │   ├── Players & Balances - Пользователи
│   │   ├── Game History - История игр
│   │   ├── Risk Events - События безопасности
│   │   ├── Withdrawal Batches - Батчи выводов
│   │   └── Transaction Logs - Журнал транзакций
│   └── Redis Cache & Queues
│       ├── Session Storage - Сессии игроков
│       ├── Risk Assessment Jobs - Задачи анализа
│       ├── Payout Processing - Обработка выплат
│       └── Batch Scheduling - Планировщик батчей
└── 🔗 External Integrations
    ├── Telegram Bot API - Авторизация и уведомления
    ├── Cryptomus API - Криптовалютные платежи
    └── Monitoring Services - Метрики и алерты
```

## 🚀 Быстрый старт

### Системные требования

- **Node.js** 18.0.0+ (LTS рекомендуется)
- **PostgreSQL** 12.0.0+ с поддержкой JSON
- **Redis** 6.0.0+ для очередей и кеширования
- **npm** 8.0.0+ или **yarn** 1.22.0+
- **HTTPS** для production (обязательно для Telegram/Cryptomus)

### Пошаговая установка

1. **Клонирование и подготовка**
```bash
git clone https://github.com/your-username/blackjack-casino-enterprise.git
cd blackjack-casino-enterprise
```

2. **Backend настройка**
```bash
cd server
npm install
cp .env.example .env
# Отредактируйте .env с вашими настройками
```

3. **База данных**
```bash
# Создание БД
createdb blackjack_casino_production

# Миграции
npm run migrate

# Проверка подключения
npm run db:test
```

4. **Redis настройка**
```bash
# Запуск Redis (если локально)
redis-server

# Проверка подключения
redis-cli ping
```

5. **Запуск разработки**
```bash
# Backend API (порт 3000)
npm run dev

# Workers (отдельный терминал)
npm run worker

# Тесты
npm test
```

6. **Frontend настройка**
```bash
# В корне проекта
cd ..
python -m http.server 8080
# или
npx http-server -p 8080
```

### Доступ к приложению

- **🎰 Игра**: http://localhost:8080
- **👨‍💼 Админ панель**: http://localhost:8080/admin
- **📊 API Health**: http://localhost:3000/health
- **📖 API Docs**: http://localhost:3000/api/docs

## 📋 Детальная конфигурация

### Основные настройки среды (.env)

```bash
# ===== ОСНОВНАЯ КОНФИГУРАЦИЯ =====
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# ===== БАЗА ДАННЫХ =====
DATABASE_URL=postgresql://user:password@localhost:5432/blackjack_casino
DB_POOL_MIN=2
DB_POOL_MAX=10

# ===== REDIS =====
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your_redis_password

# ===== TELEGRAM =====
TELEGRAM_BOT_TOKEN=1234567890:ABCDEF1234567890abcdef1234567890ABC
TELEGRAM_WEBHOOK_URL=https://yourdomain.com/api/telegram/webhook
TELEGRAM_PROVIDER_TOKEN=your_provider_token

# ===== АДМИНЫ =====
ADMIN_IDS=123456789,987654321
ADMIN_SECRETS=superSecretPassword1,superSecretPassword2
ADMIN_PANEL_SECRET=adminPanelPassword

# ===== ИГРА =====
HOUSE_EDGE=0.005
MAX_BET=1000
MIN_BET=10
DEFAULT_DEMO_BALANCE=10000

# ===== АНТИФРОД =====
VELOCITY_LIMIT_GAMES_PER_HOUR=100
DAILY_PROFIT_LIMIT=10000
ENABLE_ANTIFRAUD=true

# ===== КРИПТОПЛАТЕЖИ =====
CRYPTO_BATCH_SIZE=10
CRYPTO_BATCH_INTERVAL_MINUTES=60
CRYPTO_AUTO_APPROVAL_THRESHOLD=100

# ===== CRYPTOMUS =====
CRYPTOMUS_MERCHANT_ID=your_merchant_id
CRYPTOMUS_API_KEY=your_api_key
CRYPTOMUS_WEBHOOK_URL=https://yourdomain.com/api/payments/cryptomus/webhook
```

### Telegram Bot настройка

1. **Создание бота**
```bash
# Отправьте @BotFather
/newbot
# Следуйте инструкциям
```

2. **Настройка Web App**
```bash
# В чате с @BotFather
/setdomain
# Укажите ваш домен: yourdomain.com

/setmenubutton
# Добавьте кнопку с URL: https://yourdomain.com
```

3. **Webhook конфигурация**
```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://yourdomain.com/api/telegram/webhook"}'
```

### Cryptomus интеграция

1. **Merchant регистрация**
   - Регистрация на https://cryptomus.com
   - KYC верификация
   - Получение Merchant ID и API ключа

2. **Webhook настройка**
   - URL: `https://yourdomain.com/api/payments/cryptomus/webhook`
   - Поддерживаемые валюты: BTC, ETH, USDT, USDC, LTC
   - Автоматическое конвертирование в Telegram Stars

## 🎯 Игровая механика

### Правила Блэкджека

```javascript
const gameRules = {
    goal: "Набрать сумму карт максимально близкую к 21, не превышая её",
    cardValues: {
        "A": [1, 11], // Автоматический выбор
        "J": 10, "Q": 10, "K": 10,
        "2-10": "номинал"
    },
    payouts: {
        blackjack: 1.5,    // 3:2
        win: 1.0,          // 1:1
        push: 0,           // возврат ставки
        lose: -1.0         // потеря ставки
    },
    dealerRules: {
        hitsOnSoft17: true,
        mustHitUntil17: true,
        standOnHard17: true
    }
};
```

### Серверная логика

```javascript
// Пример валидации хода
const validatePlayerAction = (gameState, action) => {
    // Проверка состояния игры
    if (gameState.status !== 'pending') {
        throw new Error('Игра уже завершена');
    }
    
    // Проверка доступности действия
    if (action === 'double' && gameState.playerCards.length !== 2) {
        throw new Error('Удвоение доступно только с первыми двумя картами');
    }
    
    // Проверка баланса для удвоения
    if (action === 'double' && player.balance < gameState.bet) {
        throw new Error('Недостаточно средств для удвоения');
    }
    
    return true;
};
```

## 🛡️ Система безопасности

### Anti-Fraud мониторинг

```javascript
// Конфигурация антифрод системы
const antifraudConfig = {
    velocityCheck: {
        enabled: true,
        threshold: 100,        // игр в час
        windowMinutes: 60,
        action: 'flag_account',
        severity: 'medium'
    },
    profitLimit: {
        enabled: true,
        dailyLimit: 10000,     // звезд в день
        weeklyLimit: 50000,    // звезд в неделю
        action: 'suspend_withdrawals',
        severity: 'high'
    },
    patternDetection: {
        enabled: true,
        suspiciousWinRate: 85, // % побед
        minimumGames: 50,      // минимум игр для анализа
        action: 'manual_review',
        severity: 'high'
    },
    behaviorAnalysis: {
        enabled: true,
        unusualBettingPatterns: true,
        rapidGameplay: true,
        multipleAccounts: true
    }
};
```

### Background Workers

```javascript
// Пример worker'а для анализа рисков
const riskAssessmentWorker = async (job) => {
    const { playerId, eventType, gameData } = job.data;
    
    // Анализ скорости игры
    const recentGames = await getRecentGames(playerId, 60); // последний час
    if (recentGames.length > VELOCITY_LIMIT) {
        await createRiskEvent({
            playerId,
            type: 'velocity_threshold',
            severity: 'medium',
            details: { gamesPerHour: recentGames.length }
        });
    }
    
    // Анализ дневной прибыли
    const dailyProfit = await getDailyProfit(playerId);
    if (dailyProfit > DAILY_PROFIT_LIMIT) {
        await createRiskEvent({
            playerId,
            type: 'profit_threshold',
            severity: 'high',
            details: { dailyProfit }
        });
        
        // Автоматическая приостановка выводов
        await suspendWithdrawals(playerId);
    }
};
```

## 💰 Платежная система

### Поддерживаемые методы

1. **Telegram Stars**
   ```javascript
   const telegramStarsConfig = {
       minAmount: 1,
       maxAmount: 2500,
       fees: {
           platform: 0.05,    // 5%
           telegram: 0.30     // 30% (Telegram комиссия)
       },
       instantProcessing: true,
       refundSupport: true
   };
   ```

2. **Cryptomus**
   ```javascript
   const cryptomusConfig = {
       supportedCurrencies: ['BTC', 'ETH', 'USDT', 'USDC', 'LTC'],
       minAmounts: {
           BTC: 0.0001,
           ETH: 0.001,
           USDT: 1,
           USDC: 1,
           LTC: 0.01
       },
       fees: {
           platform: 0.02,    // 2%
           network: 'dynamic'  // зависит от сети
       },
       processingTime: '5-30 minutes'
   };
   ```

### Batch Processing для выводов

```javascript
const batchProcessingConfig = {
    batchSize: 10,                    // транзакций в батче
    intervalMinutes: 60,              // интервал между батчами
    autoApprovalThreshold: 100,       // автоодобрение до 100 звезд
    urgentProcessing: {
        enabled: true,
        feeMultiplier: 2.0,           // x2 комиссия
        maxUrgentPerDay: 3            // лимит срочных выплат
    },
    scheduledBatches: [
        { time: '10:00', timezone: 'UTC' },
        { time: '18:00', timezone: 'UTC' },
        { time: '02:00', timezone: 'UTC' }
    ]
};
```

## 📊 Административная панель

### Основные разделы

#### 1. Dashboard - Общая аналитика
```javascript
const dashboardMetrics = {
    realtime: {
        activeUsers: 'Онлайн игроков',
        gamesInProgress: 'Активных игр',
        totalBets: 'Ставок за час',
        revenue: 'Доход за час'
    },
    daily: {
        newPlayers: 'Новых игроков',
        totalGames: 'Всего игр',
        totalRevenue: 'Общий доход',
        averageBet: 'Средняя ставка'
    },
    security: {
        riskEvents: 'События рисков',
        blockedUsers: 'Заблокированных',
        pendingReviews: 'На модерации'
    }
};
```

#### 2. Управление игроками
- **Поиск и фильтрация** по различным критериям
- **Детальная информация** о каждом игроке
- **История игр** и транзакций
- **Корректировка балансов** с обязательными комментариями
- **Блокировка/разблокировка** с указанием причин
- **Настройка индивидуальных лимитов**

#### 3. Финансовый мониторинг
- **Обработка запросов на вывод** с проверкой
- **Управление батчами** криптоплатежей
- **Настройка комиссий** по методам платежа
- **Отчеты по доходности** и убыткам
- **Контроль ликвидности** системы

#### 4. Безопасность
- **Мониторинг событий рисков** в реальном времени
- **Настройка параметров антифрода**
- **Журнал административных действий**
- **Алерты и уведомления** о критических событиях

## 🧪 Тестирование

### Запуск тестов

```bash
# Полное тестирование
npm test

# Тесты с покрытием
npm run test:coverage

# Только unit тесты
npm run test:unit

# Только интеграционные тесты
npm run test:integration

# E2E тестирование
npm run test:e2e

# Производительность
npm run test:performance
```

### Тестовые сценарии

```javascript
describe('Game Logic Tests', () => {
    test('Player blackjack beats dealer 20', async () => {
        const game = await startTestGame();
        game.dealCards(['A', 'K'], ['10', '10']); // Player BJ vs Dealer 20
        const result = game.settleGame();
        expect(result.outcome).toBe('blackjack');
        expect(result.payout).toBe(game.bet * 2.5);
    });
    
    test('Anti-fraud velocity check triggers', async () => {
        const player = await createTestPlayer();
        // Симулируем 101 игру за час
        for (let i = 0; i < 101; i++) {
            await playTestGame(player.id);
        }
        const riskEvents = await getRiskEvents(player.id);
        expect(riskEvents.some(e => e.type === 'velocity_threshold')).toBe(true);
    });
});
```

## 🚢 Production Deployment

### Docker конфигурация

```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    depends_on:
      - postgres
      - redis
  
  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: blackjack_casino
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
  
  redis:
    image: redis:6-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### PM2 конфигурация

```javascript
// ecosystem.config.js
module.exports = {
    apps: [
        {
            name: 'blackjack-api',
            script: './server/src/app.js',
            instances: 'max',
            exec_mode: 'cluster',
            env: {
                NODE_ENV: 'production'
            }
        },
        {
            name: 'blackjack-worker',
            script: './server/src/workers/index.js',
            instances: 1,
            exec_mode: 'fork'
        }
    ]
};
```

### Мониторинг и логирование

```javascript
// Prometheus метрики
const promClient = require('prom-client');

const gameMetrics = {
    totalGames: new promClient.Counter({
        name: 'blackjack_games_total',
        help: 'Total number of games played',
        labelNames: ['outcome', 'wallet_type']
    }),
    
    playerBalance: new promClient.Histogram({
        name: 'blackjack_player_balance',
        help: 'Player balance distribution',
        buckets: [10, 50, 100, 500, 1000, 5000, 10000]
    }),
    
    riskEvents: new promClient.Counter({
        name: 'blackjack_risk_events_total',
        help: 'Total risk events detected',
        labelNames: ['severity', 'type']
    })
};
```

## 🔌 API Documentation

### Game Endpoints

```typescript
// TypeScript интерфейсы для API
interface GameStartRequest {
    betAmount: number;
    walletType: 'real' | 'demo';
}

interface GameStartResponse {
    success: boolean;
    data: {
        roundId: string;
        playerCards: Card[];
        dealerCards: Card[];
        playerScore: number;
        dealerScore: number;
        baseBet: number;
        finalBet: number;
        status: 'pending' | 'finished';
        balances: {
            real: number;
            demo: number;
        };
    };
}

// POST /api/game/start
app.post('/api/game/start', validateAuth, async (req, res) => {
    const { betAmount, walletType } = req.body;
    const result = await gameService.startRound(req.user.id, betAmount, walletType);
    res.json({ success: true, data: result });
});
```

### Payment Endpoints

```typescript
interface WithdrawalRequest {
    amount: number;
    method: 'telegram_stars' | 'cryptomus';
    wallet?: string; // для криптовалют
    urgent?: boolean; // срочная обработка
}

// POST /api/payments/withdraw
app.post('/api/payments/withdraw', validateAuth, async (req, res) => {
    const withdrawal = await paymentService.requestWithdrawal(
        req.user.id, 
        req.body
    );
    res.json({ success: true, data: withdrawal });
});
```

### Admin Endpoints

```typescript
// GET /admin/api/players?search=&status=&limit=50&offset=0
app.get('/admin/api/players', validateAdmin, async (req, res) => {
    const players = await adminService.getPlayers(req.query);
    res.json({ success: true, data: players });
});

// PUT /admin/api/players/:telegramId/balance
app.put('/admin/api/players/:telegramId/balance', validateAdmin, async (req, res) => {
    const result = await adminService.updatePlayerBalance(
        req.params.telegramId,
        req.body.balance,
        req.body.reason,
        req.admin.id
    );
    res.json({ success: true, data: result });
});
```

## 📈 Производительность и масштабирование

### Оптимизации

```javascript
// Database query optimization
const optimizedQueries = {
    // Индексы для быстрых запросов
    playerLookup: 'CREATE INDEX idx_players_telegram_id ON players(telegram_id)',
    gameHistory: 'CREATE INDEX idx_games_player_created ON games(player_id, created_at)',
    riskEvents: 'CREATE INDEX idx_risk_events_severity_created ON risk_events(severity, created_at)',
    
    // Connection pooling
    pgPool: {
        min: 2,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000
    },
    
    // Redis caching
    cacheStrategies: {
        playerProfile: 'TTL 300s', // 5 минут
        gameRules: 'TTL 3600s',    // 1 час
        riskLimits: 'TTL 1800s'    // 30 минут
    }
};
```

### Горизонтальное масштабирование

```javascript
// Load balancer конфигурация
const loadBalancerConfig = {
    strategy: 'round_robin',
    healthCheck: {
        path: '/health',
        interval: 30000,
        timeout: 5000
    },
    servers: [
        { host: 'api1.blackjack.com', weight: 1 },
        { host: 'api2.blackjack.com', weight: 1 },
        { host: 'api3.blackjack.com', weight: 2 } // более мощный сервер
    ]
};
```

## 🤝 Contributing

### Процесс разработки

1. **Fork репозитория** и создайте feature branch
2. **Следуйте code style** проекта (ESLint + Prettier)
3. **Добавляйте тесты** для новой функциональности
4. **Обновляйте документацию** при необходимости
5. **Создавайте PR** с подробным описанием изменений

### Code Style

```javascript
// .eslintrc.js
module.exports = {
    extends: ['eslint:recommended', '@typescript-eslint/recommended'],
    rules: {
        'no-console': 'warn',
        'prefer-const': 'error',
        'no-unused-vars': 'error',
        'max-len': ['error', { code: 100 }],
        'indent': ['error', 2]
    }
};
```

### Commit Convention

```bash
# Используйте Conventional Commits
feat: добавить поддержку криптовалютных выводов
fix: исправить расчет комиссий для Telegram Stars
docs: обновить API документацию
test: добавить тесты для антифрод системы
refactor: оптимизировать запросы к базе данных
```

## 📄 Лицензия

Данный проект распространяется под лицензией **MIT**. См. файл [LICENSE](LICENSE) для подробной информации.

## 🆘 Поддержка и сообщество

### Получение помощи

- **📋 GitHub Issues**: Сообщения о багах и feature requests
- **💬 GitHub Discussions**: Вопросы по использованию и разработке
- **📖 Wiki**: Расширенная документация и гайды
- **📧 Email**: support@blackjack-casino.com для критических вопросов

### Полезные ссылки

- **🔗 Telegram Bot API**: https://core.telegram.org/bots/webapps
- **💳 Cryptomus API**: https://doc.cryptomus.com/
- **🏗️ BullMQ Documentation**: https://docs.bullmq.io/
- **🐘 PostgreSQL Docs**: https://www.postgresql.org/docs/

### Известные ограничения

- **🍎 Safari iOS**: ограничения Web Audio API в некоторых версиях
- **🖥️ Telegram Desktop**: Haptic Feedback недоступен
- **🌐 IE11**: не поддерживается (требуются современные браузеры)
- **📱 WebView**: некоторые функции могут работать ограниченно

## 🏆 Благодарности

- **Telegram Team** за мощный Web App API
- **BullMQ Contributors** за надежную систему очередей
- **PostgreSQL Community** за превосходную документацию
- **Node.js Ecosystem** за богатство библиотек
- **Open Source Community** за все используемые компоненты

---

<div align="center">

**🎰 Играйте ответственно! Удачи за игровыми столами! 🎲**

*Made with ❤️ for the gaming community*

![Game Preview](https://via.placeholder.com/800x400/0d1421/00ff88?text=BlackJack+Casino+Enterprise)

</div>