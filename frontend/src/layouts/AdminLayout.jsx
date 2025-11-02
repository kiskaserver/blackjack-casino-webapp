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
    <div className="admin-container">
      <aside className="admin-sidebar">
        <div>
          <h2 className="admin-logo">🔧 Админ-панель</h2>
          {session?.adminId && (
            <p className="admin-logo-subtitle">
              ID: {session.adminId}
            </p>
          )}
        </div>
        <nav className="admin-nav">
          {links.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <button onClick={logout} className="admin-logout-btn">
          🚪 Выйти
        </button>
      </aside>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
};
