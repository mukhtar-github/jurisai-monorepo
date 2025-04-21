/**
 * API client for permission management
 * This includes functions for fetching, creating, updating and deleting permissions
 */
import apiClient from './client';
import type { Permission, PermissionParams } from './types';

/**
 * Get all permissions
 */
export async function getPermissions(): Promise<Permission[]> {
  const response = await apiClient.get('/permissions');
  return response.data;
}

/**
 * Get a specific permission by ID
 */
export async function getPermission(id: number): Promise<Permission> {
  const response = await apiClient.get(`/permissions/${id}`);
  return response.data;
}

/**
 * Create a new permission
 */
export async function createPermission(permissionData: PermissionParams): Promise<Permission> {
  const response = await apiClient.post('/permissions', permissionData);
  return response.data;
}

/**
 * Update a permission
 */
export async function updatePermission(id: number, permissionData: PermissionParams): Promise<Permission> {
  const response = await apiClient.put(`/permissions/${id}`, permissionData);
  return response.data;
}

/**
 * Delete a permission
 */
export async function deletePermission(id: number): Promise<void> {
  await apiClient.delete(`/permissions/${id}`);
}
