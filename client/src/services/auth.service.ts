import { api } from './api.ts';

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system';
  defaultDensity?: 'compact' | 'comfortable';
  defaultLandingTab?: 'dashboard' | 'assets' | 'reminders';
  defaultAssetTypeId?: string | null;
  autoHideSecretSeconds?: number;
  copyFeedbackSound?: boolean;
  calendarType?: 'jalali' | 'gregorian';
  persianNumbers?: boolean;
  avatarColor?: string;
  email?: string;
  phoneNumber?: string;
  personalAlerts?: {
    enabled: boolean;
    telegram?: { enabled: boolean; chatId: string };
    bale?: { enabled: boolean; chatId: string };
    email?: { enabled: boolean; toEmail: string };
    sms?: { enabled: boolean; phoneNumber: string };
  };
}

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: 'ADMIN' | 'EDITOR' | 'VIEWER';
  categoryPermissions: string[];
  twoFactorEnabled?: boolean;
  preferences?: UserPreferences;
  createdAt?: string;
  updatedAt?: string;
  assetsCount?: number;
  activityCount?: number;
}

export interface AuthResponse {
  requires2FA?: boolean;
  tempToken?: string;
  message: string;
  token?: string;
  user?: User;
}

export const authService = {
  async getSetupStatus(): Promise<{ setupNeeded: boolean }> {
    return api.get<{ setupNeeded: boolean }>('/auth/setup-status');
  },

  async setupAdmin(data: { username: string; fullName: string; password: string }): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>('/auth/setup', data);
    if (res.token && res.user) {
      localStorage.setItem('daftar_token', res.token);
      localStorage.setItem('daftar_user', JSON.stringify(res.user));
    }
    return res;
  },

  async login(username: string, password: string): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>('/auth/login', { username, password });
    if (!res.requires2FA && res.token && res.user) {
      localStorage.setItem('daftar_token', res.token);
      localStorage.setItem('daftar_user', JSON.stringify(res.user));
    }
    return res;
  },

  async verify2FA(tempToken: string, code: string): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>('/auth/verify-2fa', { tempToken, code });
    if (res.token && res.user) {
      localStorage.setItem('daftar_token', res.token);
      localStorage.setItem('daftar_user', JSON.stringify(res.user));
    }
    return res;
  },

  async setup2FA(): Promise<{ secret: string; otpauthUrl: string }> {
    return api.post<{ secret: string; otpauthUrl: string }>('/auth/2fa/setup');
  },

  async enable2FA(secret: string, code: string): Promise<{ message: string; recoveryCodes: string[] }> {
    return api.post<{ message: string; recoveryCodes: string[] }>('/auth/2fa/enable', { secret, code });
  },

  async disable2FA(password: string): Promise<{ message: string }> {
    return api.post<{ message: string }>('/auth/2fa/disable', { password });
  },

  async regenerateRecoveryCodes(): Promise<{ message: string; recoveryCodes: string[] }> {
    return api.post<{ message: string; recoveryCodes: string[] }>('/auth/2fa/recovery-codes');
  },

  async getMe(): Promise<{ user: User }> {
    return api.get<{ user: User }>('/auth/me');
  },

  logout() {
    localStorage.removeItem('daftar_token');
    localStorage.removeItem('daftar_user');
  },

  getCurrentUser(): User | null {
    const raw = localStorage.getItem('daftar_user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
};
