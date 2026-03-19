import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isLanding = pathname === '/';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <header className="topbar">
        <Link to="/" className="topbar-tagline">India Trip Planner</Link>
        <nav className="nav-inline">
          {user ? (
            <>
              <Link to="/destinations">Destinations</Link>
              <Link to="/suggestions">Suggestions</Link>
              <Link to="/bucket">My Bucket</Link>
              <Link to="/groups">Expenses</Link>
              <Link to="/profile">Profile</Link>
              <span className="nav-user">{user.name}</span>
              <button type="button" onClick={handleLogout} className="btn-white btn-sm">Logout</button>
            </>
          ) : (
            <Link to="/login" className="btn-white btn-sm">Login</Link>
          )}
        </nav>
      </header>
      <main className={isLanding ? 'main--landing' : undefined}>{children}</main>
    </>
  );
}
