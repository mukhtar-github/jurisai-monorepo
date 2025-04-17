/**
 * React Query hooks for user management
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getUsers,
  getUser,
  updateUserRole,
  makeSelfAdmin
} from '@/lib/api/roles';
import { User, UserRoleUpdateParams } from '@/lib/api/types';

// Query keys
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: any) => [...userKeys.lists(), { ...filters }] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: number) => [...userKeys.details(), id] as const,
};

/**
 * Hook for fetching all users
 */
export function useUsers() {
  return useQuery({
    queryKey: userKeys.lists(),
    queryFn: () => getUsers(),
  });
}

/**
 * Hook for fetching a specific user
 */
export function useUser(id: number) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => getUser(id),
    enabled: !!id,
  });
}

/**
 * Hook for updating a user's legacy role (admin/user)
 */
export function useUpdateUserRole(userId: number) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (roleData: UserRoleUpdateParams) => 
      updateUserRole(userId, roleData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.detail(userId) });
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      // Also invalidate the current user query if it's cached
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
  });
}

/**
 * Hook for making the current user an admin (setup only)
 */
export function useMakeSelfAdmin() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => makeSelfAdmin(),
    onSuccess: () => {
      // Update the current user data and user lists
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}
