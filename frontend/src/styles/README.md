/* ===== СТИЛИ ПРИЛОЖЕНИЯ - СПРАВКА ===== */

Структура подключения CSS файлов:

1. **global.css** - ОСНОВНЫЕ СТИЛИ
   ✓ CSS переменные для всей темы
   ✓ Typography (заголовки, параграфы, ссылки)
   ✓ Базовые стили для кнопок, форм, вводов
   ✓ Flex утилиты и системы сетки
   ✓ Стили алертов и сообщений
   ✓ Скроллбар, адаптивность
   Используется везде!

2. **casino.css** - ИГРОВОЙ ИНТЕРФЕЙС
   ✓ .casino-app - основной контейнер
   ✓ .game-header - шапка с логотипом и балансом
   ✓ .player-nav - вкладки навигации
   ✓ .game-table - игровой стол
   ✓ .dealer-section, .player-section - карты дилера и игрока
   ✓ .betting-section - система ставок
   ✓ .game-controls - кнопки действий
   ✓ .fairness-section - RTP статистика
   Используется в PlayerLayout.jsx и всех player страницах

3. **design.css** - АДМИН-ПАНЕЛЬ
   ✓ .admin-container - контейнер админа
   ✓ .admin-sidebar - боковое меню
   ✓ .admin-nav - навигация админа
   ✓ .admin-main - основная зона контента
   ✓ .admin-dashboard - панель метрик
   ✓ .card-grid, .metric-card - карточки метрик
   ✓ Таблицы и элементы управления
   ✓ Login стили
   Используется в AdminLayout.jsx и всех admin страницах

4. **telegram.css** - TELEGRAM MINI APP СТИЛИ
   ✓ .modal - модальные окна
   ✓ .modal-header, .modal-content, .modal-footer
   ✓ .stats-grid - сетка статистики
   ✓ .stats-card - карточка статистики
   ✓ .settings-label, .settings-control - настройки
   ✓ .profile-page, .payments-container - страницы игрока
   ✓ .table-wrapper, table стили - таблицы
   ✓ .balance-card, .verification-status-badge
   ✓ Модальные окна (StatisticsModal, SettingsModal)
   ✓ Формы платежей и верификации
   Используется везде для UI компонентов

ПОРЯДОК ПОДКЛЮЧЕНИЯ В HTML/JSX:
1. global.css   (базовые стили и переменные)
2. casino.css   (игровой интерфейс)
3. design.css   (админ-панель)
4. telegram.css (компоненты и модали)

ПРОВЕРКА СВЯЗЕЙ:
✓ index.html - подключает все 4 файла в правильном порядке
✓ main.jsx - подключает все 4 файла в правильном порядке
✓ Нет дублирования подключений
✓ Все классы в компонентах соответствуют CSS селекторам

ПЕРЕМЕННЫЕ CSS (в global.css):
--primary (основной цвет - синий)
--success (зелёный для побед)
--danger (красный для ошибок)
--warning (оранжевый для внимания)
--surface-1, --surface-2, --surface-3 (слои фона)
--text-primary, --text-secondary, --text-tertiary (текст)
--spacing-* (система отступов)
--radius-* (скругления)
--shadow-* (тени)
--z-* (z-index для слоёв)

АДАПТИВНОСТЬ:
✓ Mobile first подход
✓ Медиа-запросы: 480px, 768px, 1024px
✓ Safe areas для notches (env() функции)
✓ Сенсорные элементы минимум 44x44px
✓ Все вкладки помещаются на экране
✓ Горизонтальный скролл для таблиц на мобильных

ТЕЛЕГРАМ ИНТЕГРАЦИЯ:
✓ Цветовые переменные соответствуют Telegram theme
✓ Bottom sheet модали (slideUp анимация)
✓ Safe area поддержка для iPhone notch
✓ Оптимизация для mini apps размеров
✓ Доступность и контрастность для Telegram UI
