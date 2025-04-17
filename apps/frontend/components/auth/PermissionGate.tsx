'use client';

import { ReactNode } from 'react';
import { useHasPermission } from '@/lib/hooks/usePermissionCheck';

interface PermissionGateProps {
  /**
   * Permission or array of permissions required to access the protected content
   * Format: "resource:action" (e.g., "document:read", "user:create")
   */
  permissions: string | string[];
  
  /**
   * Content to display if user has the required permissions
   */
  children: ReactNode;
  
  /**
   * Content to display if user doesn't have the required permissions
   * If not provided, nothing will be rendered when user lacks permissions
   */
  fallback?: ReactNode;
}

/**
 * A component that conditionally renders content based on user permissions
 * 
 * @example
 * ```tsx
 * <PermissionGate permissions="document:create">
 *   <CreateDocumentButton />
 * </PermissionGate>
 * ```
 * 
 * @example
 * ```tsx
 * <PermissionGate 
 *   permissions={["role:update", "permission:read"]} 
 *   fallback={<AccessDeniedMessage />}
 * >
 *   <RoleEditor />
 * </PermissionGate>
 * ```
 */
export function PermissionGate({ permissions, children, fallback = null }: PermissionGateProps) {
  const hasPermission = useHasPermission(permissions);
  
  if (!hasPermission) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}

export default PermissionGate;
