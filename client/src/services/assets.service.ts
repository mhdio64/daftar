import { api } from './api.ts';
import { AssetType } from './asset-types.service.ts';

export type AssetRelationType = 'HOSTED_ON' | 'DEPENDS_ON' | 'POINTS_TO' | 'BACKUP_OF' | 'RELATED_TO';

export interface AssetRelationTarget {
  id: string;
  title: string;
  assetTypeId: string;
  assetTypeName: string;
  assetTypeIcon: string;
  assetTypeSlug: string;
}

export interface AssetRelation {
  id: string;
  sourceAssetId?: string;
  targetAssetId: string;
  type: AssetRelationType;
  note?: string;
  targetAsset?: AssetRelationTarget;
  sourceAsset?: AssetRelationTarget;
}

export interface AssetRelationsData {
  outbound: AssetRelation[];
  inbound: AssetRelation[];
}

export interface Asset {
  id: string;
  assetTypeId: string;
  assetType: AssetType;
  title: string;
  values: Record<string, any>;
  tags?: string[];
  relations?: AssetRelation[];
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

export interface AssetTimelineUser {
  id: string;
  fullName: string;
  username: string;
  role: string;
}

export interface AssetDiffEntry {
  old?: any;
  new?: any;
  note?: string;
}

export interface AssetTimelineItem {
  id: string;
  userId: string;
  user: AssetTimelineUser;
  action: string;
  targetEntity: string;
  targetId: string;
  diff?: Record<string, AssetDiffEntry | any> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
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
    tags?: string[];
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
      tags?: string[];
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
      tags?: string[];
      expiryDate?: string | null;
      docsMarkdown?: string | null;
    }>;
  }): Promise<{ message: string; items: Asset[] }> {
    return api.post<{ message: string; items: Asset[] }>('/assets/batch', data);
  },

  async revealSecret(assetId: string, fieldKey: string): Promise<{ fieldKey: string; value: string }> {
    return api.post<{ fieldKey: string; value: string }>(`/assets/${assetId}/reveal-secret`, { fieldKey });
  },

  async getTimeline(assetId: string): Promise<AssetTimelineItem[]> {
    return api.get<AssetTimelineItem[]>(`/assets/${assetId}/timeline`);
  },

  async rollback(assetId: string, logId: string): Promise<Asset> {
    return api.post<Asset>(`/assets/${assetId}/rollback`, { logId });
  },

  async getRelations(assetId: string): Promise<AssetRelationsData> {
    return api.get<AssetRelationsData>(`/assets/${assetId}/relations`);
  },

  async addRelation(
    assetId: string,
    data: { targetAssetId: string; type: AssetRelationType; note?: string }
  ): Promise<AssetRelation> {
    return api.post<AssetRelation>(`/assets/${assetId}/relations`, data);
  },

  async deleteRelation(assetId: string, relationId: string): Promise<{ success: boolean }> {
    return api.delete<{ success: boolean }>(`/assets/${assetId}/relations/${relationId}`);
  },
};


