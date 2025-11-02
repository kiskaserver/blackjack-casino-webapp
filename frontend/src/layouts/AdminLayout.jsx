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
    <div className="main-shell">
      <aside className="sidebar">
        <div>
          <h2>Админ-панель</h2>
          {session?.adminId && (
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', opacity: 0.7 }}>
              Telegram ID: {session.adminId}
            </p>
          )}
        </div>
        <nav>
          {links.map(link => (
            <NavLink key={link.to} to={link.to} className={({ isActive }) => (isActive ? 'active' : '')}>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <button className="danger" onClick={logout} style={{ marginTop: 'auto' }}>
          Выйти
        </button>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
};
