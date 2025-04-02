/**
 * API client functions for role management
 */
import { apiClient } from './client';

// Types
export interface Permission {
  id: number;
  name: string;
  description?: string;
  resource: string;
  action: string;
}

export interface Role {
  id: number;
  name: string;
  description?: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  permissions: Permission[];
}

export interface RoleCreateParams {
  name: string;
  description?: string;
  is_default?: boolean;
  permission_ids: number[];
}

export interface RoleUpdateParams {
  name?: string;
  description?: string;
  is_default?: boolean;
  permission_ids?: number[];
}

/**
 * Get all roles with pagination support
 */
export const getRoles = async (skip = 0, limit = 100) => {
  const response = await apiClient.get<Role[]>('/auth/roles/', {
    params: { skip, limit },
  });
  return response.data;
};

/**
 * Get a specific role by ID
 */
export const getRole = async (roleId: number) => {
  const response = await apiClient.get<Role>(`/auth/roles/${roleId}`);
  return response.data;
};

/**
 * Create a new role
 */
export const createRole = async (roleData: RoleCreateParams) => {
  const response = await apiClient.post<Role>('/auth/roles/', roleData);
  return response.data;
};

/**
 * Update an existing role
 */
export const updateRole = async (roleId: number, roleData: RoleUpdateParams) => {
  const response = await apiClient.put<Role>(`/auth/roles/${roleId}`, roleData);
  return response.data;
};

/**
 * Delete a role
 */
export const deleteRole = async (roleId: number) => {
  await apiClient.delete(`/auth/roles/${roleId}`);
};

/**
 * Assign a role to a user
 */
export const assignRoleToUser = async (roleId: number, userId: number) => {
  await apiClient.post(`/auth/roles/${roleId}/users/${userId}`);
};

/**
 * Remove a role from a user
 */
export const removeRoleFromUser = async (roleId: number, userId: number) => {
  await apiClient.delete(`/auth/roles/${roleId}/users/${userId}`);
};
