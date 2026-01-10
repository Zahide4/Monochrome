import { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => {
      return localStorage.getItem('token') || null;
  });
  
  const [user, setUser] = useState(() => {
      try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });

  useEffect(() => {
    // SELF-HEALING: If token is corrupted (has > 2 dots), nuke it immediately.
    if (token && (token.match(/\./g) || []).length > 2) {
        console.error("💥 Corrupted Token Detected. Purging storage.");
        logout();
    }
  }, [token]);

  const login = (newToken, newUser) => {
    if (!newToken || typeof newToken !== 'string') return;
    
    // Safety clean before saving
    let clean = newToken.trim();
    if (clean.startsWith('"')) clean = clean.slice(1, -1);
    
    // Prevent double-token save
    if ((clean.match(/\./g) || []).length > 2) {
         clean = clean.split('.').slice(0, 3).join('.');
    }

    setToken(clean);
    setUser(newUser);
    
    localStorage.setItem('token', clean);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
