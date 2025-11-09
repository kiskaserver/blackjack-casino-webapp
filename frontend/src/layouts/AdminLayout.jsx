import { NavLink, Outlet } from 'react-router-dom';
import { useAdmin } from '../providers/AdminProvider.jsx';

const links = [
  { to: '/admin/dashboard', label: 'Обзор' },
  { to: '/admin/players', label: 'Игроки' },
  { to: '/admin/withdrawals', label: 'Выводы' },
  { to: '/admin/verifications', label: 'KYC' },
  { to: '/admin/settings', label: 'Настройки' }
];

export const AdminLayout = () => {
  const { session, logout } = useAdmin();

  return (
    <div className="flex min-h-screen bg-slate-950">
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white mb-2">🔧 Админ-панель</h2>
          {session?.adminId && (
            <p className="text-sm text-slate-400">
              ID: {session.adminId}
            </p>
          )}
        </div>
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            {links.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => 
                  `block px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive 
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' 
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>
        </nav>
        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={logout} 
            className="danger w-full"
          >
            🚪 Выйти
          </button>
        </div>
      </aside>
      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
