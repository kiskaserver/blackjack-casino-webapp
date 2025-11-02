import { NavLink, Outlet } from 'react-router-dom';
import { useTelegram } from '../providers/TelegramProvider.jsx';

const playerLinks = [
  { to: '/', label: 'Игра', end: true },
  { to: '/profile', label: 'Профиль' },
  { to: '/payments', label: 'Пополнение / Вывод' },
  { to: '/verification', label: 'Верификация' },
  { to: '/history', label: 'История' }
];

export const PlayerLayout = () => {
  const { user, themeParams } = useTelegram();

  const accentColor = themeParams?.button_color || '#22c55e';

  return (
    <div className="main-shell">
      <aside className="sidebar" style={{ borderColor: accentColor }}>
        <div>
          <h1>Blackjack</h1>
          {user ? (
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem', opacity: 0.75 }}>
              @{user.username || user.id}
            </p>
          ) : (
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem', opacity: 0.75 }}>Telegram WebApp</p>
          )}
        </div>
        <nav>
          {playerLinks.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
};
