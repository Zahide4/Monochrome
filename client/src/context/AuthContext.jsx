import { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Initialize state safely
  const [token, setToken] = useState(() => {
      const t = localStorage.getItem('token');
      return (t && t !== 'undefined' && t !== 'null') ? t : null;
  });
  
  const [user, setUser] = useState(() => {
      const u = localStorage.getItem('user');
      try { return u ? JSON.parse(u) : null; } catch { return null; }
  });

  useEffect(() => {
    // If token is invalid, clear everything
    if (!token || token === 'undefined' || token === 'null') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    }
  }, [token]);

  const login = (newToken, newUser) => {
    // SANITIZATION
    if (!newToken || typeof newToken !== 'string') {
        console.error("Login attempt with invalid token:", newToken);
        return;
    }
    
    const cleanToken = newToken.trim();
    
    setToken(cleanToken);
    setUser(newUser);
    
    localStorage.setItem('token', cleanToken);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Force reload to clear memory state
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
