import { api } from './api.ts';

export type FieldType = 'text' | 'ip_port' | 'secret' | 'select' | 'jalali_date' | 'url';

export interface FieldDefinition {
  id: string;
  name: string;
  label: string;
  type: FieldType;
  isRequired: boolean;
  isSecret?: boolean;
  options?: string[];
  showInTable?: boolean;
  order?: number;
}

export interface AssetType {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description?: string | null;
  schemaDefinition: FieldDefinition[];
  typeDocsMarkdown?: string | null;
  displayOrder: number;
  assetCount?: number;
}

export const assetTypesService = {
  async getAll(): Promise<{ items: AssetType[] }> {
    return api.get<{ items: AssetType[] }>('/asset-types');
  },

  async getById(id: string): Promise<AssetType> {
    return api.get<AssetType>(`/asset-types/${id}`);
  },

  async create(data: Partial<AssetType>): Promise<AssetType> {
    return api.post<AssetType>('/asset-types', data);
  },

  async update(id: string, data: Partial<AssetType>): Promise<AssetType> {
    return api.put<AssetType>(`/asset-types/${id}`, data);
  },

  async updateWiki(id: string, typeDocsMarkdown: string | null): Promise<AssetType> {
    return api.put<AssetType>(`/asset-types/${id}/wiki`, { typeDocsMarkdown });
  },

  async delete(id: string): Promise<{ message: string }> {
    return api.delete<{ message: string }>(`/asset-types/${id}`);
  },
};
