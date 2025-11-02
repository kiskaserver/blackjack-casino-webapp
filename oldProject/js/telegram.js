// ===== ИНТЕГРАЦИЯ С TELEGRAM WEB APP =====

class TelegramIntegration {
    constructor() {
        this.tg = window.Telegram?.WebApp;
        this.user = null;
        this.initTelegram();
    }

    // Инициализация Telegram Web App
    initTelegram() {
        if (!this.tg) {
            console.log('Telegram Web App API не найден');
            return;
        }

        // Настраиваем Web App
        this.tg.ready();
        this.tg.expand();
        this.tg.enableClosingConfirmation();

        // Получаем данные пользователя
        this.user = this.tg.initDataUnsafe?.user;
        
        // Настраиваем тему
        this.setupTheme();
        
        // Настраиваем кнопки
        this.setupMainButton();
        this.setupBackButton();
        
        // Обработчики событий
        this.setupEventHandlers();
        
        console.log('Telegram Web App инициализирован:', this.user);
        
        // Персонализируем интерфейс
        if (this.user) {
            this.personalizeInterface();
        }
    }
    
    // Персонализация интерфейса
    personalizeInterface() {
        if (!this.user) return;
        
        // Показываем персональное приветствие
        setTimeout(() => {
            const welcomeMessage = `Привет, ${this.user.first_name}! 🎰 Добро пожаловать в казино!`;
            this.showAlert(welcomeMessage);
        }, 1000);
        
        // Устанавливаем язык интерфейса
        if (this.user.language_code) {
            document.documentElement.lang = this.user.language_code;
        }
        
        // Отправляем событие входа
        this.sendAnalyticsEvent('user_session_start', {
            user_id: this.user.id,
            username: this.user.username,
            first_name: this.user.first_name,
            language_code: this.user.language_code,
            is_premium: this.user.is_premium
        });
    }

    // Настройка темы
    setupTheme() {
        if (!this.tg) return;

        // Применяем цвета темы Telegram
        const root = document.documentElement;
        const themeParams = this.tg.themeParams;
        
        if (themeParams.bg_color) {
            root.style.setProperty('--tg-bg-color', themeParams.bg_color);
        }
        
        if (themeParams.text_color) {
            root.style.setProperty('--tg-text-color', themeParams.text_color);
        }
        
        if (themeParams.hint_color) {
            root.style.setProperty('--tg-hint-color', themeParams.hint_color);
        }
        
        if (themeParams.button_color) {
            root.style.setProperty('--tg-button-color', themeParams.button_color);
        }
        
        if (themeParams.button_text_color) {
            root.style.setProperty('--tg-button-text-color', themeParams.button_text_color);
        }
    }

    // Настройка главной кнопки
    setupMainButton() {
        if (!this.tg) return;

        this.tg.MainButton.setText('💰 ЗАБРАТЬ ВЫИГРЫШ');
        this.tg.MainButton.color = '#00ff88';
        this.tg.MainButton.textColor = '#ffffff';
        this.tg.MainButton.hide();
    }

    // Настройка кнопки "Назад"
    setupBackButton() {
        if (!this.tg) return;

        this.tg.BackButton.onClick(() => {
            this.confirmExit();
        });
    }

    // Настройка обработчиков событий
    setupEventHandlers() {
        if (!this.tg) return;

        // Обработчик главной кнопки
        this.tg.MainButton.onClick(() => {
            this.handleMainButtonClick();
        });

        // Обработчик события viewport изменения
        this.tg.onEvent('viewportChanged', () => {
            this.handleViewportChange();
        });

        // Обработчик закрытия приложения
        this.tg.onEvent('beforeClose', () => {
            return this.handleBeforeClose();
        });
    }

    // Показать главную кнопку с выигрышем
    showMainButtonWithWin(amount) {
        if (!this.tg) return;

        this.tg.MainButton.setText(`💰 ЗАБРАТЬ ${amount} 💎`);
        this.tg.MainButton.show();
        
        // Вибрация
        this.hapticFeedback('success');
    }

    // Скрыть главную кнопку
    hideMainButton() {
        if (!this.tg) return;
        this.tg.MainButton.hide();
    }

    // Обработка клика по главной кнопке
    handleMainButtonClick() {
        if (!this.tg) return;

        // Отправляем данные о выигрыше в бота
        this.sendGameResult();
        
        // Показываем уведомление
        this.showAlert('💰 Выигрыш успешно зачислен!');
        
        // Скрываем кнопку
        this.hideMainButton();
        
        // Вибрация
        this.hapticFeedback('success');
    }

    // Отправка результатов игры в бота
    sendGameResult() {
        if (!this.tg || !window.game) return;

        const gameData = {
            action: 'game_result',
            user_id: this.user?.id,
            balance: window.game.playerBalance,
            level: window.game.playerLevel,
            bet: window.game.currentBet,
            timestamp: Date.now()
        };

        this.tg.sendData(JSON.stringify(gameData));
    }

    // Отправка статистики
    sendStats(stats) {
        if (!this.tg) return;

        const data = {
            action: 'stats_update',
            user_id: this.user?.id,
            stats: stats,
            timestamp: Date.now()
        };

        this.tg.sendData(JSON.stringify(data));
    }

    // Тактильная обратная связь
    hapticFeedback(type = 'light') {
        if (!this.tg?.HapticFeedback) return;

        switch (type) {
            case 'success':
                this.tg.HapticFeedback.notificationOccurred('success');
                break;
            case 'error':
                this.tg.HapticFeedback.notificationOccurred('error');
                break;
            case 'warning':
                this.tg.HapticFeedback.notificationOccurred('warning');
                break;
            case 'light':
                this.tg.HapticFeedback.impactOccurred('light');
                break;
            case 'medium':
                this.tg.HapticFeedback.impactOccurred('medium');
                break;
            case 'heavy':
                this.tg.HapticFeedback.impactOccurred('heavy');
                break;
            case 'selection':
                this.tg.HapticFeedback.selectionChanged();
                break;
        }
    }

    // Показать всплывающее уведомление
    showAlert(message) {
        if (!this.tg) {
            alert(message);
            return;
        }
        
        this.tg.showAlert(message);
    }

    // Показать подтверждение
    showConfirm(message, callback) {
        if (!this.tg) {
            callback(confirm(message));
            return;
        }
        
        this.tg.showConfirm(message, callback);
    }

    // Подтверждение выхода
    confirmExit() {
        this.showConfirm(
            'Вы уверены, что хотите выйти из игры?',
            (confirmed) => {
                if (confirmed) {
                    this.tg.close();
                }
            }
        );
    }

    // Обработка изменения viewport
    handleViewportChange() {
        // Адаптируем интерфейс под новые размеры
        const viewport = this.tg.viewportHeight;
        const container = document.querySelector('.game-container');
        
        if (container && viewport) {
            container.style.minHeight = `${viewport}px`;
        }
    }

    // Обработка перед закрытием
    handleBeforeClose() {
        // Отправляем данные сессии
        this.sendSessionData();
        
        // Сохраняем состояние игры перед закрытием
        if (window.game && window.game.gameInProgress) {
            this.sendGameResult();
            return false; // Предотвращаем закрытие
        }
        return true; // Разрешаем закрытие
    }

    // Получить информацию о пользователе
    getUserInfo() {
        return this.user;
    }

    // Проверить, запущено ли в Telegram
    isInTelegram() {
        return !!this.tg;
    }

    // Установить заголовок HeaderColor
    setHeaderColor(color) {
        if (!this.tg) return;
        this.tg.setHeaderColor(color);
    }

    // Установить цвет фона
    setBackgroundColor(color) {
        if (!this.tg) return;
        this.tg.setBackgroundColor(color);
    }

    // Открыть ссылку
    openLink(url) {
        if (!this.tg) {
            window.open(url, '_blank');
            return;
        }
        
        this.tg.openLink(url);
    }

    // Открыть Telegram ссылку
    openTelegramLink(url) {
        if (!this.tg) {
            window.open(url, '_blank');
            return;
        }
        
        this.tg.openTelegramLink(url);
    }

    // Поделиться результатом
    shareResult(text, url) {
        if (!this.tg) {
            if (navigator.share) {
                navigator.share({ title: text, url: url });
            } else {
                this.copyToClipboard(text + ' ' + url);
                this.showAlert('Результат скопирован в буфер обмена!');
            }
            return;
        }

        // В Telegram можно использовать специальные методы
        this.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`);
    }

    // Копировать в буфер обмена
    copyToClipboard(text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text);
        } else {
            // Fallback для старых браузеров
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
        }
    }

    // Запросить разрешения
    requestPermissions() {
        if (!this.tg) return;
        
        // Запрашиваем разрешение на уведомления (если поддерживается)
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }

    // Отправить событие в аналитику
    sendAnalyticsEvent(eventName, parameters = {}) {
        if (!this.tg) return;

        const analyticsData = {
            action: 'analytics_event',
            event: eventName,
            parameters: {
                ...parameters,
                user_id: this.user?.id,
                timestamp: Date.now()
            }
        };

        this.tg.sendData(JSON.stringify(analyticsData));
    }
    
    // Показать уведомление о достижении
    showAchievementNotification(achievement) {
        if (!this.tg) return;
        
        this.showAlert(`🏆 Новое достижение!\n${achievement}`);
        this.hapticFeedback('success');
        
        // Отправляем в аналитику
        this.sendAnalyticsEvent('achievement_notification_shown', {
            achievement: achievement
        });
    }
    
    // Показать уведомление о выигрыше
    showWinNotification(amount, result) {
        if (!this.tg) return;
        
        let message = '';
        switch (result) {
            case 'blackjack':
                message = `🎉 БЛЭКДЖЕК!\nВы выиграли ${amount} 💎`;
                break;
            case 'win':
                message = `🎊 ПОБЕДА!\nВы выиграли ${amount} 💎`;
                break;
            default:
                message = `💰 Выигрыш: ${amount} 💎`;
        }
        
        this.showAlert(message);
        this.hapticFeedback('success');
    }
    
    // Установить прогресс загрузки
    showProgress() {
        if (!this.tg) return;
        
        this.tg.MainButton.showProgress();
    }
    
    // Скрыть прогресс загрузки
    hideProgress() {
        if (!this.tg) return;
        
        this.tg.MainButton.hideProgress();
    }
    
    // Отправить данные о сессии при выходе
    sendSessionData() {
        if (!this.tg || !window.playerStats) return;
        
        const stats = window.playerStats.getDisplayStats();
        const sessionData = {
            action: 'session_end',
            user_id: this.user?.id,
            session_stats: stats.currentSession,
            total_stats: {
                totalGames: stats.totalGames,
                winRate: stats.winRate,
                netProfit: stats.netProfit
            },
            timestamp: Date.now()
        };
        
        this.tg.sendData(JSON.stringify(sessionData));
    }
}

// Глобальный экземпляр интеграции
let telegramApp;

    // Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    telegramApp = new TelegramIntegration();
    
    // Ждем инициализации игры
    const waitForGame = () => {
        if (window.game) {
            setupGameIntegration();
        } else {
            setTimeout(waitForGame, 100);
        }
    };
    waitForGame();
});

// Настройка интеграции с игрой
function setupGameIntegration() {
    // Переопределяем метод окончания игры
    const originalEndGame = window.game.endGame;
    window.game.endGame = function(result, winAmount = 0) {
        originalEndGame.call(this, result, winAmount);
        
        // Отправляем данные в Telegram
        if (telegramApp && winAmount > 0) {
            telegramApp.showMainButtonWithWin(winAmount);
            telegramApp.showWinNotification(winAmount, result);
            telegramApp.sendAnalyticsEvent('game_win', {
                result: result,
                winAmount: winAmount,
                balance: this.playerBalance
            });
        } else if (telegramApp) {
            telegramApp.hapticFeedback('error');
            telegramApp.sendAnalyticsEvent('game_lose', {
                result: result,
                balance: this.playerBalance
            });
        }
    };
    
    // Переопределяем методы для звуков
    const originalPlaySound = window.game.playSound;
    window.game.playSound = function(type) {
        if (telegramApp) {
            switch (type) {
                case 'win':
                    telegramApp.hapticFeedback('success');
                    break;
                case 'lose':
                    telegramApp.hapticFeedback('error');
                    break;
                case 'deal':
                case 'hit':
                    telegramApp.hapticFeedback('light');
                    break;
                case 'double':
                    telegramApp.hapticFeedback('medium');
                    break;
                default:
                    telegramApp.hapticFeedback('selection');
            }
        }
        
        originalPlaySound.call(this, type);
    };
    
    // Интеграция со статистикой
    if (window.playerStats) {
        const originalUpdateGameStats = window.playerStats.updateGameStats;
        window.playerStats.updateGameStats = function(result, betAmount, winAmount = 0) {
            originalUpdateGameStats.call(this, result, betAmount, winAmount);
            
            // Отправляем обновленную статистику в Telegram
            if (telegramApp) {
                const stats = this.getDisplayStats();
                telegramApp.sendStats(stats);
                
                // Отправляем событие аналитики
                telegramApp.sendAnalyticsEvent('stats_update', {
                    totalGames: stats.totalGames,
                    winRate: stats.winRate,
                    netProfit: stats.netProfit
                });
            }
        };
    }
    
    // Интеграция с достижениями
    if (window.game.showAchievement) {
        const originalShowAchievement = window.game.showAchievement;
        window.game.showAchievement = function(text) {
            originalShowAchievement.call(this, text);
            
            // Уведомляем Telegram о новом достижении
            if (telegramApp) {
                telegramApp.showAchievementNotification(text);
                telegramApp.sendAnalyticsEvent('achievement_unlocked', {
                    achievement: text
                });
            }
        };
    }
}
});

// Добавляем стили для Telegram темы
const telegramStyles = document.createElement('style');
telegramStyles.textContent = `
    /* Адаптация под темы Telegram */
    @media (prefers-color-scheme: light) {
        body {
            background: var(--tg-bg-color, linear-gradient(135deg, #f8f9fa 0%, #e9ecef 50%, #dee2e6 100%));
            color: var(--tg-text-color, #333);
        }
        
        .game-table {
            background: linear-gradient(45deg, rgba(255,255,255,0.1), rgba(248,249,250,0.1));
        }
    }
    
    /* Стили для мобильных устройств в Telegram */
    @media (max-width: 480px) {
        .game-container {
            padding: 5px;
        }
        
        .game-header {
            padding: 15px;
        }
        
        .logo-text {
            font-size: 1.5rem;
        }
        
        .action-btn {
            padding: 12px 20px;
            font-size: 1rem;
        }
    }
`;
document.head.appendChild(telegramStyles);

// Экспорт для использования в других файлах
window.telegramApp = telegramApp;


