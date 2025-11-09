"use client"

import { NavLink, Outlet } from "react-router-dom"
import { useAdmin } from "../providers/AdminProvider.jsx"

const links = [
  { to: "/admin/dashboard", label: "Обзор" },
  { to: "/admin/players", label: "Игроки" },
  { to: "/admin/messages", label: "Сообщения" },
  { to: "/admin/withdrawals", label: "Выводы" },
  { to: "/admin/verifications", label: "KYC" },
  { to: "/admin/settings", label: "Настройки" },
]

export const AdminLayout = () => {
  const { session, logout } = useAdmin()

  return (
    <div className="flex min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950">
      <aside className="w-64 bg-slate-900/80 border-r border-cyan-500/10 flex flex-col backdrop-blur-sm">
        <div className="p-6 border-b border-slate-800/50">
          <h2 className="text-xl font-bold text-white mb-2">🔧 Админ-панель</h2>
          {session?.adminId && <p className="text-xs text-slate-400">ID: {session.adminId}</p>}
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `block px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-lg shadow-cyan-500/10"
                    : "text-slate-300 hover:bg-slate-800/50 hover:text-white hover:border-transparent"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-800/50">
          <button onClick={logout} className="danger w-full">
            🚪 Выйти
          </button>
        </div>
      </aside>
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
