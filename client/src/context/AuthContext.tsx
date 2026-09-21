import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, User } from '../services/auth.service.ts';
import { auditService } from '../services/audit.service.ts';

interface AuthContextType {
  user: User | null;
  token: string | null;
  setupNeeded: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ requires2FA: boolean; tempToken?: string }>;
  verify2FA: (tempToken: string, code: string) => Promise<void>;
  loginAsDemo: () => void;
  setupAdmin: (data: { username: string; fullName: string; password: string }) => Promise<void>;
  updateCurrentUser: (user: User) => void;
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
      const is2FA = localStorage.getItem('daftar_demo_2fa_enabled') === 'true';
      const demoUser: User = {
        id: 'demo-admin',
        username: 'admin',
        fullName: 'علی رضایی (مدیر ارشد)',
        role: 'ADMIN',
        categoryPermissions: [],
        twoFactorEnabled: is2FA,
      };
      const saved = localStorage.getItem('daftar_user');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setUser({ ...parsed, twoFactorEnabled: is2FA });
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

  const login = async (username: string, password: string): Promise<{ requires2FA: boolean; tempToken?: string }> => {
    try {
      const res = await authService.login(username, password);
      if (res.requires2FA) {
        return { requires2FA: true, tempToken: res.tempToken };
      }
      if (res.user && res.token) {
        setUser(res.user);
        setToken(res.token);
      }
      return { requires2FA: false };
    } catch (err: any) {
      // بررسی حالت دمو اگر سرور پاسخ نداد
      if (username.trim().toLowerCase() === 'admin') {
        const is2FA = localStorage.getItem('daftar_demo_2fa_enabled') === 'true';
        if (is2FA) {
          return { requires2FA: true, tempToken: 'demo-temp-2fa-token' };
        }
        loginAsDemo();
        return { requires2FA: false };
      }
      throw err;
    }
  };

  const verify2FA = async (tempToken: string, code: string) => {
    if (tempToken === 'demo-temp-2fa-token') {
      const secret = localStorage.getItem('daftar_demo_2fa_secret') || '';
      const rawRecovery = localStorage.getItem('daftar_demo_2fa_recovery_codes') || '[]';
      const recoveryCodes: string[] = JSON.parse(rawRecovery);

      const clean = code.trim().replace(/\s+/g, '');
      const norm = clean.toUpperCase().replace(/[^A-Z0-9]/g, '');

      // بررسی کد اضطراری
      const recoveryIdx = recoveryCodes.findIndex((rc) => rc.toUpperCase().replace(/[^A-Z0-9]/g, '') === norm);
      if (recoveryIdx !== -1) {
        recoveryCodes.splice(recoveryIdx, 1);
        localStorage.setItem('daftar_demo_2fa_recovery_codes', JSON.stringify(recoveryCodes));
        loginAsDemo();
        return;
      }

      // بررسی کد TOTP کلاینت
      const { verifyTotpTokenClient } = await import('../services/totp-client.service.ts');
      const isValid = await verifyTotpTokenClient(clean, secret);
      if (!isValid) {
        throw new Error('کد ۶ رقمی یا کد بازیابی اضطراری نامعتبر است.');
      }

      loginAsDemo();
      return;
    }

    const res = await authService.verify2FA(tempToken, code);
    if (res.user && res.token) {
      setUser(res.user);
      setToken(res.token);
    }
  };

  const loginAsDemo = () => {
    const is2FA = localStorage.getItem('daftar_demo_2fa_enabled') === 'true';
    const demoUser: User = {
      id: 'demo-admin',
      username: 'admin',
      fullName: 'علی رضایی (مدیر ارشد)',
      role: 'ADMIN',
      categoryPermissions: [],
      twoFactorEnabled: is2FA,
    };
    setUser(demoUser);
    setToken('demo-token-preview');
    localStorage.setItem('daftar_user', JSON.stringify(demoUser));
    localStorage.setItem('daftar_token', 'demo-token-preview');

    auditService.recordAudit({
      action: 'LOGIN',
      targetEntity: 'User',
      targetId: 'admin (مدیر ارشد)',
      diff: { method: is2FA ? '2FA_TOTP' : 'PASSWORD', note: 'ورود موفق به سامانه' },
    });
  };

  const updateCurrentUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('daftar_user', JSON.stringify(updatedUser));
  };

  const setupAdmin = async (data: { username: string; fullName: string; password: string }) => {
    const res = await authService.setupAdmin(data);
    if (res.user && res.token) {
      setUser(res.user);
      setToken(res.token);
      setSetupNeeded(false);
      auditService.recordAudit({
        action: 'CREATE',
        targetEntity: 'User',
        targetId: data.username,
        diff: { note: 'راه‌اندازی اولیه و ثبت مدیر ارشد' },
      });
    }
  };

  const logout = () => {
    const uname = user?.username || 'admin';
    authService.logout();
    setUser(null);
    setToken(null);
    auditService.recordAudit({
      action: 'LOGOUT',
      targetEntity: 'User',
      targetId: uname,
      diff: { note: 'خروج کاربر از سامانه' },
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        setupNeeded,
        isLoading,
        login,
        verify2FA,
        loginAsDemo,
        setupAdmin,
        updateCurrentUser,
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
