import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '@/services/api';
import { AUTH } from '@/services/endpoints';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('access_token'));
  const [loading, setLoading] = useState(true);

  const restoreSession = useCallback(async () => {
    const stored = localStorage.getItem('access_token');
    if (!stored) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get(AUTH.ME);
      setUser(data.data);
      setToken(stored);
    } catch {
      localStorage.removeItem('access_token');
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const login = async (email, password) => {
    const { data } = await api.post(AUTH.LOGIN, { email, password });
    const accessToken = data.data.access_token;
    const userData = data.data.user;
    localStorage.setItem('access_token', accessToken);
    setToken(accessToken);
    setUser(userData);
    return userData;
  };

  const logout = async () => {
    try {
      await api.post(AUTH.LOGOUT);
    } catch {
      // ignore logout errors
    } finally {
      localStorage.removeItem('access_token');
      setToken(null);
      setUser(null);
    }
  };

  const refresh = async () => {
    try {
      const { data } = await api.post(AUTH.REFRESH);
      const newToken = data.data.access_token;
      localStorage.setItem('access_token', newToken);
      setToken(newToken);
      return newToken;
    } catch {
      await logout();
      throw new Error('Session expired');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        refresh,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export default AuthContext;
