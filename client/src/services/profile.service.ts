import { api } from './api.ts';
import { User, UserPreferences } from './auth.service.ts';

export interface UpdateProfilePayload {
  fullName?: string;
  preferences?: Partial<UserPreferences>;
}

export const profileService = {
  async getProfile(): Promise<{ user: User }> {
    return api.get<{ user: User }>('/profile');
  },

  async updateProfile(data: UpdateProfilePayload): Promise<{ message: string; user: User }> {
    const res = await api.put<{ message: string; user: User }>('/profile', data);
    if (res.user) {
      // بروزرسانی اطلاعات در حافظه محلی
      const current = localStorage.getItem('daftar_user');
      if (current) {
        try {
          const parsed = JSON.parse(current);
          localStorage.setItem('daftar_user', JSON.stringify({ ...parsed, ...res.user }));
        } catch {
          localStorage.setItem('daftar_user', JSON.stringify(res.user));
        }
      }
    }
    return res;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    return api.post<{ message: string }>('/profile/change-password', {
      currentPassword,
      newPassword,
    });
  },

  async testAlert(channel: string, target: string, botToken?: string): Promise<{ success: boolean; message: string }> {
    return api.post<{ success: boolean; message: string }>('/profile/test-alert', {
      channel,
      target,
      botToken,
    });
  },
};
