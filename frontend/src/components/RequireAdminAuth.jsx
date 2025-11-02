import { Navigate, useLocation } from 'react-router-dom';
import { useAdmin } from '../providers/AdminProvider.jsx';

export const RequireAdminAuth = ({ children }) => {
  const { session } = useAdmin();
  const location = useLocation();

  if (!session?.token) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname + location.search }} />;
  }

  return children;
};
