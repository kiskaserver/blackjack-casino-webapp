// Lightweight ES module version of the old SoundManager with safe fallbacks
class SoundManager {
  constructor() {
    this.enabled = true;
    this.volume = 0.3;
    this._ctx = null;
    this._sounds = {};
    this._init();
  }

  _init() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) throw new Error('No AudioContext');
      this._ctx = new Ctx();
      this._build();
    } catch (_e) {
      this.enabled = false;
    }
  }

  _build() {
    if (!this._ctx) return;
    const click = (pitch = 1) => () => {
      if (!this.enabled) return;
      const o = this._ctx.createOscillator();
      const g = this._ctx.createGain();
      o.connect(g); g.connect(this._ctx.destination);
      o.type = 'square';
      o.frequency.setValueAtTime(800 * pitch, this._ctx.currentTime);
      g.gain.setValueAtTime(0, this._ctx.currentTime);
      g.gain.linearRampToValueAtTime(this.volume * 0.2, this._ctx.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, this._ctx.currentTime + 0.1);
      o.start(); o.stop(this._ctx.currentTime + 0.1);
    };

    const card = (pitch = 1) => () => {
      if (!this.enabled) return;
      const o = this._ctx.createOscillator();
      const g = this._ctx.createGain();
      const f = this._ctx.createBiquadFilter();
      o.connect(f); f.connect(g); g.connect(this._ctx.destination);
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(200 * pitch, this._ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(50 * pitch, this._ctx.currentTime + 0.1);
      f.type = 'lowpass'; f.frequency.setValueAtTime(1000, this._ctx.currentTime);
      g.gain.setValueAtTime(0, this._ctx.currentTime);
      g.gain.linearRampToValueAtTime(this.volume * 0.3, this._ctx.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, this._ctx.currentTime + 0.15);
      o.start(); o.stop(this._ctx.currentTime + 0.15);
    };

    const coin = () => () => {
      if (!this.enabled) return;
      const o = this._ctx.createOscillator();
      const g = this._ctx.createGain();
      o.connect(g); g.connect(this._ctx.destination);
      o.type = 'sine';
      o.frequency.setValueAtTime(800, this._ctx.currentTime);
      o.frequency.linearRampToValueAtTime(1200, this._ctx.currentTime + 0.1);
      o.frequency.linearRampToValueAtTime(900, this._ctx.currentTime + 0.2);
      g.gain.setValueAtTime(0, this._ctx.currentTime);
      g.gain.linearRampToValueAtTime(this.volume * 0.4, this._ctx.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, this._ctx.currentTime + 0.3);
      o.start(); o.stop(this._ctx.currentTime + 0.3);
    };

    const melody = freqs => () => {
      if (!this.enabled) return;
      freqs.forEach((fHz, idx) => {
        setTimeout(() => {
          const o = this._ctx.createOscillator();
          const g = this._ctx.createGain();
          o.connect(g); g.connect(this._ctx.destination);
          o.type = 'triangle';
          o.frequency.setValueAtTime(fHz, this._ctx.currentTime);
          g.gain.setValueAtTime(0, this._ctx.currentTime);
          g.gain.linearRampToValueAtTime(this.volume * 0.5, this._ctx.currentTime + 0.01);
          g.gain.exponentialRampToValueAtTime(0.001, this._ctx.currentTime + 0.2);
          o.start(); o.stop(this._ctx.currentTime + 0.2);
        }, idx * 100);
      });
    };

    const descend = () => () => {
      if (!this.enabled) return;
      const o = this._ctx.createOscillator();
      const g = this._ctx.createGain();
      o.connect(g); g.connect(this._ctx.destination);
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(300, this._ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(150, this._ctx.currentTime + 0.5);
      g.gain.setValueAtTime(0, this._ctx.currentTime);
      g.gain.linearRampToValueAtTime(this.volume * 0.3, this._ctx.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, this._ctx.currentTime + 0.5);
      o.start(); o.stop(this._ctx.currentTime + 0.5);
    };

    this._sounds = {
      deal: card(1.0),
      hit: card(0.8),
      stand: click(1.0),
      double: coin(),
      bet: click(0.6),
      win: melody([523, 659, 784, 1047]),
      lose: descend(),
      push: () => click(0.9)()
    };
  }

  resume() {
    if (this._ctx && this._ctx.state === 'suspended') {
      return this._ctx.resume();
    }
    return Promise.resolve();
  }

  play(name) {
    if (!this.enabled || !this._sounds[name]) return;
    try { this.resume().then(() => this._sounds[name]()); } catch {}
  }

  setEnabled(v) { this.enabled = !!v; }
  setVolume(v) { this.volume = Math.max(0, Math.min(1, Number(v) || 0)); }
}

export const soundManager = new SoundManager();

export const ensureUserGesture = () => {
  // Call once on first user interaction to unlock audio on iOS
  const onFirst = () => {
    soundManager.resume();
    window.removeEventListener('pointerdown', onFirst);
    window.removeEventListener('keydown', onFirst);
    window.removeEventListener('touchstart', onFirst);
  };
  window.addEventListener('pointerdown', onFirst, { once: true });
  window.addEventListener('keydown', onFirst, { once: true });
  window.addEventListener('touchstart', onFirst, { once: true });
};
