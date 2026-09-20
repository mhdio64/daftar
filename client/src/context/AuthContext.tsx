import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, User } from '../services/auth.service.ts';

interface AuthContextType {
  user: User | null;
  token: string | null;
  setupNeeded: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  loginAsDemo: () => void;
  setupAdmin: (data: { username: string; fullName: string; password: string }) => Promise<void>;
  logout: () => void;
  refreshSetupStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => authService.getCurrentUser());
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('daftar_token'));
  const [setupNeeded, setSetupNeeded] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const checkSetupStatus = async () => {
    try {
      const res = await authService.getSetupStatus();
      setSetupNeeded(res.setupNeeded);
    } catch {
      // سرور هنوز آماده نیست یا کانکشن دیتابیس لوکال برقرار نیست
    }
  };

  const fetchCurrentUser = async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    if (token === 'demo-token-preview') {
      const demoUser: User = {
        id: 'demo-admin',
        username: 'admin',
        fullName: 'علی رضایی (مدیر ارشد)',
        role: 'ADMIN',
        categoryPermissions: [],
      };
      const saved = localStorage.getItem('daftar_user');
      if (saved) {
        try {
          setUser(JSON.parse(saved));
        } catch {
          setUser(demoUser);
        }
      } else {
        setUser(demoUser);
      }
      setIsLoading(false);
      return;
    }
    try {
      const res = await authService.getMe();
      setUser(res.user);
      localStorage.setItem('daftar_user', JSON.stringify(res.user));
    } catch {
      authService.logout();
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      await checkSetupStatus();
      await fetchCurrentUser();
    };
    init();

    const handleUnauthorized = () => {
      const currentToken = localStorage.getItem('daftar_token');
      if (currentToken !== 'demo-token-preview') {
        setUser(null);
        setToken(null);
      }
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = async (username: string, password: string) => {
    const res = await authService.login(username, password);
    setUser(res.user);
    setToken(res.token);
  };

  const loginAsDemo = () => {
    const demoUser: User = {
      id: 'demo-admin',
      username: 'admin',
      fullName: 'علی رضایی (مدیر ارشد)',
      role: 'ADMIN',
      categoryPermissions: [],
    };
    setUser(demoUser);
    setToken('demo-token-preview');
    localStorage.setItem('daftar_user', JSON.stringify(demoUser));
    localStorage.setItem('daftar_token', 'demo-token-preview');
  };

  const setupAdmin = async (data: { username: string; fullName: string; password: string }) => {
    const res = await authService.setupAdmin(data);
    setUser(res.user);
    setToken(res.token);
    setSetupNeeded(false);
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        setupNeeded,
        isLoading,
        login,
        loginAsDemo,
        setupAdmin,
        logout,
        refreshSetupStatus: checkSetupStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
