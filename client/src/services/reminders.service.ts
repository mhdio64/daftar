import { api } from './api.ts';

export interface ReminderItem {
  id: string;
  title: string;
  assetType: {
    id: string;
    name: string;
    icon: string;
  };
  expiryDate: string;
  daysRemaining: number;
  status: 'expired' | 'critical' | 'warningHigh' | 'warningMid' | 'healthy';
}

export interface RemindersResponse {
  items: ReminderItem[];
  counts: {
    total: number;
    expired: number;
    critical: number;
    warningHigh: number;
    warningMid: number;
  };
}

export const remindersService = {
  async getAll(): Promise<RemindersResponse> {
    return api.get<RemindersResponse>('/reminders');
  },

  async renewAsset(
    assetId: string,
    data: {
      newExpiryDate: string;
      cost?: number | null;
      note?: string | null;
    }
  ): Promise<{ message: string; assetId: string; newExpiryDate: string }> {
    return api.post(`/reminders/${assetId}/renew`, data);
  },
};
