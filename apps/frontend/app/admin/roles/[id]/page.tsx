'use client';

import { useParams, useRouter } from 'next/navigation';
import { useRole, useUpdateRole } from '@/lib/hooks/useRoles';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import RoleFormDialog from '../components/role-form-dialog';
import { useState } from 'react';
import { RoleParams } from '@/lib/api/types';

export default function EditRolePage() {
  const params = useParams();
  const router = useRouter();
  const roleId = parseInt(params.id as string);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  const { data: role, isLoading, error } = useRole(roleId);
  const updateRoleMutation = useUpdateRole();
  
  const handleUpdateRole = async (data: RoleParams) => {
    await updateRoleMutation.mutateAsync({ id: roleId, role: data });
    setIsEditDialogOpen(false);
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }
  
  if (error || !role) {
    return (
      <div className="bg-destructive/10 p-4 rounded-md text-destructive">
        <p className="font-medium">Error loading role</p>
        <p>{error ? (error as Error).message : 'Role not found'}</p>
        <Button 
          variant="outline" 
          className="mt-4" 
          onClick={() => router.push('/admin/roles')}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Roles
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <Button 
          variant="ghost" 
          onClick={() => router.push('/admin/roles')}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Roles
        </Button>
        <Button onClick={() => setIsEditDialogOpen(true)}>
          Edit Role
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{role.name}</CardTitle>
          <CardDescription>{role.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2">Permissions</h3>
              {role.permissions && role.permissions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {role.permissions.map((permission) => (
                    <div key={permission.id} className="flex flex-col border rounded-md p-3">
                      <div className="flex justify-between items-start">
                        <Badge variant="outline" className="mb-2">
                          {permission.resource}:{permission.action}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          ID: {permission.id}
                        </span>
                      </div>
                      <p className="text-sm">{permission.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">This role has no permissions assigned.</p>
              )}
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-2">Details</h3>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="border rounded-md p-3">
                  <dt className="text-sm font-medium text-muted-foreground">Role ID</dt>
                  <dd>{role.id}</dd>
                </div>
                <div className="border rounded-md p-3">
                  <dt className="text-sm font-medium text-muted-foreground">Created At</dt>
                  <dd>{new Date(role.created_at).toLocaleString()}</dd>
                </div>
                <div className="border rounded-md p-3">
                  <dt className="text-sm font-medium text-muted-foreground">Updated At</dt>
                  <dd>{new Date(role.updated_at).toLocaleString()}</dd>
                </div>
                <div className="border rounded-md p-3">
                  <dt className="text-sm font-medium text-muted-foreground">Permission Count</dt>
                  <dd>{role.permissions?.length || 0}</dd>
                </div>
              </dl>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <RoleFormDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        mode="edit"
        roleId={roleId}
        onSubmit={handleUpdateRole}
      />
    </div>
  );
}
