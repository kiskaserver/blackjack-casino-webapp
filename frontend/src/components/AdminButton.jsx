import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '../providers/TelegramProvider.jsx';

export const AdminButton = () => {
  const { user } = useTelegram();
  const navigate = useNavigate();
  const [showTooltip, setShowTooltip] = useState(false);

  // Список администраторов (в реальном приложении это должно приходить с бэкенда)
  const ADMIN_TELEGRAM_IDS = import.meta.env.VITE_ADMIN_TELEGRAM_IDS 
    ? import.meta.env.VITE_ADMIN_TELEGRAM_IDS.split(',').map(id => id.trim())
    : [];

  const isAdmin = user?.id && ADMIN_TELEGRAM_IDS.includes(user.id.toString());

  if (!isAdmin) {
    return null;
  }

  const handleAdminClick = () => {
    navigate('/admin/login');
  };

  return (
    <div className="relative">
      <button
        type="button"
        className="admin-button group relative flex h-11 w-11 items-center justify-center rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-600/20 to-orange-600/20 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:border-amber-500/50 hover:from-amber-600/30 hover:to-orange-600/30 hover:shadow-lg hover:shadow-amber-500/20"
        onClick={handleAdminClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        title="Панель администратора"
      >
        <span className="text-lg transition-transform duration-300 group-hover:scale-110">👑</span>
        
        {/* Пульсирующий индикатор для админа */}
        <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-amber-500 animate-pulse" />
      </button>

      {/* Тултип */}
      {showTooltip && (
        <div className="tooltip absolute right-0 top-14 z-50 flex flex-col items-center">
          <div className="whitespace-nowrap rounded-lg border border-amber-500/30 bg-slate-900/95 px-3 py-2 text-xs font-medium text-amber-300 backdrop-blur-sm shadow-lg">
            Админ-панель
          </div>
          <div className="triangle-down" />
        </div>
      )}
    </div>
  );
};