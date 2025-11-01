import { Navigate, Route, Routes } from 'react-router-dom';
import { PlayerLayout } from './layouts/PlayerLayout.jsx';
import { AdminLayout } from './layouts/AdminLayout.jsx';
import { RequireTelegram } from './components/RequireTelegram.jsx';
import { RequireAdminAuth } from './components/RequireAdminAuth.jsx';
import GamePage from './pages/player/GamePage.jsx';
import ProfilePage from './pages/player/ProfilePage.jsx';
import PaymentsPage from './pages/player/PaymentsPage.jsx';
import VerificationPage from './pages/player/VerificationPage.jsx';
import HistoryPage from './pages/player/HistoryPage.jsx';
import AdminLoginPage from './pages/admin/AdminLoginPage.jsx';
import AdminDashboardPage from './pages/admin/AdminDashboardPage.jsx';
import AdminPlayersPage from './pages/admin/AdminPlayersPage.jsx';
import AdminWithdrawalsPage from './pages/admin/AdminWithdrawalsPage.jsx';
import AdminVerificationsPage from './pages/admin/AdminVerificationsPage.jsx';
import AdminSettingsPage from './pages/admin/AdminSettingsPage.jsx';

const App = () => (
  <Routes>
    <Route
      path="/"
      element={(
        <RequireTelegram>
          <PlayerLayout />
        </RequireTelegram>
      )}
    >
      <Route index element={<GamePage />} />
      <Route path="profile" element={<ProfilePage />} />
      <Route path="payments" element={<PaymentsPage />} />
      <Route path="verification" element={<VerificationPage />} />
      <Route path="history" element={<HistoryPage />} />
    </Route>

    <Route path="/admin/login" element={<AdminLoginPage />} />
    <Route
      path="/admin/*"
      element={(
        <RequireAdminAuth>
          <AdminLayout />
        </RequireAdminAuth>
      )}
    >
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<AdminDashboardPage />} />
      <Route path="players" element={<AdminPlayersPage />} />
      <Route path="withdrawals" element={<AdminWithdrawalsPage />} />
      <Route path="verifications" element={<AdminVerificationsPage />} />
      <Route path="settings" element={<AdminSettingsPage />} />
    </Route>

    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default App;
