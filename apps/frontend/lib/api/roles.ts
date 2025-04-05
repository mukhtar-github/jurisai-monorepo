/**
 * API client functions for role management
 */
import apiClient from './client';
import { 
  Permission, 
  PermissionParams, 
  Role, 
  RoleParams, 
  RoleAssignmentParams,
  User,
  UserRoleUpdateParams,
  SystemFeaturesResponse
} from './types';

// Base endpoints
const ROLES_ENDPOINT = '/roles';
const PERMISSIONS_ENDPOINT = '/permissions';
const ADMIN_ENDPOINT = '/admin';
const USERS_ENDPOINT = '/users';
const SYSTEM_ENDPOINT = '/system';

/**
 * Get all roles
 */
export async function getRoles(): Promise<Role[]> {
  const response = await apiClient.get(ROLES_ENDPOINT);
  return response.data;
}

/**
 * Get a specific role by ID
 */
export async function getRole(id: number): Promise<Role> {
  const response = await apiClient.get(`${ROLES_ENDPOINT}/${id}`);
  return response.data;
}

/**
 * Create a new role
 */
export async function createRole(role: RoleParams): Promise<Role> {
  const response = await apiClient.post(ROLES_ENDPOINT, role);
  return response.data;
}

/**
 * Update an existing role
 */
export async function updateRole(id: number, role: RoleParams): Promise<Role> {
  const response = await apiClient.put(`${ROLES_ENDPOINT}/${id}`, role);
  return response.data;
}

/**
 * Delete a role
 */
export async function deleteRole(id: number): Promise<void> {
  await apiClient.delete(`${ROLES_ENDPOINT}/${id}`);
}

/**
 * Get all permissions
 */
export async function getPermissions(): Promise<Permission[]> {
  const response = await apiClient.get(PERMISSIONS_ENDPOINT);
  return response.data;
}

/**
 * Get a specific permission by ID
 */
export async function getPermission(id: number): Promise<Permission> {
  const response = await apiClient.get(`${PERMISSIONS_ENDPOINT}/${id}`);
  return response.data;
}

/**
 * Create a new permission
 */
export async function createPermission(permission: PermissionParams): Promise<Permission> {
  const response = await apiClient.post(PERMISSIONS_ENDPOINT, permission);
  return response.data;
}

/**
 * Update an existing permission
 */
export async function updatePermission(id: number, permission: PermissionParams): Promise<Permission> {
  const response = await apiClient.put(`${PERMISSIONS_ENDPOINT}/${id}`, permission);
  return response.data;
}

/**
 * Delete a permission
 */
export async function deletePermission(id: number): Promise<void> {
  await apiClient.delete(`${PERMISSIONS_ENDPOINT}/${id}`);
}

/**
 * Assign a role to a user
 */
export async function assignRoleToUser(roleId: number, userId: number): Promise<void> {
  await apiClient.post(`${ROLES_ENDPOINT}/${roleId}/users/${userId}`);
}

/**
 * Remove a role from a user
 */
export async function removeRoleFromUser(roleId: number, userId: number): Promise<void> {
  await apiClient.delete(`${ROLES_ENDPOINT}/${roleId}/users/${userId}`);
}

/**
 * Update a user's legacy role (admin/user)
 */
export async function updateUserRole(userId: number, roleData: UserRoleUpdateParams): Promise<{ message: string }> {
  const response = await apiClient.put(`${ADMIN_ENDPOINT}/users/${userId}/role`, roleData);
  return response.data;
}

/**
 * Make the current user an admin (special setup endpoint)
 */
export async function makeSelfAdmin(): Promise<{ message: string }> {
  const response = await apiClient.put(`${ADMIN_ENDPOINT}/self/make-admin`);
  return response.data;
}

/**
 * Get all users
 */
export async function getUsers(): Promise<User[]> {
  const response = await apiClient.get(USERS_ENDPOINT);
  return response.data;
}

/**
 * Get a specific user by ID
 */
export async function getUser(id: number): Promise<User> {
  const response = await apiClient.get(`${USERS_ENDPOINT}/${id}`);
  return response.data;
}

/**
 * Get system features status (admin only)
 */
export async function getSystemFeatures(): Promise<SystemFeaturesResponse> {
  const response = await apiClient.get(`${SYSTEM_ENDPOINT}/features`);
  return response.data;
}
