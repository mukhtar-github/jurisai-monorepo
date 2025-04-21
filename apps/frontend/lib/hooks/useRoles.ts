/**
 * React Query hooks for role management
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole,
  assignRoleToUser,
  removeRoleFromUser
} from '@/lib/api/roles';
import { RoleParams, Role } from '@/lib/api/types';

// Query keys
export const roleKeys = {
  all: ['roles'] as const,
  lists: () => [...roleKeys.all, 'list'] as const,
  list: (filters: any) => [...roleKeys.lists(), { ...filters }] as const,
  details: () => [...roleKeys.all, 'detail'] as const,
  detail: (id: number) => [...roleKeys.details(), id] as const,
};

/**
 * Hook for fetching all roles
 */
export function useRoles() {
  return useQuery({
    queryKey: roleKeys.lists(),
    queryFn: () => getRoles(),
  });
}

/**
 * Hook for fetching a specific role
 */
export function useRole(id: number) {
  return useQuery({
    queryKey: roleKeys.detail(id),
    queryFn: () => getRole(id),
    enabled: !!id,
  });
}

/**
 * Hook for creating a new role
 */
export function useCreateRole() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (newRole: RoleParams) => createRole(newRole),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() });
    },
  });
}

/**
 * Hook for updating an existing role
 */
export function useUpdateRole(roleId: number) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, role }: { id: number; role: RoleParams }) => updateRole(id, role),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: roleKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() });
    },
  });
}

/**
 * Hook for deleting a role
 */
export function useDeleteRole() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() });
    },
  });
}

/**
 * Hook for assigning a role to a user
 */
export function useAssignRoleToUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ roleId, userId }: { roleId: number; userId: number }) => 
      assignRoleToUser(roleId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

/**
 * Hook for removing a role from a user
 */
export function useRemoveRoleFromUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ roleId, userId }: { roleId: number; userId: number }) => 
      removeRoleFromUser(roleId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
