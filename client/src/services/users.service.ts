import { api } from './api.ts';

export interface ManagedUser {
  id: string;
  username: string;
  fullName: string;
  role: 'ADMIN' | 'EDITOR' | 'VIEWER';
  categoryPermissions: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  assetsCount?: number;
  activityCount?: number;
}

export const usersService = {
  async getAll(): Promise<{ items: ManagedUser[] }> {
    return api.get<{ items: ManagedUser[] }>('/users');
  },

  async create(data: {
    username: string;
    fullName: string;
    password: string;
    role: 'ADMIN' | 'EDITOR' | 'VIEWER';
    categoryPermissions: string[];
    isActive?: boolean;
  }): Promise<ManagedUser> {
    return api.post<ManagedUser>('/users', data);
  },

  async update(
    id: string,
    data: {
      fullName?: string;
      password?: string;
      role?: 'ADMIN' | 'EDITOR' | 'VIEWER';
      categoryPermissions?: string[];
      isActive?: boolean;
    }
  ): Promise<ManagedUser> {
    return api.put<ManagedUser>(`/users/${id}`, data);
  },

  async delete(id: string): Promise<{ message: string }> {
    return api.delete<{ message: string }>(`/users/${id}`);
  },
};
