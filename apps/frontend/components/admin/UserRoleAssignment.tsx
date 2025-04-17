'use client';

import { useState } from 'react';
import { useRoles } from '@/lib/hooks/useRoles';
import { useUpdateUserRole } from '@/lib/hooks/useUsers';
import { Role, User } from '@/lib/api/types';
import { Check, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { AccessDenied } from '@/components/auth/AccessDenied';

interface UserRoleAssignmentProps {
  user: User;
}

export function UserRoleAssignment({ user }: UserRoleAssignmentProps) {
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  
  const { data: roles, isLoading: isLoadingRoles } = useRoles();
  const updateUserRoleMutation = useUpdateUserRole(user.id);
  
  const handleAssignRole = async () => {
    if (!selectedRoleId) return;
    
    try {
      await updateUserRoleMutation.mutateAsync({
        role: selectedRoleId // Using the selected role ID as the role value
      });
      setSelectedRoleId('');
    } catch (error) {
      console.error('Failed to assign role:', error);
    }
  };
  
  return (
    <PermissionGate 
      permissions={["user:update", "role:assign"]}
      fallback={<AccessDenied requiredPermission="user:update & role:assign" />}
    >
      <Card>
        <CardHeader>
          <CardTitle>Role Assignment</CardTitle>
          <CardDescription>
            Manage roles for {user.name} ({user.email})
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium mb-2">Current Roles</h3>
              <div className="flex flex-wrap gap-2">
                {user.roles && user.roles.length > 0 ? (
                  user.roles.map((role) => (
                    <Badge key={role.id} variant="outline" className="px-3 py-1">
                      {role.name}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No roles assigned</p>
                )}
              </div>
            </div>
            
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium mb-2">Assign New Role</h3>
              <div className="flex items-end gap-2">
                {isLoadingRoles ? (
                  <div className="flex items-center">
                    <Spinner size="sm" className="mr-2" />
                    <span className="text-sm text-muted-foreground">Loading roles...</span>
                  </div>
                ) : (
                  <>
                    <div className="flex-1">
                      <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role to assign" />
                        </SelectTrigger>
                        <SelectContent>
                          {roles?.map((role) => (
                            <SelectItem key={role.id} value={role.id.toString()}>
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Button 
                      onClick={handleAssignRole} 
                      disabled={!selectedRoleId || updateUserRoleMutation.isPending}
                    >
                      {updateUserRoleMutation.isPending ? (
                        <Spinner size="sm" className="mr-2" />
                      ) : (
                        <Check className="h-4 w-4 mr-2" />
                      )}
                      Assign
                    </Button>
                  </>
                )}
              </div>
              
              {updateUserRoleMutation.isError && (
                <div className="mt-2 text-sm text-destructive">
                  <p>Error assigning role: {(updateUserRoleMutation.error as Error)?.message || 'Unknown error'}</p>
                </div>
              )}
            </div>
            
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium mb-2">Remove Roles</h3>
              <div className="space-y-2">
                {user.roles && user.roles.length > 0 ? (
                  user.roles.map((role) => (
                    <div key={role.id} className="flex justify-between items-center p-2 bg-muted rounded-md">
                      <div>
                        <p className="font-medium">{role.name}</p>
                        <p className="text-xs text-muted-foreground">{role.description}</p>
                      </div>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => {
                          // Handle role removal here
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No roles to remove</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </PermissionGate>
  );
}

export default UserRoleAssignment;
