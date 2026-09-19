import { api } from './api.ts';

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: 'ADMIN' | 'EDITOR' | 'VIEWER';
  categoryPermissions: string[];
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export const authService = {
  async getSetupStatus(): Promise<{ setupNeeded: boolean }> {
    return api.get<{ setupNeeded: boolean }>('/auth/setup-status');
  },

  async setupAdmin(data: { username: string; fullName: string; password: string }): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>('/auth/setup', data);
    localStorage.setItem('daftar_token', res.token);
    localStorage.setItem('daftar_user', JSON.stringify(res.user));
    return res;
  },

  async login(username: string, password: string): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>('/auth/login', { username, password });
    localStorage.setItem('daftar_token', res.token);
    localStorage.setItem('daftar_user', JSON.stringify(res.user));
    return res;
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
