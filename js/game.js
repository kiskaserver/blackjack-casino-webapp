// ===== ГЛАВНАЯ ЛОГИКА ИГРЫ БЛЭКДЖЕК =====

class BlackjackGame {
    constructor() {
        this.deck = [];
        this.playerCards = [];
        this.dealerCards = [];
        this.playerScore = 0;
        this.dealerScore = 0;
        this.currentBet = 50;
        this.playerBalance = 0;
        this.playerLevel = 1;
        this.gameInProgress = false;
        this.canDouble = false;
        this.achievements = [];
        this.currentRoundId = null;
        this.activeRoundBet = null;
        this.baseRoundBet = null;

        this.walletType = this.normalizeWallet(window.blackjackApi?.getWalletType?.());
        this.balances = { real: 0, demo: 0 };
        this.demoSettings = { defaultBalance: 10000, topUpThreshold: 500 };
        this.demoTopUpInProgress = false;

        this.cacheDomElements();
        this.setupWalletControls();
        this.initializeGame();
    }

    normalizeWallet(value) {
        return value === 'demo' ? 'demo' : 'real';
    }

    cacheDomElements() {
        this.balanceElement = document.getElementById('playerBalance');
        this.otherWalletElement = document.getElementById('otherWalletBalance');
        this.walletBadge = document.getElementById('walletBadge');
        this.walletToggle = document.getElementById('walletToggle');
        this.walletButtons = this.walletToggle ? Array.from(this.walletToggle.querySelectorAll('[data-wallet]')) : [];
        this.demoTopUpButton = document.getElementById('demoTopUpButton');
    }

    setupWalletControls() {
        if (this.walletButtons && this.walletButtons.length) {
            this.walletButtons.forEach(button => {
                button.addEventListener('click', () => this.switchWallet(button.dataset.wallet));
            });
        }
        this.demoTopUpButton?.addEventListener('click', () => this.resetDemoBalance());
    }

    syncCurrentBalance() {
        this.playerBalance = Number(this.balances[this.walletType] ?? 0);
        this.ensureBetWithinBalance();
        this.updateBalanceDisplay();
    }

    ensureBetWithinBalance() {
        if (this.currentBet > this.playerBalance) {
            const minimumBet = 10;
            this.currentBet = Math.max(minimumBet, Math.min(this.playerBalance, this.currentBet));
            if (this.currentBet < minimumBet) {
                this.currentBet = minimumBet;
            }
        }
    }

    formatChips(value) {
        return Number(value || 0).toLocaleString('ru-RU', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
    }

    updateWalletButtons() {
        if (!this.walletButtons) return;
        this.walletButtons.forEach(button => {
            const isActive = this.normalizeWallet(button.dataset.wallet) === this.walletType;
            button.classList.toggle('active', isActive);
        });
    }

    updateBalanceDisplay() {
        if (this.balanceElement) {
            this.balanceElement.textContent = this.formatChips(this.playerBalance);
        }
        if (this.walletBadge) {
            this.walletBadge.textContent = this.walletType === 'demo' ? 'ДЕМО' : 'РЕАЛ';
            this.walletBadge.classList.toggle('demo', this.walletType === 'demo');
        }
        if (this.otherWalletElement) {
            const otherWallet = this.walletType === 'demo' ? 'real' : 'demo';
            const label = otherWallet === 'demo' ? 'Демо' : 'Реал';
            this.otherWalletElement.textContent = `${label}: ${this.formatChips(this.balances[otherWallet])} 💎`;
        }
        this.updateWalletButtons();
        this.updateDemoTopUpState();
    }

    updateDemoTopUpState() {
        if (!this.demoTopUpButton) return;
        const threshold = Number(this.demoSettings.topUpThreshold || 0);
        const shouldShow = this.walletType === 'demo' && threshold >= 0 && this.playerBalance < threshold;
        this.demoTopUpButton.classList.toggle('hidden', !shouldShow);
        this.demoTopUpButton.disabled = this.demoTopUpInProgress;
    }

    switchWallet(wallet) {
        const target = this.normalizeWallet(wallet);
        if (target === this.walletType) return;
        if (this.gameInProgress) {
            this.showMessage('🎲 Завершите текущий раунд перед сменой счета.');
            return;
        }
        this.walletType = target;
        window.blackjackApi?.setWalletType?.(target);
        this.syncCurrentBalance();
        this.updateUI();
    }

    async resetDemoBalance() {
        if (this.demoTopUpInProgress || typeof window.blackjackApi?.resetDemoBalance !== 'function') {
            return;
        }
        this.demoTopUpInProgress = true;
        this.updateDemoTopUpState();
        try {
            const response = await window.blackjackApi.resetDemoBalance();
            if (!response.success) {
                throw new Error(response.error || 'Не удалось пополнить демо-счет');
            }
            const data = response.data || {};
            if (data.balances) {
                this.balances.real = Number(data.balances.real ?? this.balances.real);
                this.balances.demo = Number(data.balances.demo ?? this.balances.demo);
            } else if (typeof data.balance === 'number') {
                this.balances.demo = Number(data.balance);
            }
            this.syncCurrentBalance();
            this.showMessage('💎 Демо-счет пополнен!');
            this.updateUI();
        } catch (error) {
            console.error('demo reset failed', error);
            this.showMessage(`⚠️ ${error.message}`);
        } finally {
            this.demoTopUpInProgress = false;
            this.updateDemoTopUpState();
        }
    }

    applyServerState(state, { previousBalance } = {}) {
        if (!state) return;

        const normalizedWallet = this.normalizeWallet(state.walletType || this.walletType);
        const prevBalance = Number(previousBalance ?? this.balances[normalizedWallet] ?? this.playerBalance ?? 0);

        if (state.balances) {
            if (typeof state.balances.real === 'number') {
                this.balances.real = Number(state.balances.real);
            }
            if (typeof state.balances.demo === 'number') {
                this.balances.demo = Number(state.balances.demo);
            }
        } else if (typeof state.balance === 'number') {
            this.balances[normalizedWallet] = Number(state.balance);
        }

        this.walletType = normalizedWallet;
        window.blackjackApi?.setWalletType?.(normalizedWallet);
        this.syncCurrentBalance();

        this.currentRoundId = state.roundId;
        this.playerCards = (state.playerCards || []).map(card => ({
            rank: card.rank,
            suit: card.suit,
            hidden: !!card.hidden
        }));
        this.dealerCards = (state.dealerCards || []).map(card => ({
            rank: card.rank,
            suit: card.suit,
            hidden: !!card.hidden
        }));

        this.playerScore = state.playerScore ?? this.playerScore;
        this.dealerScore = state.dealerScore ?? this.dealerScore;
        this.baseRoundBet = Number(state.baseBet ?? this.currentBet);
        this.activeRoundBet = Number(state.finalBet ?? state.baseBet ?? this.currentBet);
        this.canDouble = !state.doubleDown && state.status === 'pending' && this.playerCards.length === 2 && this.playerBalance >= this.baseRoundBet;
        this.gameInProgress = state.status === 'pending';

        this.renderCards();
        this.updateScores();
        this.updateUI();

        const message = state.message;
        if (message) {
            this.showMessage(message);
        }

        if (!this.gameInProgress && state.result) {
            this.handleFinishedRound(state, prevBalance);
        }
    }

    handleFinishedRound(state, previousBalance) {
        const balanceChange = Number(this.playerBalance) - Number(previousBalance);
        const winAmount = Number(state.winAmount || Math.max(balanceChange, 0));
        const result = state.result;

        this.hideGameButtons();
        this.endGame(result, winAmount, { balanceChange });
        this.activeRoundBet = null;
        this.baseRoundBet = null;
        this.updateDemoTopUpState();
    }

    // Инициализация игры
    initializeGame() {
        this.updateBalanceDisplay();
        this.updateUI();
        this.loadPlayerData();
        this.refreshProfile();
        this.showMessage('🎮 Добро пожаловать в BlackJack Casino!');
    }

    async refreshProfile() {
        if (!window.blackjackApi?.getPlayerProfile) {
            return;
        }
        try {
            const response = await window.blackjackApi.getPlayerProfile();
            if (!response.success) {
                throw new Error(response.error || 'Не удалось загрузить профиль');
            }
            const { player, stats, demo } = response.data;
            this.balances.real = Number(player.balance || 0);
            this.balances.demo = Number(player.demo_balance || player.demoBalance || this.balances.demo);
            this.playerLevel = player.level || 1;
            if (demo) {
                this.demoSettings = {
                    ...this.demoSettings,
                    ...demo
                };
            }
            if (window.playerStats && stats) {
                window.playerStats.hydrateFromServer?.(stats);
            }
            this.syncCurrentBalance();
            this.updateUI();
        } catch (error) {
            console.error('Profile load failed', error);
            this.showMessage('⚠️ Не удалось синхронизировать профиль.');
        }
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
            if (card.hidden) continue;
            if (card.rank === 'A') {
                aces++;
            }
            score += this.getCardValue(card.rank);
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
        if (!window.blackjackApi?.startRound) {
            this.showMessage('🔌 Сервер недоступен, попробуйте позже.');
            return;
        }

        if (this.gameInProgress) {
            return;
        }

        if (this.playerBalance < this.currentBet) {
            if (this.walletType === 'demo') {
                this.showMessage('💡 Пополните демо-счет для продолжения.');
                this.updateDemoTopUpState();
            } else {
                this.showMessage('❌ Недостаточно средств для ставки!');
            }
            return;
        }

        this.showMessage('🃏 Запрашиваем новую раздачу...');

        window.blackjackApi.startRound(this.currentBet, this.walletType)
            .then(response => {
                if (!response.success) {
                    throw new Error(response.error || 'Не удалось начать раунд');
                }
                const state = response.data;
                const previousBalance = this.playerBalance;
                this.applyServerState(state, { previousBalance });
                this.showGameButtons();
                this.playSound('deal');
                if (state.status === 'pending') {
                    this.showMessage('🎯 Ваш ход! ВЗЯТЬ или СТОП?');
                }
            })
            .catch(error => {
                console.error('startRound failed', error);
                this.showMessage(`⚠️ ${error.message}`);
                this.refreshProfile();
            });
    }

    // Взять карту (HIT)
    hit() {
        if (!this.gameInProgress || !this.currentRoundId) return;
        if (!window.blackjackApi?.hitRound) return;

        this.playSound('hit');
        window.blackjackApi.hitRound(this.currentRoundId)
            .then(response => {
                if (!response.success) {
                    throw new Error(response.error || 'Не удалось взять карту');
                }
                const state = response.data;
                const previousBalance = this.playerBalance;
                this.applyServerState(state, { previousBalance });
                if (state.status === 'pending') {
                    this.showMessage('🎯 Ваш ход! ВЗЯТЬ или СТОП?');
                }
            })
            .catch(error => {
                console.error('hit failed', error);
                this.showMessage(`⚠️ ${error.message}`);
                this.refreshProfile();
            });
    }

    // Остановиться (STAND)
    stand() {
        if (!this.gameInProgress || !this.currentRoundId) return;
        if (!window.blackjackApi?.settleRound) return;

        this.playSound('stand');
        this.showMessage('🎩 Ход дилера...');

        window.blackjackApi.settleRound(this.currentRoundId)
            .then(response => {
                if (!response.success) {
                    throw new Error(response.error || 'Не удалось завершить раунд');
                }
                const state = response.data;
                const previousBalance = this.playerBalance;
                this.applyServerState(state, { previousBalance });
            })
            .catch(error => {
                console.error('stand failed', error);
                this.showMessage(`⚠️ ${error.message}`);
                this.refreshProfile();
            });
    }

    // Удвоить ставку (DOUBLE) - только с первых двух карт
    doubleDown() {
        if (!this.gameInProgress || !this.canDouble || !this.currentRoundId) return;
        if (!window.blackjackApi?.doubleRound) return;

        this.playSound('double');
        this.showMessage('💰 Удваиваем ставку...');

        window.blackjackApi.doubleRound(this.currentRoundId)
            .then(response => {
                if (!response.success) {
                    throw new Error(response.error || 'Не удалось удвоить ставку');
                }
                const state = response.data;
                const previousBalance = this.playerBalance;
                this.applyServerState(state, { previousBalance });
            })
            .catch(error => {
                console.error('double failed', error);
                this.showMessage(`⚠️ ${error.message}`);
                this.refreshProfile();
            });
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
    endGame(result, winAmount = 0, { balanceChange = 0 } = {}) {
        this.gameInProgress = false;

        // Обновляем статистику
        this.updatePlayerStats(result, winAmount);

        const balanceElement = document.getElementById('playerBalance');

        if (winAmount > 0) {
            this.showVictory(winAmount);
            this.createFireworks();
            this.playSound('win');

            if (window.AnimationController && balanceChange > 0) {
                AnimationController.animateBalanceIncrease(balanceElement, balanceChange);
            }
        } else if (result === 'push') {
            this.playSound('push');
        } else {
            this.playSound('lose');
            if (window.AnimationController) {
                AnimationController.shakeElement(balanceElement);
            }
        }

    this.checkAchievements(result);
    this.currentBet = Math.min(this.currentBet, Math.max(this.playerBalance, 10));
        this.updateUI();

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
            
            if (card.hidden) {
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
        const levelEl = document.getElementById('playerLevel');
        const betEl = document.getElementById('currentBet');
        
        if (levelEl) levelEl.textContent = this.playerLevel;
        if (betEl) betEl.textContent = this.gameInProgress && this.activeRoundBet ? this.activeRoundBet : this.currentBet;
        
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
            const required = this.baseRoundBet || this.currentBet;
            if (this.canDouble && required * 2 <= this.playerBalance + (this.gameInProgress ? required : 0)) {
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
        } else if (this.walletType === 'demo' && newBet > this.playerBalance) {
            this.showMessage('💡 Пополните демо-счет для увеличения ставки.');
            this.updateDemoTopUpState();
        }
    }

    // Установка ставки
    setBet(amount) {
        if (this.gameInProgress) return;
        
        if (amount <= this.playerBalance) {
            this.currentBet = amount;
            this.updateUI();
            this.playSound('bet');
        } else if (this.walletType === 'demo') {
            this.showMessage('💡 Пополните демо-счет для этой ставки.');
            this.updateDemoTopUpState();
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
