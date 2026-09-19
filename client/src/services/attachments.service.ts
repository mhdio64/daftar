import { api } from './api.ts';

export interface Attachment {
  id: string;
  assetId?: string | null;
  assetTypeId?: string | null;
  originalName: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  uploadedById: string;
  uploadedBy?: {
    id: string;
    fullName: string;
    username: string;
    role?: string;
  };
  createdAt: string;
  localBlobUrl?: string; // برای حالت دمو یا پیش‌نمایش فوری
}

export const attachmentsService = {
  /**
   * دریافت لیست فایل‌های پیوست یک دارایی یا دسته
   */
  async getAll(params: { assetId?: string; assetTypeId?: string }): Promise<{ items: Attachment[] }> {
    const query = new URLSearchParams();
    if (params.assetId) query.set('assetId', params.assetId);
    if (params.assetTypeId) query.set('assetTypeId', params.assetTypeId);

    return api.get<{ items: Attachment[] }>(`/attachments?${query.toString()}`);
  },

  /**
   * آپلود فایل پیوست چندبخشی (Multipart Form Data)
   */
  async upload(
    file: File,
    params: { assetId?: string; assetTypeId?: string }
  ): Promise<Attachment> {
    const formData = new FormData();
    formData.append('file', file);
    if (params.assetId) formData.append('assetId', params.assetId);
    if (params.assetTypeId) formData.append('assetTypeId', params.assetTypeId);

    const token = localStorage.getItem('daftar_token');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch('/api/attachments/upload', {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'خطا در آپلود فایل');
    }

    return response.json();
  },

  /**
   * دانلود استریم فایل پیوست از سرور و ذخیره در کلاینت
   */
  async download(id: string, originalName: string, localBlobUrl?: string): Promise<void> {
    // اگر فایل در حالت دمو با Blob محلی ذخیره شده باشد:
    if (localBlobUrl) {
      const a = document.createElement('a');
      a.href = localBlobUrl;
      a.download = originalName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    const token = localStorage.getItem('daftar_token');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`/api/attachments/${id}/download`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'خطا در دانلود فایل پیوست');
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = originalName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * حذف فایل پیوست از سامانه
   */
  async delete(id: string): Promise<{ message: string }> {
    return api.delete<{ message: string }>(`/attachments/${id}`);
  },
};
