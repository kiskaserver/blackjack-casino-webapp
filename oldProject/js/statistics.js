// ===== СИСТЕМА СТАТИСТИКИ ИГРОКА =====

class PlayerStatistics {
    constructor() {
        this.stats = {
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
        
        this.currentSession = {
            startTime: Date.now(),
            gamesPlayed: 0,
            netWinnings: 0,
            biggestWin: 0,
            winStreak: 0
        };
        
        this.loadStats();
        this.startSession();
    }

    // Загрузка статистики из localStorage
    loadStats() {
        try {
            const savedStats = localStorage.getItem('blackjack_player_stats');
            if (savedStats) {
                this.stats = { ...this.stats, ...JSON.parse(savedStats) };
            }
        } catch (error) {
            console.warn('Ошибка загрузки статистики:', error);
        }
    }

    // Сохранение статистики в localStorage
    saveStats() {
        try {
            localStorage.setItem('blackjack_player_stats', JSON.stringify(this.stats));
        } catch (error) {
            console.warn('Ошибка сохранения статистики:', error);
        }
    }

    // Начало новой сессии
    startSession() {
        this.currentSession = {
            startTime: Date.now(),
            gamesPlayed: 0,
            netWinnings: 0,
            biggestWin: 0,
            winStreak: 0
        };
        this.stats.sessionsPlayed++;
        this.stats.lastPlayDate = new Date().toISOString();
    }

    // Обновление статистики после игры
    updateGameStats(result, betAmount, winAmount = 0) {
        this.stats.totalGames++;
        this.stats.handsPlayed++;
        this.currentSession.gamesPlayed++;
        
        // Обновляем средний размер ставки
        this.stats.averageBet = Math.round(
            (this.stats.averageBet * (this.stats.totalGames - 1) + betAmount) / this.stats.totalGames
        );

        switch (result) {
            case 'win':
                this.handleWin(winAmount, betAmount);
                break;
            case 'blackjack':
                this.handleBlackjack(winAmount, betAmount);
                break;
            case 'lose':
            case 'bust':
                this.handleLoss(betAmount);
                break;
            case 'push':
                this.handlePush();
                break;
        }

        this.updateStreaks(result);
        this.saveStats();
        this.checkNewAchievements();
    }

    // Обработка выигрыша
    handleWin(winAmount, betAmount) {
        this.stats.wins++;
        this.stats.totalWinnings += winAmount;
        this.currentSession.netWinnings += winAmount;
        
        const netWin = winAmount - betAmount;
        if (netWin > this.stats.biggestWin) {
            this.stats.biggestWin = netWin;
        }
        if (netWin > this.currentSession.biggestWin) {
            this.currentSession.biggestWin = netWin;
        }
    }

    // Обработка блэкджека
    handleBlackjack(winAmount, betAmount) {
        this.stats.blackjacks++;
        this.stats.wins++;
        this.stats.totalWinnings += winAmount;
        this.currentSession.netWinnings += winAmount;
        
        const netWin = winAmount - betAmount;
        if (netWin > this.stats.biggestWin) {
            this.stats.biggestWin = netWin;
        }
        if (netWin > this.currentSession.biggestWin) {
            this.currentSession.biggestWin = netWin;
        }
    }

    // Обработка проигрыша
    handleLoss(betAmount) {
        this.stats.losses++;
        this.stats.totalLosses += betAmount;
        this.currentSession.netWinnings -= betAmount;
        
        if (betAmount > this.stats.biggestLoss) {
            this.stats.biggestLoss = betAmount;
        }
    }

    // Обработка ничьи
    handlePush() {
        this.stats.pushes++;
    }

    // Обновление серий
    updateStreaks(result) {
        if (result === 'win' || result === 'blackjack') {
            if (this.stats.currentStreak >= 0) {
                this.stats.currentStreak++;
            } else {
                this.stats.currentStreak = 1;
            }
            
            if (this.stats.currentStreak > this.stats.bestWinStreak) {
                this.stats.bestWinStreak = this.stats.currentStreak;
            }
            
            this.currentSession.winStreak++;
        } else if (result === 'lose' || result === 'bust') {
            if (this.stats.currentStreak <= 0) {
                this.stats.currentStreak--;
            } else {
                this.stats.currentStreak = -1;
            }
            
            if (Math.abs(this.stats.currentStreak) > this.stats.bestLoseStreak) {
                this.stats.bestLoseStreak = Math.abs(this.stats.currentStreak);
            }
            
            this.currentSession.winStreak = 0;
        }
        // При push серия не изменяется
    }

    // Проверка новых достижений
    checkNewAchievements() {
        const newAchievements = [];

        // Достижения по количеству игр
        if (this.stats.totalGames >= 10 && !this.hasAchievement('first_10_games')) {
            newAchievements.push({
                id: 'first_10_games',
                title: '🎯 Новичок',
                description: 'Сыграл 10 игр',
                points: 50
            });
        }

        if (this.stats.totalGames >= 100 && !this.hasAchievement('first_100_games')) {
            newAchievements.push({
                id: 'first_100_games',
                title: '🎮 Опытный игрок',
                description: 'Сыграл 100 игр',
                points: 200
            });
        }

        // Достижения по блэкджекам
        if (this.stats.blackjacks >= 5 && !this.hasAchievement('blackjack_master')) {
            newAchievements.push({
                id: 'blackjack_master',
                title: '🃏 Мастер блэкджека',
                description: 'Получил 5 блэкджеков',
                points: 150
            });
        }

        // Достижения по сериям
        if (this.stats.bestWinStreak >= 5 && !this.hasAchievement('win_streak_5')) {
            newAchievements.push({
                id: 'win_streak_5',
                title: '🔥 Горячая серия',
                description: 'Выиграл 5 игр подряд',
                points: 100
            });
        }

        if (this.stats.bestWinStreak >= 10 && !this.hasAchievement('win_streak_10')) {
            newAchievements.push({
                id: 'win_streak_10',
                title: '🚀 Невероятная серия',
                description: 'Выиграл 10 игр подряд',
                points: 300
            });
        }

        // Достижения по выигрышам
        if (this.stats.totalWinnings >= 5000 && !this.hasAchievement('big_winner')) {
            newAchievements.push({
                id: 'big_winner',
                title: '💰 Крупный выигрыш',
                description: 'Выиграл 5000 монет',
                points: 250
            });
        }

        // Добавляем новые достижения
        newAchievements.forEach(achievement => {
            this.stats.achievements.push(achievement);
        });

        return newAchievements;
    }

    // Проверка наличия достижения
    hasAchievement(achievementId) {
        return this.stats.achievements.some(a => a.id === achievementId);
    }

    // Получение статистики для отображения
    getDisplayStats() {
        const winRate = this.stats.totalGames > 0 
            ? Math.round((this.stats.wins / this.stats.totalGames) * 100) 
            : 0;
        
        const netProfit = this.stats.totalWinnings - this.stats.totalLosses;
        
        const timePlayedHours = Math.round(this.stats.timePlayedMinutes / 60 * 10) / 10;
        
        return {
            // Основная статистика
            totalGames: this.stats.totalGames,
            winRate: winRate,
            netProfit: netProfit,
            
            // Детальная статистика
            wins: this.stats.wins,
            losses: this.stats.losses,
            pushes: this.stats.pushes,
            blackjacks: this.stats.blackjacks,
            
            // Серии
            currentStreak: this.stats.currentStreak,
            bestWinStreak: this.stats.bestWinStreak,
            bestLoseStreak: this.stats.bestLoseStreak,
            
            // Рекорды
            biggestWin: this.stats.biggestWin,
            biggestLoss: this.stats.biggestLoss,
            averageBet: this.stats.averageBet,
            
            // Время игры
            sessionsPlayed: this.stats.sessionsPlayed,
            timePlayedHours: timePlayedHours,
            
            // Достижения
            achievements: this.stats.achievements,
            totalAchievements: this.stats.achievements.length,
            
            // Текущая сессия
            currentSession: {
                ...this.currentSession,
                duration: Math.round((Date.now() - this.currentSession.startTime) / 60000)
            }
        };
    }

    // Обновление времени игры
    updatePlayTime() {
        if (this.currentSession.startTime) {
            const sessionTime = Math.round((Date.now() - this.currentSession.startTime) / 60000);
            this.stats.timePlayedMinutes += sessionTime;
            this.currentSession.startTime = Date.now();
            this.saveStats();
        }
    }

    // Сброс статистики
    resetStats() {
        this.stats = {
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
        this.saveStats();
        this.startSession();
    }
}

// Глобальный экземпляр статистики
window.playerStats = new PlayerStatistics();
