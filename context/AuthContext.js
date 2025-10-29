import { createContext, useContext, useEffect, useMemo, useState } from 'react';

/**
 * @typedef {Object} AuthContextValue
 * @property {boolean} isAuthenticated
 * @property {boolean} isLoading
 * @property {(username: string, password: string) => boolean} login
 * @property {() => void} logout
 */

/** @type {import('react').Context<AuthContextValue | null>} */
const AuthContext = createContext(null);

const AUTH_STORAGE_KEY = 'finance-app-authenticated';

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const storedValue = window.localStorage.getItem(AUTH_STORAGE_KEY);
    setIsAuthenticated(storedValue === 'true');
    setIsLoading(false);
  }, []);

  const login = (username, password) => {
    const isValid = username === 'admin' && password === 'admin';
    if (isValid) {
      window.localStorage.setItem(AUTH_STORAGE_KEY, 'true');
      setIsAuthenticated(true);
    }
    return isValid;
  };

  const logout = () => {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    setIsAuthenticated(false);
  };

  /** @type {AuthContextValue} */
  const value = useMemo(
    () => ({
      isAuthenticated,
      isLoading,
      login,
      logout,
    }),
    [isAuthenticated, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
