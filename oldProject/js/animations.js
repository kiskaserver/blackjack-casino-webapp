// ===== АНИМАЦИИ И ЭФФЕКТЫ =====

class AnimationController {
    constructor() {
        this.initAnimations();
    }

    // Инициализация анимаций
    initAnimations() {
        this.setupHoverEffects();
        this.setupScrollAnimations();
        this.setupLoadingAnimation();
    }

    // Эффекты при наведении
    setupHoverEffects() {
        // Анимация кнопок
        document.addEventListener('mouseover', (e) => {
            if (e.target.classList.contains('action-btn')) {
                this.buttonHoverEffect(e.target);
            }
        });

        // Анимация карт
        document.addEventListener('mouseover', (e) => {
            if (e.target.classList.contains('card')) {
                this.cardHoverEffect(e.target);
            }
        });
    }

    // Эффект наведения на кнопку
    buttonHoverEffect(button) {
        button.style.transform = 'translateY(-5px) scale(1.05)';
        
        // Создаем рябь
        const ripple = document.createElement('div');
        ripple.style.cssText = `
            position: absolute;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.3);
            width: 10px;
            height: 10px;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            animation: ripple 0.6s ease-out;
            pointer-events: none;
        `;
        
        button.style.position = 'relative';
        button.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
    }

    // Эффект наведения на карту
    cardHoverEffect(card) {
        const rect = card.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const mouseX = event.clientX;
        const mouseY = event.clientY;
        
        const rotateX = (mouseY - centerY) / 10;
        const rotateY = (centerX - mouseX) / 10;
        
        card.style.transform = `
            perspective(1000px) 
            rotateX(${rotateX}deg) 
            rotateY(${rotateY}deg) 
            translateZ(20px)
        `;
    }

    // Анимации при скролле
    setupScrollAnimations() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.animation = 'fadeInUp 0.8s ease forwards';
                }
            });
        });

        // Наблюдаем за элементами
        document.querySelectorAll('.game-table, .betting-section, .game-controls').forEach(el => {
            observer.observe(el);
        });
    }

    // Анимация загрузки
    setupLoadingAnimation() {
        const loadingScreen = document.createElement('div');
        loadingScreen.className = 'loading-screen';
        loadingScreen.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <div class="loading-text">🎰 Загрузка казино...</div>
            </div>
        `;
        
        document.body.appendChild(loadingScreen);
        
        // Убираем экран загрузки
        window.addEventListener('load', () => {
            setTimeout(() => {
                loadingScreen.style.opacity = '0';
                setTimeout(() => {
                    loadingScreen.remove();
                }, 500);
            }, 1000);
        });
    }

    // Анимация победы
    static createWinAnimation() {
        const container = document.body;
        
        // Создаем конфетти
        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.style.cssText = `
                position: fixed;
                width: 10px;
                height: 10px;
                background: ${this.getRandomColor()};
                left: ${Math.random() * 100}vw;
                top: -10px;
                z-index: 9999;
                animation: confettiFall ${Math.random() * 3 + 2}s linear forwards;
                transform: rotate(${Math.random() * 360}deg);
            `;
            
            container.appendChild(confetti);
            
            setTimeout(() => {
                confetti.remove();
            }, 5000);
        }
    }

    // Анимация фейерверка
    static createFirework(x, y) {
        const colors = ['#ffd700', '#ff6b6b', '#00ff88', '#3498db', '#e74c3c'];
        const container = document.body;
        
        for (let i = 0; i < 12; i++) {
            const particle = document.createElement('div');
            const angle = (360 / 12) * i;
            const velocity = Math.random() * 100 + 50;
            
            particle.style.cssText = `
                position: fixed;
                width: 4px;
                height: 4px;
                background: ${colors[Math.floor(Math.random() * colors.length)]};
                border-radius: 50%;
                left: ${x}px;
                top: ${y}px;
                z-index: 9999;
                pointer-events: none;
            `;
            
            container.appendChild(particle);
            
            // Анимация частицы
            const animation = particle.animate([
                {
                    transform: `translate(0, 0) scale(1)`,
                    opacity: 1
                },
                {
                    transform: `translate(${Math.cos(angle * Math.PI / 180) * velocity}px, 
                                         ${Math.sin(angle * Math.PI / 180) * velocity}px) scale(0)`,
                    opacity: 0
                }
            ], {
                duration: 1000,
                easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            });
            
            animation.onfinish = () => particle.remove();
        }
    }

    // Анимация пульсации
    static pulseElement(element) {
        element.style.animation = 'pulse 0.5s ease';
        setTimeout(() => {
            element.style.animation = '';
        }, 500);
    }

    // Анимация тряски
    static shakeElement(element) {
        element.style.animation = 'shake 0.5s ease';
        setTimeout(() => {
            element.style.animation = '';
        }, 500);
    }

    // Получить случайный цвет
    static getRandomColor() {
        const colors = ['#ffd700', '#ff6b6b', '#00ff88', '#3498db', '#e74c3c', '#9b59b6'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    // Анимация падения карты
    static animateCardDeal(cardElement, delay = 0) {
        cardElement.style.opacity = '0';
        cardElement.style.transform = 'translateY(-100px) rotateX(180deg)';
        
        setTimeout(() => {
            cardElement.style.transition = 'all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            cardElement.style.opacity = '1';
            cardElement.style.transform = 'translateY(0) rotateX(0)';
        }, delay);
    }

    // Анимация увеличения баланса
    static animateBalanceIncrease(element, amount) {
        const startValue = parseInt(element.textContent);
        const endValue = startValue + amount;
        const duration = 1000;
        const stepTime = 50;
        const steps = duration / stepTime;
        const increment = (endValue - startValue) / steps;
        
        let current = startValue;
        let step = 0;
        
        const timer = setInterval(() => {
            current += increment;
            element.textContent = Math.floor(current);
            element.style.color = '#00ff88';
            element.style.textShadow = '0 0 20px rgba(0, 255, 136, 0.8)';
            
            step++;
            if (step >= steps) {
                clearInterval(timer);
                element.textContent = endValue;
                
                // Возвращаем обычный стиль
                setTimeout(() => {
                    element.style.color = '';
                    element.style.textShadow = '';
                }, 1000);
            }
        }, stepTime);
    }
}

// Дополнительные CSS анимации
const additionalStyles = document.createElement('style');
additionalStyles.textContent = `
    @keyframes confettiFall {
        to {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
        }
    }
    
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(50px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-10px); }
        75% { transform: translateX(10px); }
    }
    
    @keyframes ripple {
        to {
            transform: translate(-50%, -50%) scale(10);
            opacity: 0;
        }
    }
    
    .loading-screen {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #0d1421 0%, #1a1a2e 50%, #16213e 100%);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        transition: opacity 0.5s ease;
    }
    
    .loading-text {
        color: #ffd700;
        font-size: 1.5rem;
        font-weight: 700;
        margin-top: 20px;
        animation: pulse 1s infinite;
    }
    
    /* Убираем эффекты наведения при возврате мыши */
    .action-btn:not(:hover) {
        transform: translateY(0) scale(1) !important;
        transition: all 0.3s ease !important;
    }
    
    .card:not(:hover) {
        transform: translateY(0) rotateY(0) rotateX(0) translateZ(0) !important;
        transition: all 0.3s ease !important;
    }
`;
document.head.appendChild(additionalStyles);

// Инициализация контроллера анимаций
document.addEventListener('DOMContentLoaded', () => {
    new AnimationController();
});


