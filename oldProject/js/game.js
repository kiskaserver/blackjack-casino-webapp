// ===== ГЛАВНАЯ ЛОГИКА ИГРЫ БЛЭКДЖЕК =====

class BlackjackGame {
    constructor() {
        this.deck = [];
        this.playerCards = [];
        this.dealerCards = [];
        this.playerScore = 0;
        this.dealerScore = 0;
        this.currentBet = 50;
        this.playerBalance = 1000;
        this.playerLevel = 1;
        this.gameInProgress = false;
        this.canDouble = false;
        this.achievements = [];
        
        this.initializeGame();
    }

    // Инициализация игры
    initializeGame() {
        this.updateUI();
        this.loadPlayerData();
        this.createDeck();
        this.showMessage("🎮 Добро пожаловать в BlackJack Casino!");
    }

    // Создание колоды карт
    createDeck() {
        const suits = ['♠', '♥', '♦', '♣'];
        const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        
        this.deck = [];
        for (let suit of suits) {
            for (let rank of ranks) {
                this.deck.push({
                    rank: rank,
                    suit: suit,
                    value: this.getCardValue(rank)
                });
            }
        }
        this.shuffleDeck();
    }

    // Тасование колоды
    shuffleDeck() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    // Получение значения карты
    getCardValue(rank) {
        if (rank === 'A') return 11;
        if (['J', 'Q', 'K'].includes(rank)) return 10;
        return parseInt(rank);
    }

    // Расчет очков с учетом тузов
    calculateScore(cards) {
        let score = 0;
        let aces = 0;

        for (let card of cards) {
            if (card.rank === 'A') {
                aces++;
            }
            score += card.value;
        }

        // Корректируем тузы
        while (score > 21 && aces > 0) {
            score -= 10;
            aces--;
        }

        return score;
    }

    // Начало новой игры
    startNewGame() {
        if (this.playerBalance < this.currentBet) {
            this.showMessage("❌ Недостаточно средств для ставки!");
            return;
        }

        this.gameInProgress = true;
        this.canDouble = true;
        this.playerCards = [];
        this.dealerCards = [];
        
        // Снимаем ставку
        this.playerBalance -= this.currentBet;
        
        // Создаем новую колоду если осталось мало карт
        if (this.deck.length < 20) {
            this.createDeck();
        }

        // Раздаем карты
        this.playerCards.push(this.drawCard());
        this.dealerCards.push(this.drawCard());
        this.playerCards.push(this.drawCard());
        this.dealerCards.push(this.drawCard());

        this.updateScores();
        this.renderCards();
        this.updateUI();

        // Проверяем блэкджек игрока
        if (this.playerScore === 21) {
            // Проверяем есть ли блэкджек у дилера
            const dealerFirstCard = this.dealerCards[0].value;
            if (dealerFirstCard === 10 || dealerFirstCard === 11) {
                // У дилера может быть блэкджек - проверяем
                this.showMessage("🎩 Проверяем блэкджек дилера...");
                setTimeout(() => {
                    this.revealDealerCard();
                    if (this.calculateScore(this.dealerCards) === 21) {
                        this.showMessage("🤝 Два блэкджека! Ничья!");
                        this.endGame('push', this.currentBet);
                    } else {
                        this.showMessage("🎉 БЛЭКДЖЕК! Поздравляем!");
                        this.playSound('win'); // Звук выигрыша для блэкджека
                        this.endGame('blackjack');
                    }
                }, 1500);
            } else {
                this.showMessage("🎉 БЛЭКДЖЕК! Поздравляем!");
                this.playSound('win'); // Звук выигрыша для блэкджека
                this.endGame('blackjack');
            }
        } else {
            this.showMessage("🎯 Ваш ход! ВЗЯТЬ или СТОП?");
            this.showGameButtons();
            
            // Пульсация кнопок для привлечения внимания
            if (window.AnimationController) {
                setTimeout(() => {
                    const hitBtn = document.querySelector('.hit-btn');
                    const standBtn = document.querySelector('.stand-btn');
                    if (hitBtn) AnimationController.pulseElement(hitBtn);
                    if (standBtn) AnimationController.pulseElement(standBtn);
                }, 500);
            }
        }

        // Звук раздачи карт
        this.playSound('deal');
    }

    // Взять карту (HIT)
    hit() {
        if (!this.gameInProgress) return;

        this.playerCards.push(this.drawCard());
        this.canDouble = false; // После взятия карты нельзя удваивать
        this.updateScores();
        this.renderCards();

        if (this.playerScore > 21) {
            // ПЕРЕБОР - игрок проиграл
            this.showMessage("💥 ПЕРЕБОР! Вы проиграли!");
            this.endGame('bust');
        } else if (this.playerScore === 21) {
            // Ровно 21 - автоматически переход к дилеру
            this.showMessage("🎯 21 очко! Ход дилера...");
            setTimeout(() => {
                this.stand();
            }, 1000);
        } else {
            this.showMessage("🎯 Ваш ход! ВЗЯТЬ или СТОП?");
        }

        this.updateUI();
        this.playSound('hit');
    }

    // Остановиться (STAND)
    stand() {
        if (!this.gameInProgress) return;

        this.canDouble = false;
        this.showMessage("🎩 Ход дилера...");
        
        // Дилер играет
        setTimeout(() => {
            this.dealerPlay();
        }, 1000);

        this.updateUI();
        this.playSound('stand');
    }

    // Удвоить ставку (DOUBLE) - только с первых двух карт
    doubleDown() {
        if (!this.gameInProgress || !this.canDouble || this.playerCards.length !== 2) return;
        
        if (this.playerBalance < this.currentBet) {
            this.showMessage("❌ Недостаточно средств для удвоения!");
            return;
        }

        // Удваиваем ставку
        this.playerBalance -= this.currentBet;
        this.currentBet *= 2;
        this.canDouble = false;
        
        this.showMessage("💰 Ставка удвоена! Получаете одну карту...");
        
        // При удвоении берём только ОДНУ карту и автоматически заканчиваем ход
        setTimeout(() => {
            this.playerCards.push(this.drawCard());
            this.updateScores();
            this.renderCards();

            if (this.playerScore > 21) {
                this.showMessage("💥 ПЕРЕБОР после удвоения!");
                this.endGame('bust');
            } else {
                this.showMessage(`💰 ${this.playerScore} очков. Ход дилера...`);
                setTimeout(() => {
                    this.dealerPlay();
                }, 1000);
            }
            
            this.updateUI();
        }, 800);

        this.playSound('double');
    }

    // Игра дилера - по правилам блэкджека
    dealerPlay() {
        this.revealDealerCard();
        
        const playDealer = () => {
            this.dealerScore = this.calculateScore(this.dealerCards);
            
            // Дилер ОБЯЗАН добирать карты до 17 очков (включительно)
            if (this.dealerScore < 17) {
                this.showMessage(`🎩 Дилер: ${this.dealerScore} очков, добирает карту...`);
                setTimeout(() => {
                    this.dealerCards.push(this.drawCard());
                    this.renderCards();
                    playDealer(); // Рекурсивно проверяем дальше
                }, 800);
            } else {
                // При 17+ дилер останавливается
                if (this.dealerScore > 21) {
                    this.showMessage(`🎩 Дилер: ${this.dealerScore} - ПЕРЕБОР!`);
                } else {
                    this.showMessage(`🎩 Дилер остановился с ${this.dealerScore} очками`);
                }
                setTimeout(() => {
                    this.determineWinner();
                }, 1000);
            }
        };

        setTimeout(playDealer, 500);
    }

    // Открыть скрытую карту дилера
    revealDealerCard() {
        // Просто перерисовываем все карты дилера без скрытых карт
        this.gameInProgress = false; // Временно отключаем флаг игры
        this.renderDealerCards();
        this.updateScores();
    }

    // Определение победителя
    determineWinner() {
        this.updateScores();
        let winAmount = 0;
        let message = "";
        let result = "";

        if (this.dealerScore > 21) {
            // Дилер перебрал
            if (this.playerScore === 21 && this.playerCards.length === 2) {
                winAmount = Math.floor(this.currentBet * 2.5); // Блэкджек 3:2
                message = "🎉 БЛЭКДЖЕК! Дилер перебрал!";
                result = "blackjack";
            } else {
                winAmount = this.currentBet * 2;
                message = "🎉 ПОБЕДА! Дилер перебрал!";
                result = "win";
            }
        } else if (this.playerScore > this.dealerScore) {
            // Игрок выиграл
            if (this.playerScore === 21 && this.playerCards.length === 2) {
                winAmount = Math.floor(this.currentBet * 2.5);
                message = "🎉 БЛЭКДЖЕК! Вы выиграли!";
                result = "blackjack";
            } else {
                winAmount = this.currentBet * 2;
                message = "🎉 ПОБЕДА! У вас больше очков!";
                result = "win";
            }
        } else if (this.playerScore === this.dealerScore) {
            // Ничья
            winAmount = this.currentBet;
            message = "🤝 НИЧЬЯ! Ставка возвращена.";
            result = "push";
        } else {
            // Дилер выиграл
            winAmount = 0;
            message = "😔 ПОРАЖЕНИЕ! У дилера больше очков.";
            result = "lose";
        }

        this.showMessage(message);
        this.endGame(result, winAmount);
    }

    // Завершение игры
    endGame(result, winAmount = 0) {
        this.gameInProgress = false;
        const oldBalance = this.playerBalance;
        this.playerBalance += winAmount;
        
        // Обновляем статистику
        this.updatePlayerStats(result, winAmount);
        
        // Показываем результат с анимацией
        if (winAmount > 0) {
            this.showVictory(winAmount);
            this.createFireworks();
            this.playSound('win');
            
            // Анимируем увеличение баланса
            if (window.AnimationController && winAmount > 0) {
                const balanceElement = document.getElementById('playerBalance');
                AnimationController.animateBalanceIncrease(balanceElement, winAmount - (this.playerBalance - oldBalance));
            }
        } else if (result === 'push') {
            this.playSound('push');
        } else {
            this.playSound('lose');
            
            // Анимация тряски при проигрыше
            if (window.AnimationController) {
                const balanceElement = document.getElementById('playerBalance');
                AnimationController.shakeElement(balanceElement);
            }
        }

        // Проверяем достижения
        this.checkAchievements(result);
        
        // Сбрасываем ставку к базовой
        this.currentBet = Math.min(this.currentBet, 50);
        
        this.updateUI();
        this.hideGameButtons();
        
        // Автоматически готовим к новой игре
        setTimeout(() => {
            this.showStartButton();
        }, 3000);
    }

    // Взять карту из колоды
    drawCard() {
        return this.deck.pop();
    }

    // Обновление счета
    updateScores() {
        this.playerScore = this.calculateScore(this.playerCards);
        this.dealerScore = this.calculateScore(this.dealerCards);
        
        const playerScoreElement = document.getElementById('playerScore');
        if (playerScoreElement) {
            playerScoreElement.textContent = this.playerScore;
        }
        
        // Показываем счет дилера правильно
        const dealerScoreElement = document.getElementById('dealerScore');
        if (dealerScoreElement) {
            if (this.gameInProgress && this.dealerCards.length >= 2) {
                // Во время игры показываем только первую карту дилера
                const visibleCards = [this.dealerCards[0]];
                const visibleScore = this.calculateScore(visibleCards);
                dealerScoreElement.textContent = visibleScore;
            } else {
                // После игры или если карт меньше 2, показываем полный счет
                dealerScoreElement.textContent = this.dealerScore;
            }
        }
    }

    // Отрисовка карт
    renderCards() {
        this.renderPlayerCards();
        this.renderDealerCards();
    }

    // Отрисовка карт игрока
    renderPlayerCards() {
        const container = document.getElementById('playerCards');
        container.innerHTML = '';
        
        this.playerCards.forEach((card, index) => {
            const cardElement = this.createCardElement(card);
            container.appendChild(cardElement);
            
            // Используем улучшенную анимацию если доступна
            if (window.AnimationController) {
                AnimationController.animateCardDeal(cardElement, index * 200);
            } else {
                // Fallback анимация
                cardElement.style.animationDelay = `${index * 0.2}s`;
                cardElement.classList.add('card-appear');
            }
        });
    }

    // Отрисовка карт дилера
    renderDealerCards() {
        const container = document.getElementById('dealerCards');
        container.innerHTML = '';
        
        this.dealerCards.forEach((card, index) => {
            let cardElement;
            
            if (index === 1 && this.gameInProgress) {
                // Скрытая карта дилера
                cardElement = document.createElement('div');
                cardElement.className = 'card face-down';
                cardElement.innerHTML = `
                    <div class="card-back">
                        <div class="card-pattern">🎰</div>
                    </div>
                `;
            } else {
                cardElement = this.createCardElement(card);
            }
            
            container.appendChild(cardElement);
            
            // Используем улучшенную анимацию если доступна
            if (window.AnimationController) {
                AnimationController.animateCardDeal(cardElement, index * 200);
            } else {
                // Fallback анимация
                cardElement.style.animationDelay = `${index * 0.2}s`;
                cardElement.classList.add('card-appear');
            }
        });
    }

    // Создание элемента карты
    createCardElement(card) {
        const cardElement = document.createElement('div');
        cardElement.className = `card ${this.getCardColor(card.suit)}`;
        cardElement.innerHTML = `
            <div class="card-value">${card.rank}</div>
            <div class="card-suit">${card.suit}</div>
        `;
        return cardElement;
    }

    // Получение цвета карты
    getCardColor(suit) {
        return ['♥', '♦'].includes(suit) ? 'red' : 'black';
    }

    // Обновление интерфейса
    updateUI() {
        const balanceEl = document.getElementById('playerBalance');
        const levelEl = document.getElementById('playerLevel');
        const betEl = document.getElementById('currentBet');
        
        if (balanceEl) balanceEl.textContent = this.playerBalance;
        if (levelEl) levelEl.textContent = this.playerLevel;
        if (betEl) betEl.textContent = this.currentBet;
        
        // Обновляем кнопки если они видимы
        this.updateDoubleButton();
    }

    // Показать сообщение
    showMessage(message) {
        const messageElement = document.getElementById('gameMessage');
        messageElement.textContent = message;
        messageElement.classList.add('message-update');
        setTimeout(() => {
            messageElement.classList.remove('message-update');
        }, 500);
    }

    // Показать кнопки игры
    showGameButtons() {
        const actionButtons = document.getElementById('actionButtons');
        const playButtons = document.getElementById('playButtons');
        const bettingSection = document.getElementById('bettingSection');
        
        if (actionButtons) actionButtons.style.display = 'none';
        if (playButtons) playButtons.style.display = 'flex';
        if (bettingSection) bettingSection.style.display = 'none';
        
        // Обновляем состояние кнопки DOUBLE
        this.updateDoubleButton();
    }

    // Скрыть кнопки игры
    hideGameButtons() {
        const playButtons = document.getElementById('playButtons');
        if (playButtons) playButtons.style.display = 'none';
    }

    // Показать кнопку старта
    showStartButton() {
        const actionButtons = document.getElementById('actionButtons');
        const bettingSection = document.getElementById('bettingSection');
        
        if (actionButtons) actionButtons.style.display = 'flex';
        if (bettingSection) bettingSection.style.display = 'flex';
    }

    // Обновить состояние кнопки DOUBLE
    updateDoubleButton() {
        const doubleBtn = document.getElementById('doubleButton');
        if (doubleBtn) {
            if (this.canDouble && this.currentBet * 2 <= this.playerBalance) {
                doubleBtn.disabled = false;
            } else {
                doubleBtn.disabled = true;
            }
        }
    }

    // Изменение ставки
    changeBet(amount) {
        if (this.gameInProgress) return;
        
        const newBet = this.currentBet + amount;
        if (newBet >= 10 && newBet <= this.playerBalance) {
            this.currentBet = newBet;
            this.updateUI();
            this.playSound('bet');
        }
    }

    // Установка ставки
    setBet(amount) {
        if (this.gameInProgress) return;
        
        if (amount <= this.playerBalance) {
            this.currentBet = amount;
            this.updateUI();
            this.playSound('bet');
        }
    }

    // Показать модальное окно победы
    showVictory(amount) {
        const modal = document.getElementById('victoryModal');
        const amountElement = document.getElementById('victoryAmount');
        amountElement.textContent = `+${amount} 💎`;
        modal.style.display = 'flex';
    }



    // Создать фейерверк
    createFireworks() {
        // Используем улучшенную систему анимаций
        if (window.AnimationController) {
            // Создаем несколько фейерверков в случайных местах
            for (let i = 0; i < 5; i++) {
                setTimeout(() => {
                    const x = Math.random() * window.innerWidth;
                    const y = Math.random() * (window.innerHeight / 2) + window.innerHeight / 4;
                    AnimationController.createFirework(x, y);
                }, i * 300);
            }
            
            // Добавляем конфетти
            AnimationController.createWinAnimation();
        }
        
        // Старая система как fallback
        const container = document.getElementById('winEffects');
        const colors = ['#ffd700', '#ff6b6b', '#00ff88', '#3498db', '#e74c3c'];
        
        for (let i = 0; i < 20; i++) {
            setTimeout(() => {
                const firework = document.createElement('div');
                firework.className = 'firework';
                firework.style.left = Math.random() * 100 + '%';
                firework.style.top = Math.random() * 100 + '%';
                firework.style.background = colors[Math.floor(Math.random() * colors.length)];
                container.appendChild(firework);
                
                setTimeout(() => {
                    firework.remove();
                }, 1000);
            }, i * 100);
        }
    }

    // Проверка достижений
    checkAchievements(result) {
        const achievements = [];
        
        if (result === 'blackjack') {
            achievements.push({ text: '🎉 Блэкджек!', points: 50 });
        }
        
        if (this.playerBalance >= 2000 && !this.achievements.includes('rich')) {
            achievements.push({ text: '💰 Богач!', points: 100 });
            this.achievements.push('rich');
        }
        
        if (this.playerCards.length >= 5 && this.playerScore <= 21 && !this.achievements.includes('five_card')) {
            achievements.push({ text: '🎯 Пять карт!', points: 75 });
            this.achievements.push('five_card');
        }
        
        achievements.forEach((achievement, index) => {
            setTimeout(() => {
                this.showAchievement(achievement.text);
            }, index * 1000);
        });
    }

    // Показать достижение
    showAchievement(text) {
        const container = document.getElementById('achievements');
        const achievement = document.createElement('div');
        achievement.className = 'achievement';
        achievement.textContent = text;
        container.appendChild(achievement);
        
        setTimeout(() => {
            achievement.remove();
        }, 3000);
    }

    // Обновление статистики игрока
    updatePlayerStats(result, winAmount) {
        // Обновляем локальную статистику
        if (window.playerStats) {
            const betAmount = result === 'push' ? this.currentBet : 
                            (result === 'win' || result === 'blackjack') ? this.currentBet : this.currentBet;
            window.playerStats.updateGameStats(result, betAmount, winAmount);
            
            // Проверяем новые достижения
            const newAchievements = window.playerStats.checkNewAchievements();
            newAchievements.forEach(achievement => {
                this.showAchievement(`${achievement.title}: ${achievement.description}`);
            });
        }
        
        // Отправляем данные в Telegram бота
        if (window.Telegram && window.Telegram.WebApp) {
            const stats = window.playerStats ? window.playerStats.getDisplayStats() : {};
            const data = {
                result: result,
                winAmount: winAmount,
                balance: this.playerBalance,
                level: this.playerLevel,
                stats: stats
            };
            
            window.Telegram.WebApp.sendData(JSON.stringify(data));
        }
    }

    // Воспроизведение звука
    playSound(type) {
        // Используем новую систему звуков
        if (window.soundManager) {
            window.soundManager.play(type);
        }
        
        // Тактильная обратная связь для Telegram
        if (window.Telegram && window.Telegram.WebApp) {
            const hapticType = {
                'win': 'heavy',
                'lose': 'heavy', 
                'blackjack': 'heavy',
                'deal': 'light',
                'hit': 'light',
                'stand': 'medium',
                'double': 'medium',
                'bet': 'light'
            };
            
            window.Telegram.WebApp.HapticFeedback.impactOccurred(hapticType[type] || 'light');
        }
    }

    // Загрузка данных игрока
    loadPlayerData() {
        // Загружаем данные из Telegram
        if (window.Telegram && window.Telegram.WebApp) {
            const initData = window.Telegram.WebApp.initDataUnsafe;
            if (initData.user) {
                // Можно загрузить данные пользователя
            }
        }
    }
}

// Глобальные функции для HTML
let game;

// Инициализация игры
window.addEventListener('DOMContentLoaded', () => {
    game = new BlackjackGame();
});

// ===== ГЛОБАЛЬНЫЕ ФУНКЦИИ ДЛЯ HTML =====

function startNewGame() {
    if (game) game.startNewGame();
}

function hit() {
    if (game) game.hit();
}

function stand() {
    if (game) game.stand();
}

function doubleDown() {
    if (game) game.doubleDown();
}

function changeBet(amount) {
    if (game) game.changeBet(amount);
}

function setBet(amount) {
    if (game) game.setBet(amount);
}

function toggleSound() {
    if (window.soundManager) {
        const enabled = window.soundManager.toggle();
        const button = document.getElementById('soundToggle');
        if (button) {
            button.textContent = enabled ? '🔊' : '🔇';
            button.title = enabled ? 'Выключить звук' : 'Включить звук';
        }
        
        // Воспроизводим тестовый звук при включении
        if (enabled) {
            window.soundManager.play('bet');
        }
    }
}

function closeModal() {
    const modal = document.getElementById('victoryModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function showStats() {
    if (!window.playerStats) return;
    
    const modal = document.getElementById('statsModal');
    const content = document.getElementById('statsContent');
    const stats = window.playerStats.getDisplayStats();
    
    content.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-title">🎮 ОСНОВНАЯ СТАТИСТИКА</div>
                <div class="stat-row">
                    <span>Всего игр:</span>
                    <span>${stats.totalGames}</span>
                </div>
                <div class="stat-row">
                    <span>Процент побед:</span>
                    <span class="win-rate">${stats.winRate}%</span>
                </div>
                <div class="stat-row">
                    <span>Чистая прибыль:</span>
                    <span class="${stats.netProfit >= 0 ? 'profit-positive' : 'profit-negative'}">
                        ${stats.netProfit >= 0 ? '+' : ''}${stats.netProfit} 💎
                    </span>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-title">🏆 РЕЗУЛЬТАТЫ</div>
                <div class="stat-row">
                    <span>Победы:</span>
                    <span class="wins">${stats.wins}</span>
                </div>
                <div class="stat-row">
                    <span>Поражения:</span>
                    <span class="losses">${stats.losses}</span>
                </div>
                <div class="stat-row">
                    <span>Ничьи:</span>
                    <span>${stats.pushes}</span>
                </div>
                <div class="stat-row">
                    <span>Блэкджеки:</span>
                    <span class="blackjacks">🃏 ${stats.blackjacks}</span>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-title">🔥 СЕРИИ</div>
                <div class="stat-row">
                    <span>Текущая серия:</span>
                    <span class="${stats.currentStreak > 0 ? 'streak-positive' : stats.currentStreak < 0 ? 'streak-negative' : ''}">
                        ${stats.currentStreak > 0 ? '+' : ''}${stats.currentStreak}
                    </span>
                </div>
                <div class="stat-row">
                    <span>Лучшая серия побед:</span>
                    <span class="streak-positive">+${stats.bestWinStreak}</span>
                </div>
                <div class="stat-row">
                    <span>Худшая серия поражений:</span>
                    <span class="streak-negative">-${stats.bestLoseStreak}</span>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-title">💰 РЕКОРДЫ</div>
                <div class="stat-row">
                    <span>Крупнейший выигрыш:</span>
                    <span class="big-win">+${stats.biggestWin} 💎</span>
                </div>
                <div class="stat-row">
                    <span>Крупнейший проигрыш:</span>
                    <span class="big-loss">-${stats.biggestLoss} 💎</span>
                </div>
                <div class="stat-row">
                    <span>Средняя ставка:</span>
                    <span>${stats.averageBet} 💎</span>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-title">⏱️ ВРЕМЯ ИГРЫ</div>
                <div class="stat-row">
                    <span>Сессий сыграно:</span>
                    <span>${stats.sessionsPlayed}</span>
                </div>
                <div class="stat-row">
                    <span>Время в игре:</span>
                    <span>${stats.timePlayedHours}ч</span>
                </div>
                <div class="stat-row">
                    <span>Текущая сессия:</span>
                    <span>${stats.currentSession.duration}мин</span>
                </div>
            </div>
            
            <div class="stat-card achievements-card">
                <div class="stat-title">🏅 ДОСТИЖЕНИЯ (${stats.totalAchievements})</div>
                <div class="achievements-list">
                    ${stats.achievements.length > 0 
                        ? stats.achievements.slice(-5).map(a => `
                            <div class="achievement-item">
                                <span class="achievement-title">${a.title}</span>
                                <span class="achievement-desc">${a.description}</span>
                                <span class="achievement-points">+${a.points} очков</span>
                            </div>
                        `).join('')
                        : '<div class="no-achievements">Пока нет достижений</div>'
                    }
                </div>
            </div>
        </div>
    `;
    
    modal.style.display = 'flex';
}

function closeStatsModal() {
    const modal = document.getElementById('statsModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function resetStats() {
    if (confirm('Вы уверены, что хотите сбросить всю статистику? Это действие нельзя отменить.')) {
        if (window.playerStats) {
            window.playerStats.resetStats();
        }
        closeStatsModal();
        
        // Показываем уведомление
        if (game) {
            game.showMessage('📊 Статистика сброшена!');
        }
    }
}

function shareGame() {
    if (!window.playerStats || !window.telegramApp) {
        // Fallback для обычного браузера
        const shareText = '🎰 Играю в BlackJack Casino! Присоединяйся!';
        const shareUrl = window.location.href;
        
        if (navigator.share) {
            navigator.share({
                title: 'BlackJack Casino',
                text: shareText,
                url: shareUrl
            });
        } else {
            // Копируем в буфер обмена
            const textToCopy = `${shareText}\n${shareUrl}`;
            navigator.clipboard.writeText(textToCopy).then(() => {
                alert('Ссылка скопирована в буфер обмена!');
            });
        }
        return;
    }
    
    const stats = window.playerStats.getDisplayStats();
    const shareText = `🎰 BlackJack Casino\n\n` +
                     `🏆 Мои результаты:\n` +
                     `• Игр сыграно: ${stats.totalGames}\n` +
                     `• Процент побед: ${stats.winRate}%\n` +
                     `• Блэкджеков: ${stats.blackjacks}\n` +
                     `• Лучшая серия: ${stats.bestWinStreak}\n\n` +
                     `Попробуй обыграть меня! 🎯`;
    
    const shareUrl = window.location.href;
    
    // Используем Telegram интеграцию
    window.telegramApp.shareResult(shareText, shareUrl);
    
    // Отправляем аналитику
    window.telegramApp.sendAnalyticsEvent('game_shared', {
        totalGames: stats.totalGames,
        winRate: stats.winRate,
        blackjacks: stats.blackjacks
    });
}















// CSS анимации
const style = document.createElement('style');
style.textContent = `
    .card-appear {
        animation: cardAppear 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    
    @keyframes cardAppear {
        from {
            transform: translateY(-100px) rotateY(180deg);
            opacity: 0;
        }
        to {
            transform: translateY(0) rotateY(0);
            opacity: 1;
        }
    }
    
    .message-update {
        animation: messageUpdate 0.5s ease;
    }
    
    @keyframes messageUpdate {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
    }
`;
document.head.appendChild(style);
