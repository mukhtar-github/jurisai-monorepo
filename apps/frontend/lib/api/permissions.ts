/**
 * API client functions for permission management
 */
import { apiClient } from './client';
import { Permission } from './roles';

export interface PermissionCreateParams {
  name: string;
  description?: string;
  resource: string;
  action: string;
}

export interface PermissionUpdateParams {
  name?: string;
  description?: string;
  resource?: string;
  action?: string;
}

/**
 * Get all permissions with pagination support
 */
export const getPermissions = async (skip = 0, limit = 100) => {
  const response = await apiClient.get<Permission[]>('/auth/permissions/', {
    params: { skip, limit },
  });
  return response.data;
};

/**
 * Get a specific permission by ID
 */
export const getPermission = async (permissionId: number) => {
  const response = await apiClient.get<Permission>(`/auth/permissions/${permissionId}`);
  return response.data;
};

/**
 * Create a new permission
 */
export const createPermission = async (permissionData: PermissionCreateParams) => {
  const response = await apiClient.post<Permission>('/auth/permissions/', permissionData);
  return response.data;
};

/**
 * Update an existing permission
 */
export const updatePermission = async (permissionId: number, permissionData: PermissionUpdateParams) => {
  const response = await apiClient.put<Permission>(`/auth/permissions/${permissionId}`, permissionData);
  return response.data;
};

/**
 * Delete a permission
 */
export const deletePermission = async (permissionId: number) => {
  await apiClient.delete(`/auth/permissions/${permissionId}`);
};
