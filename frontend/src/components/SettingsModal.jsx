import React, { useState } from 'react';
import { useSettings } from '../providers/SettingsProvider.jsx';
import { soundManager } from '../utils/sound.js';
import { haptics } from '../utils/haptics.js';

export default function SettingsModal({ open, onClose }) {
  const { settings, setSoundEnabled, setVolume, setHapticsEnabled } = useSettings();
  const [localVolume, setLocalVolume] = useState(() => Math.round((settings.volume || 0) * 100));

  if (!open) return null;

  const applyVolume = (value) => {
    const v = Math.max(0, Math.min(100, Number(value) || 0));
    setLocalVolume(v);
    setVolume(v / 100);
  };

  return (
    <div className="modal open" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>⚙️ Настройки</h2>
          <button className="close-btn" onClick={onClose} aria-label="Закрыть">✖</button>
        </div>

        <div className="modal-body">
          <div className="flex-col gap-15">
            
            {/* Sound Settings */}
            <div className="card">
              <label className="settings-label">
                <input 
                  type="checkbox" 
                  checked={settings.soundEnabled} 
                  onChange={e => setSoundEnabled(e.target.checked)}
                />
                <span className="settings-label-text">🔊 Звук</span>
              </label>

              <div className="settings-control">
                <label htmlFor="volumeRange" className="volume-label">
                  <span>Громкость</span>
                  <span className="volume-value">{localVolume}%</span>
                </label>
                <input
                  id="volumeRange"
                  type="range"
                  min="0"
                  max="100"
                  value={localVolume}
                  onChange={e => applyVolume(e.target.value)}
                  disabled={!settings.soundEnabled}
                  className="volume-slider"
                />
                <button 
                  className="modal-btn mt-05 text-09" 
                  onClick={() => { soundManager.play('bet'); }}
                  disabled={!settings.soundEnabled}
                >
                  🔊 Тест звука
                </button>
              </div>
            </div>

            {/* Haptics Settings */}
            <div className="card">
              <label className="settings-label">
                <input 
                  type="checkbox" 
                  checked={settings.hapticsEnabled} 
                  onChange={e => setHapticsEnabled(e.target.checked)}
                />
                <span className="settings-label-text">📳 Тактильная отдача</span>
              </label>

              <button 
                className="modal-btn mt-05 ml-14 text-09"
                onClick={() => haptics.impact('medium')}
                disabled={!settings.hapticsEnabled}
              >
                📳 Тест вибро
              </button>
            </div>

            {/* Info */}
            <div className="card settings-info-card">
              <p className="settings-info">
                ℹ️ Эти настройки применяются ко всем звуковым эффектам и вибрациям в приложении.
              </p>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="modal-btn secondary" onClick={onClose}>Закрыть</button>
        </div>
      </div>
    </div>
  );
}
