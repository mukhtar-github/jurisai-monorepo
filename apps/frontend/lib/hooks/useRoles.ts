import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Role,
  RoleCreateParams,
  RoleUpdateParams,
  assignRoleToUser,
  createRole,
  deleteRole,
  getRole,
  getRoles,
  removeRoleFromUser,
  updateRole,
} from '../api/roles';

// Query key constants
export const ROLES_QUERY_KEY = 'roles';
export const ROLE_DETAIL_QUERY_KEY = 'role-detail';

/**
 * Hook for fetching a list of roles
 */
export const useRoles = (skip = 0, limit = 100) => {
  return useQuery({
    queryKey: [ROLES_QUERY_KEY, { skip, limit }],
    queryFn: () => getRoles(skip, limit),
  });
};

/**
 * Hook for fetching a specific role by ID
 */
export const useRoleDetail = (roleId: number) => {
  return useQuery({
    queryKey: [ROLE_DETAIL_QUERY_KEY, roleId],
    queryFn: () => getRole(roleId),
    enabled: !!roleId, // Only run when roleId is provided
  });
};

/**
 * Hook for creating a new role
 */
export const useCreateRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (roleData: RoleCreateParams) => createRole(roleData),
    onSuccess: () => {
      // Invalidate the roles list query to refresh data
      queryClient.invalidateQueries({ queryKey: [ROLES_QUERY_KEY] });
    },
  });
};

/**
 * Hook for updating an existing role
 */
export const useUpdateRole = (roleId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (roleData: RoleUpdateParams) => updateRole(roleId, roleData),
    onSuccess: (updatedRole) => {
      // Update both the list and detail queries
      queryClient.invalidateQueries({ queryKey: [ROLES_QUERY_KEY] });
      queryClient.invalidateQueries({ 
        queryKey: [ROLE_DETAIL_QUERY_KEY, roleId] 
      });
    },
  });
};

/**
 * Hook for deleting a role
 */
export const useDeleteRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (roleId: number) => deleteRole(roleId),
    onSuccess: () => {
      // Invalidate the roles list query to refresh data
      queryClient.invalidateQueries({ queryKey: [ROLES_QUERY_KEY] });
    },
  });
};

/**
 * Hook for assigning a role to a user
 */
export const useAssignRoleToUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roleId, userId }: { roleId: number; userId: number }) =>
      assignRoleToUser(roleId, userId),
    onSuccess: () => {
      // Could also invalidate user queries if needed
      queryClient.invalidateQueries({ queryKey: [ROLES_QUERY_KEY] });
    },
  });
};

/**
 * Hook for removing a role from a user
 */
export const useRemoveRoleFromUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roleId, userId }: { roleId: number; userId: number }) =>
      removeRoleFromUser(roleId, userId),
    onSuccess: () => {
      // Could also invalidate user queries if needed
      queryClient.invalidateQueries({ queryKey: [ROLES_QUERY_KEY] });
    },
  });
};
