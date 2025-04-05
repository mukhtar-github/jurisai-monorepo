'use client';

import { useState } from 'react';
import { useUsers, useUpdateUserRole } from '@/lib/hooks/useUsers';
import { useRoles, useAssignRoleToUser, useRemoveRoleFromUser } from '@/lib/hooks/useRoles';
import { User, Role, UserRoleUpdateParams } from '@/lib/api/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, UserCheck, UserMinus, ShieldCheck, ShieldX } from 'lucide-react';

export default function UsersPage() {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [actionType, setActionType] = useState<'promote' | 'demote' | 'assign' | 'remove' | null>(null);
  
  const { data: users, isLoading: isLoadingUsers, error: usersError } = useUsers();
  const { data: roles, isLoading: isLoadingRoles, error: rolesError } = useRoles();
  
  const updateRoleMutation = useUpdateUserRole();
  const assignRoleMutation = useAssignRoleToUser();
  const removeRoleMutation = useRemoveRoleFromUser();
  
  // Handle role change (admin/user)
  const handleRoleChange = async () => {
    if (!selectedUser) return;
    
    try {
      const newRole: UserRoleUpdateParams = {
        // If promoting to admin, set to admin, otherwise set to user
        role: actionType === 'promote' ? 'admin' : 'user'
      };
      
      await updateRoleMutation.mutateAsync({ 
        userId: selectedUser.id, 
        roleData: newRole 
      });
      
      // Reset state
      setSelectedUser(null);
      setActionType(null);
    } catch (error) {
      console.error('Failed to update user role:', error);
    }
  };
  
  // Handle role assignment/removal
  const handleRoleAssignment = async () => {
    if (!selectedUser || !selectedRole) return;
    
    try {
      if (actionType === 'assign') {
        await assignRoleMutation.mutateAsync({
          roleId: selectedRole.id,
          userId: selectedUser.id
        });
      } else if (actionType === 'remove') {
        await removeRoleMutation.mutateAsync({
          roleId: selectedRole.id,
          userId: selectedUser.id
        });
      }
      
      // Reset state
      setSelectedUser(null);
      setSelectedRole(null);
      setActionType(null);
    } catch (error) {
      console.error('Failed to update user role assignments:', error);
    }
  };
  
  const isLoading = isLoadingUsers || isLoadingRoles;
  const error = usersError || rolesError;
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-destructive/10 p-4 rounded-md text-destructive">
        <p className="font-medium">Error loading data</p>
        <p>{(error as Error).message || 'Unknown error occurred'}</p>
      </div>
    );
  }
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">User Management</h2>
      </div>
      
      {users && users.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Legacy Role</TableHead>
                <TableHead>RBAC Roles</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-mono">{user.id}</TableCell>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'admin' ? 'default' : 'outline'}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.roles && user.roles.length > 0 ? (
                        user.roles.map(role => (
                          <Badge key={role.id} variant="secondary">{role.name}</Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-xs">No roles assigned</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Role Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        
                        {/* Admin Role Actions */}
                        {user.role === 'admin' ? (
                          <DropdownMenuItem onClick={() => {
                            setSelectedUser(user);
                            setActionType('demote');
                          }}>
                            <ShieldX className="mr-2 h-4 w-4" />
                            Demote from Admin
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => {
                            setSelectedUser(user);
                            setActionType('promote');
                          }}>
                            <ShieldCheck className="mr-2 h-4 w-4" />
                            Promote to Admin
                          </DropdownMenuItem>
                        )}
                        
                        <DropdownMenuSeparator />
                        
                        {/* RBAC Role Actions */}
                        {roles?.map(role => {
                          const hasRole = user.roles?.some(r => r.id === role.id);
                          
                          return hasRole ? (
                            <DropdownMenuItem key={role.id} onClick={() => {
                              setSelectedUser(user);
                              setSelectedRole(role);
                              setActionType('remove');
                            }}>
                              <UserMinus className="mr-2 h-4 w-4" />
                              Remove from {role.name}
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem key={role.id} onClick={() => {
                              setSelectedUser(user);
                              setSelectedRole(role);
                              setActionType('assign');
                            }}>
                              <UserCheck className="mr-2 h-4 w-4" />
                              Assign to {role.name}
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-12 bg-muted rounded-md">
          <p className="text-muted-foreground">No users found in the system</p>
        </div>
      )}
      
      {/* Confirmation Dialog for Admin/User Role Changes */}
      <AlertDialog 
        open={!!selectedUser && (actionType === 'promote' || actionType === 'demote')} 
        onOpenChange={(open: boolean) => !open && setSelectedUser(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === 'promote' ? 'Promote to Admin' : 'Demote from Admin'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === 'promote' 
                ? `Are you sure you want to give ${selectedUser?.name} admin privileges? They will have full access to all features.`
                : `Are you sure you want to remove admin privileges from ${selectedUser?.name}? They will lose access to admin-only features.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedUser(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRoleChange}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Confirmation Dialog for RBAC Role Assignment/Removal */}
      <AlertDialog 
        open={!!selectedUser && !!selectedRole && (actionType === 'assign' || actionType === 'remove')} 
        onOpenChange={(open: boolean) => {
          if (!open) {
            setSelectedUser(null);
            setSelectedRole(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === 'assign' ? 'Assign Role' : 'Remove Role'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === 'assign'
                ? `Are you sure you want to assign the "${selectedRole?.name}" role to ${selectedUser?.name}?`
                : `Are you sure you want to remove the "${selectedRole?.name}" role from ${selectedUser?.name}?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setSelectedUser(null);
              setSelectedRole(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleRoleAssignment}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
