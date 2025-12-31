import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  return (
    <nav className="navbar">
      <div className="nav-inner">
        <Link to="/" className="nav-logo">Monochrome.</Link>
        <div className="nav-links">
          <Link to="/">READ</Link>
          {user ? (
            <>
              <Link to="/mine">MY_LOGS</Link>
              <Link to="/create">WRITE</Link>
              <button onClick={logout} className="uppercase">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login">LOGIN</Link>
              <Link to="/register">JOIN</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
