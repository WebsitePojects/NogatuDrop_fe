import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { SESSION_ENDED_EVENT } from '@/services/api';
import { AUTH } from '@/services/endpoints';

const AuthContext = createContext(null);

// Set when a session ends on its own, so the sign-in page can explain why the person is there.
export const SESSION_ENDED_FLAG = 'nogatu_session_ended';

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

  useEffect(() => {
    const onSessionEnded = () => {
      try { sessionStorage.setItem(SESSION_ENDED_FLAG, '1'); } catch { /* storage blocked: no notice */ }
      localStorage.removeItem('access_token');
      setToken(null);
      setUser(null);
    };
    window.addEventListener(SESSION_ENDED_EVENT, onSessionEnded);
    return () => window.removeEventListener(SESSION_ENDED_EVENT, onSessionEnded);
  }, []);

  const completeSignIn = (data) => {
    localStorage.setItem('access_token', data.access_token);
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  };

  /**
   * Resolves to { user } when signed in, or to { codeRequired: true, challengeId, emailHint } when the
   * server flagged the sign-in and emailed a code; finish that with verifyLoginCode.
   */
  const login = async (email, password) => {
    const { data } = await api.post(AUTH.LOGIN, { email, password });
    if (data.data.code_required) {
      return {
        codeRequired: true,
        challengeId: data.data.challenge_id,
        emailHint: data.data.email_hint,
        expiresInSeconds: data.data.expires_in_seconds,
      };
    }
    return { user: completeSignIn(data.data) };
  };

  const verifyLoginCode = async (challengeId, code) => {
    const { data } = await api.post(AUTH.LOGIN_VERIFY, { challenge_id: challengeId, code });
    return completeSignIn(data.data);
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
        verifyLoginCode,
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
