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
          <div className="flex-col" style={{ gap: '1.5rem' }}>
            
            {/* Sound Settings */}
            <div className="card">
              <label className="flex-row" style={{ alignItems: 'center', gap: '0.75rem', cursor: 'pointer', marginBottom: '1rem' }}>
                <input 
                  type="checkbox" 
                  checked={settings.soundEnabled} 
                  onChange={e => setSoundEnabled(e.target.checked)}
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '1rem', fontWeight: '600' }}>🔊 Звук</span>
              </label>

              <div>
                <label htmlFor="volumeRange" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#94a3b8', fontWeight: '600' }}>
                  Громкость: <span style={{ color: '#fbbf24', fontWeight: '700' }}>{localVolume}%</span>
                </label>
                <input
                  id="volumeRange"
                  type="range"
                  min="0"
                  max="100"
                  value={localVolume}
                  onChange={e => applyVolume(e.target.value)}
                  disabled={!settings.soundEnabled}
                  style={{ 
                    width: '100%', 
                    height: '6px', 
                    borderRadius: '3px',
                    background: 'rgba(59, 130, 246, 0.2)',
                    outline: 'none',
                    opacity: settings.soundEnabled ? 1 : 0.5,
                    cursor: settings.soundEnabled ? 'pointer' : 'not-allowed'
                  }}
                />
                <button 
                  className="modal-btn" 
                  onClick={() => { soundManager.play('bet'); }}
                  disabled={!settings.soundEnabled}
                  style={{ marginTop: '0.75rem', opacity: settings.soundEnabled ? 1 : 0.5, cursor: settings.soundEnabled ? 'pointer' : 'not-allowed' }}
                >
                  🔊 Тест звука
                </button>
              </div>
            </div>

            {/* Haptics Settings */}
            <div className="card">
              <label className="flex-row" style={{ alignItems: 'center', gap: '0.75rem', cursor: 'pointer', marginBottom: '1rem' }}>
                <input 
                  type="checkbox" 
                  checked={settings.hapticsEnabled} 
                  onChange={e => setHapticsEnabled(e.target.checked)}
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '1rem', fontWeight: '600' }}>📳 Тактильная отдача</span>
              </label>

              <button 
                className="modal-btn"
                onClick={() => haptics.impact('medium')}
                disabled={!settings.hapticsEnabled}
                style={{ opacity: settings.hapticsEnabled ? 1 : 0.5, cursor: settings.hapticsEnabled ? 'pointer' : 'not-allowed' }}
              >
                📳 Тест вибро
              </button>
            </div>

            {/* Info */}
            <div className="card" style={{ background: 'rgba(6, 182, 212, 0.05)', borderColor: 'rgba(6, 182, 212, 0.2)' }}>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#cbd5e1', lineHeight: '1.6' }}>
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
