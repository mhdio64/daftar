import { api } from './api.ts';
import { AssetType } from './asset-types.service.ts';

export interface Asset {
  id: string;
  assetTypeId: string;
  assetType: AssetType;
  title: string;
  values: Record<string, any>;
  expiryDate?: string | null;
  docsMarkdown?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssetsResponse {
  items: Asset[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const assetsService = {
  async getAll(params: {
    assetTypeId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<AssetsResponse> {
    const query = new URLSearchParams();
    if (params.assetTypeId) query.set('assetTypeId', params.assetTypeId);
    if (params.search) query.set('search', params.search);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));

    return api.get<AssetsResponse>(`/assets?${query.toString()}`);
  },

  async getById(id: string): Promise<Asset> {
    return api.get<Asset>(`/assets/${id}`);
  },

  async create(data: {
    assetTypeId: string;
    title: string;
    values: Record<string, any>;
    expiryDate?: string | null;
    docsMarkdown?: string | null;
  }): Promise<Asset> {
    return api.post<Asset>('/assets', data);
  },

  async update(
    id: string,
    data: {
      title?: string;
      values?: Record<string, any>;
      expiryDate?: string | null;
      docsMarkdown?: string | null;
    }
  ): Promise<Asset> {
    return api.put<Asset>(`/assets/${id}`, data);
  },

  async delete(id: string): Promise<{ message: string }> {
    return api.delete<{ message: string }>(`/assets/${id}`);
  },

  async createBatch(data: {
    assetTypeId: string;
    items: Array<{
      title: string;
      inputValues: Record<string, any>;
      expiryDate?: string | null;
      docsMarkdown?: string | null;
    }>;
  }): Promise<{ message: string; items: Asset[] }> {
    return api.post<{ message: string; items: Asset[] }>('/assets/batch', data);
  },

  async revealSecret(assetId: string, fieldKey: string): Promise<{ fieldKey: string; value: string }> {
    return api.post<{ fieldKey: string; value: string }>(`/assets/${assetId}/reveal-secret`, { fieldKey });
  },
};
