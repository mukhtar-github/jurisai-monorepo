import { useAuth } from "../context/AuthContext";
import { Permission, Role } from "../api/types";
import { useQuery } from "@tanstack/react-query";

// Mock role permissions mapping for development
// In production, this would come from your backend
const ROLE_PERMISSIONS: Record<string, string[]> = {
  'admin': [
    'document:read', 'document:write', 'document:delete',
    'user:read', 'user:write', 'user:delete',
    'role:read', 'role:write', 'role:delete',
    'permission:read', 'permission:write', 'permission:delete'
  ],
  'user': [
    'document:read', 'document:write',
    'user:read'
  ]
};

/**
 * Hook to check if the current user has a specific permission
 * @param permissionCheck - String in format "resource:action" or an array of such strings
 * @returns boolean indicating if the user has the permission
 */
export function useHasPermission(permissionCheck: string | string[]): boolean {
  const { user } = useAuth();
  
  if (!user || !user.role) return false;
  
  const permissionsToCheck = Array.isArray(permissionCheck) ? permissionCheck : [permissionCheck];
  
  // Get permissions for the user's role
  const userPermissions = ROLE_PERMISSIONS[user.role] || [];
  
  // Check if the user has all required permissions
  return permissionsToCheck.every(perm => userPermissions.includes(perm));
}

/**
 * Hook to check if the current user has a specific role
 * @param roleName - Role name to check
 * @returns boolean indicating if the user has the role
 */
export function useHasRole(roleName: string): boolean {
  const { user } = useAuth();
  
  if (!user || !user.role) return false;
  
  return user.role === roleName;
}

/**
 * Hook to get all permissions of the current user
 * @returns Array of all permissions strings the user has
 */
export function useUserPermissions(): string[] {
  const { user } = useAuth();
  
  if (!user || !user.role) return [];
  
  return ROLE_PERMISSIONS[user.role] || [];
}

/**
 * TODO: Replace the mock implementation above with real API calls below
 * when the backend integration is ready
 */

/*
// Example of how to integrate with backend API:
export function useCurrentUserRoles() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['user-roles', user?.id],
    queryFn: () => fetchUserRoles(user?.id),
    enabled: !!user?.id,
  });
}

export function useHasPermission(permissionCheck: string | string[]): boolean {
  const { user } = useAuth();
  const { data: roles } = useCurrentUserRoles();
  
  if (!user || !roles) return false;
  
  const permissionsToCheck = Array.isArray(permissionCheck) ? permissionCheck : [permissionCheck];
  
  // Flatten all permissions from all roles
  const userPermissions = roles.flatMap(role => role.permissions || []);
  
  // Check if the user has all required permissions
  return permissionsToCheck.every(perm => {
    const [resource, action] = perm.split(':');
    return userPermissions.some(
      p => p.resource === resource && p.action === action
    );
  });
}
*/
