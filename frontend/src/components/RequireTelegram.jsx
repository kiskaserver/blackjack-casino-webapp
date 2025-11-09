"use client"

import { useEffect, useState } from "react"
import { useTelegram } from "../providers/TelegramProvider.jsx"

export const RequireTelegram = ({ children }) => {
  const { initData, setInitData } = useTelegram()
  const [manualValue, setManualValue] = useState("")
  const [error, setError] = useState("")
  const [rawTelegramInitData, setRawTelegramInitData] = useState(() => {
    if (typeof window === "undefined") {
      return ""
    }
    return window.Telegram?.WebApp?.initData || ""
  })

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }
    const str = window.Telegram?.WebApp?.initData || ""
    setRawTelegramInitData(str)
  }, [initData])

  if (initData) {
    return children
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!manualValue.trim()) {
      setError("Вставьте строку initData из Telegram Web App")
      return
    }
    setError("")
    setInitData(manualValue.trim())
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-linear-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="card w-full max-w-2xl">
        <h2 className="text-2xl font-bold text-white mb-4">🚀 Требуется Telegram WebApp</h2>
        <p className="text-slate-300 mb-4">
          Приложение должно запускаться внутри Telegram. Если вы тестируете локально, вставьте значение{" "}
          <code className="bg-slate-800/50 px-2 py-1 rounded text-cyan-400">initData</code>, полученное из{" "}
          <code className="bg-slate-800/50 px-2 py-1 rounded text-cyan-400">Telegram.WebApp.initData</code>.
        </p>

        <details className="mb-6 group">
          <summary className="cursor-pointer font-semibold text-slate-200 hover:text-white transition-colors">
            ℹ️ Отладка initData
          </summary>
          <div className="mt-3 p-3 bg-slate-800/30 rounded-lg">
            <p className="text-xs font-mono text-slate-400 mb-2">window.Telegram.WebApp.initData:</p>
            <pre className="text-xs bg-slate-900/50 p-3 rounded overflow-x-auto text-slate-300 wrap-break-word whitespace-pre-wrap">
              {rawTelegramInitData || "(пусто)"}
            </pre>
          </div>
        </details>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">initData</label>
            <textarea
              value={manualValue}
              onChange={(event) => setManualValue(event.target.value)}
              rows={6}
              placeholder="query_id=...&user=..."
              className="w-full"
            />
          </div>
          {error && <div className="alert error">{error}</div>}
          <div className="flex justify-end gap-2">
            <button type="submit" className="primary">
              ✓ Использовать initData
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
