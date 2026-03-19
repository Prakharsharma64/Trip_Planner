import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <p>Loading…</p>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/destinations" replace />;
  }

  return children;
}
