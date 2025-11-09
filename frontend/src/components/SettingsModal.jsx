"use client"

import { useState } from "react"
import { useSettings } from "../providers/SettingsProvider.jsx"
import { soundManager } from "../utils/sound.js"
import { haptics } from "../utils/haptics.js"

export default function SettingsModal({ open, onClose }) {
  const { settings, setSoundEnabled, setVolume, setHapticsEnabled } = useSettings()
  const [localVolume, setLocalVolume] = useState(() => Math.round((settings.volume || 0) * 100))

  if (!open) return null

  const applyVolume = (value) => {
    const v = Math.max(0, Math.min(100, Number(value) || 0))
    setLocalVolume(v)
    setVolume(v / 100)
  }

  return (
    <>
      <div className="modal open fixed inset-0 z-50 flex items-end" onClick={onClose}>
        <div className="modal-overlay fixed inset-0 bg-black/40 backdrop-blur-sm z-40" />

        <div className="modal-content w-full" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2 className="text-xl font-bold text-white">⚙️ Настройки</h2>
            <button className="close-btn" onClick={onClose} aria-label="Закрыть">
              ✖
            </button>
          </div>

          <div className="modal-body space-y-3">
            {/* Sound Settings Card */}
            <div className="bg-slate-800/30 rounded-lg p-4 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.soundEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                  className="w-5 h-5 accent-cyan-400 cursor-pointer"
                />
                <span className="font-semibold text-slate-100">🔊 Звук</span>
              </label>

              <div className="ml-8 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="volumeRange" className="text-sm font-medium text-slate-300">
                    Громкость
                  </label>
                  <span className="text-cyan-400 font-bold text-sm">{localVolume}%</span>
                </div>
                <input
                  id="volumeRange"
                  type="range"
                  min="0"
                  max="100"
                  value={localVolume}
                  onChange={(e) => applyVolume(e.target.value)}
                  disabled={!settings.soundEnabled}
                  className="volume-slider w-full"
                />
                <button
                  className="modal-btn w-full text-sm"
                  onClick={() => {
                    soundManager.play("bet")
                  }}
                  disabled={!settings.soundEnabled}
                >
                  🔊 Тест звука
                </button>
              </div>
            </div>

            {/* Haptics Settings Card */}
            <div className="bg-slate-800/30 rounded-lg p-4 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.hapticsEnabled}
                  onChange={(e) => setHapticsEnabled(e.target.checked)}
                  className="w-5 h-5 accent-cyan-400 cursor-pointer"
                />
                <span className="font-semibold text-slate-100">📳 Тактильная отдача</span>
              </label>

              <button
                className="modal-btn w-full ml-0 text-sm"
                onClick={() => haptics.impact("medium")}
                disabled={!settings.hapticsEnabled}
              >
                📳 Тест вибро
              </button>
            </div>

            {/* Info Card */}
            <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-4">
              <p className="text-sm text-slate-300">
                ℹ️ Эти настройки применяются ко всем звуковым эффектам и вибрациям в приложении.
              </p>
            </div>
          </div>

          <div className="modal-footer">
            <button className="modal-btn secondary" onClick={onClose}>
              ✓ Закрыть
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
