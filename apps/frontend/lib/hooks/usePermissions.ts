import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Permission,
  PermissionCreateParams,
  PermissionUpdateParams,
  createPermission,
  deletePermission,
  getPermission,
  getPermissions,
  updatePermission,
} from '../api/permissions';

// Query key constants
export const PERMISSIONS_QUERY_KEY = 'permissions';
export const PERMISSION_DETAIL_QUERY_KEY = 'permission-detail';

/**
 * Hook for fetching a list of permissions
 */
export const usePermissions = (skip = 0, limit = 100) => {
  return useQuery({
    queryKey: [PERMISSIONS_QUERY_KEY, { skip, limit }],
    queryFn: () => getPermissions(skip, limit),
  });
};

/**
 * Hook for fetching a specific permission by ID
 */
export const usePermissionDetail = (permissionId: number) => {
  return useQuery({
    queryKey: [PERMISSION_DETAIL_QUERY_KEY, permissionId],
    queryFn: () => getPermission(permissionId),
    enabled: !!permissionId, // Only run when permissionId is provided
  });
};

/**
 * Hook for creating a new permission
 */
export const useCreatePermission = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (permissionData: PermissionCreateParams) => createPermission(permissionData),
    onSuccess: () => {
      // Invalidate the permissions list query to refresh data
      queryClient.invalidateQueries({ queryKey: [PERMISSIONS_QUERY_KEY] });
    },
  });
};

/**
 * Hook for updating an existing permission
 */
export const useUpdatePermission = (permissionId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (permissionData: PermissionUpdateParams) => updatePermission(permissionId, permissionData),
    onSuccess: () => {
      // Update both the list and detail queries
      queryClient.invalidateQueries({ queryKey: [PERMISSIONS_QUERY_KEY] });
      queryClient.invalidateQueries({ 
        queryKey: [PERMISSION_DETAIL_QUERY_KEY, permissionId] 
      });
    },
  });
};

/**
 * Hook for deleting a permission
 */
export const useDeletePermission = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (permissionId: number) => deletePermission(permissionId),
    onSuccess: () => {
      // Invalidate the permissions list query to refresh data
      queryClient.invalidateQueries({ queryKey: [PERMISSIONS_QUERY_KEY] });
    },
  });
};
