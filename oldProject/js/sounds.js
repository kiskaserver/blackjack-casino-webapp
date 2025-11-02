// ===== ЗВУКОВЫЕ ЭФФЕКТЫ ДЛЯ BLACKJACK =====

class SoundManager {
    constructor() {
        this.audioContext = null;
        this.sounds = {};
        this.enabled = true;
        this.volume = 0.3;
        
        this.initAudioContext();
        this.createSounds();
    }

    // Инициализация Web Audio API
    initAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (error) {
            console.warn('Web Audio API не поддерживается:', error);
            this.enabled = false;
        }
    }

    // Создание всех звуков
    createSounds() {
        if (!this.enabled) return;

        // Звук раздачи карт
        this.sounds.deal = this.createCardSound();
        
        // Звук взятия карты
        this.sounds.hit = this.createCardSound(0.8);
        
        // Звук стоп
        this.sounds.stand = this.createClickSound();
        
        // Звук удвоения
        this.sounds.double = this.createCoinSound();
        
        // Звук изменения ставки
        this.sounds.bet = this.createClickSound(0.5);
        
        // Звук выигрыша
        this.sounds.win = this.createWinSound();
        
        // Звук проигрыша
        this.sounds.lose = this.createLoseSound();
        
        // Звук ничьи
        this.sounds.push = this.createNeutralSound();
    }

    // Создание звука карты (шуршание)
    createCardSound(pitch = 1.0) {
        return () => {
            if (!this.enabled) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();
            
            oscillator.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // Настройки для звука карты
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(200 * pitch, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(50 * pitch, this.audioContext.currentTime + 0.1);
            
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1000, this.audioContext.currentTime);
            
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(this.volume * 0.3, this.audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.15);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.15);
        };
    }

    // Создание звука клика
    createClickSound(pitch = 1.0) {
        return () => {
            if (!this.enabled) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(800 * pitch, this.audioContext.currentTime);
            
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(this.volume * 0.2, this.audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.1);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.1);
        };
    }

    // Создание звука монет
    createCoinSound() {
        return () => {
            if (!this.enabled) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
            oscillator.frequency.linearRampToValueAtTime(1200, this.audioContext.currentTime + 0.1);
            oscillator.frequency.linearRampToValueAtTime(900, this.audioContext.currentTime + 0.2);
            
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(this.volume * 0.4, this.audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.3);
        };
    }

    // Создание звука выигрыша
    createWinSound() {
        return () => {
            if (!this.enabled) return;
            
            // Последовательность нот для победной мелодии
            const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
            
            notes.forEach((freq, index) => {
                setTimeout(() => {
                    const oscillator = this.audioContext.createOscillator();
                    const gainNode = this.audioContext.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(this.audioContext.destination);
                    
                    oscillator.type = 'triangle';
                    oscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime);
                    
                    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
                    gainNode.gain.linearRampToValueAtTime(this.volume * 0.5, this.audioContext.currentTime + 0.01);
                    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.2);
                    
                    oscillator.start(this.audioContext.currentTime);
                    oscillator.stop(this.audioContext.currentTime + 0.2);
                }, index * 100);
            });
        };
    }

    // Создание звука проигрыша
    createLoseSound() {
        return () => {
            if (!this.enabled) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(300, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(150, this.audioContext.currentTime + 0.5);
            
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(this.volume * 0.3, this.audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.5);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.5);
        };
    }

    // Создание нейтрального звука (ничья)
    createNeutralSound() {
        return () => {
            if (!this.enabled) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);
            
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(this.volume * 0.2, this.audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.3);
        };
    }

    // Воспроизведение звука
    play(soundName) {
        if (!this.enabled || !this.sounds[soundName]) return;
        
        // Возобновляем AudioContext если он приостановлен
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        
        try {
            this.sounds[soundName]();
        } catch (error) {
            console.warn('Ошибка воспроизведения звука:', error);
        }
    }

    // Включить/выключить звуки
    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }

    // Установить громкость
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
    }

    // Получить состояние
    isEnabled() {
        return this.enabled;
    }
}

// Глобальный менеджер звуков
window.soundManager = new SoundManager();
