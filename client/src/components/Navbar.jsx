import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
export default function Navbar() {
  const { user, logout } = useAuth();
  return (
    <nav className="border-b border-zinc-200 py-6 px-6 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-3xl mx-auto flex justify-between items-center">
        <Link to="/" className="font-serif text-2xl font-bold tracking-tight">The Journal.</Link>
        <div className="flex gap-6 font-mono text-sm text-zinc-500">
          <Link to="/" className="hover:text-black transition">READ</Link>
          {user ? (
            <>
              <Link to="/mine" className="hover:text-black transition">MY_LOGS</Link>
              <Link to="/create" className="hover:text-black transition">WRITE</Link>
              <button onClick={logout} className="hover:text-black transition uppercase">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="hover:text-black transition">LOGIN</Link>
              <Link to="/register" className="hover:text-black transition">JOIN</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
