"use client"

import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useAdmin } from "../../providers/AdminProvider.jsx"

const AdminLoginPage = () => {
  const { login } = useAdmin()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from || "/admin/dashboard"

  const [adminId, setAdminId] = useState("")
  const [secret, setSecret] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError("")
    try {
      if (!adminId.trim() || !secret.trim()) {
        throw new Error("Укажите adminId и secret")
      }
      await login({ adminId: adminId.trim(), secret: secret.trim() })
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message || "Ошибка входа")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-linear-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="card w-full max-w-md">
        <h1 className="text-2xl font-bold text-white mb-1">🔐 Вход в админку</h1>
        <p className="text-sm text-slate-400 mb-6">Администраторы только</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-200">adminId (Telegram ID)</label>
            <input
              value={adminId}
              onChange={(event) => setAdminId(event.target.value)}
              placeholder="123456789"
              autoComplete="username"
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-200">Секрет</label>
            <input
              value={secret}
              onChange={(event) => setSecret(event.target.value)}
              placeholder="••••••"
              type="password"
              autoComplete="current-password"
              className="w-full"
            />
          </div>

          {error && <div className="alert error">{error}</div>}

          <button className="primary w-full" type="submit" disabled={loading}>
            {loading ? "⏳ Вход..." : "🔑 Продолжить"}
          </button>
        </form>

        <p className="mt-6 text-xs text-slate-400 leading-relaxed">
          ℹ️ Доступ разрешен только Telegram ID, перечисленным в переменной окружения{" "}
          <code className="bg-slate-800/50 px-2 py-1 rounded text-cyan-400">ADMIN_TELEGRAM_IDS</code>. Секрет храните
          вне Git.
        </p>
      </div>
    </div>
  )
}

export default AdminLoginPage
