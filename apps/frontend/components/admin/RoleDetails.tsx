'use client';

import { useState, useEffect } from 'react';
import { Role, Permission, RoleParams } from '@/lib/api/types';
import { useRole, useUpdateRole } from '@/lib/hooks/useRoles';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Spinner } from '@/components/ui/spinner';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { AccessDenied } from '@/components/auth/AccessDenied';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Check, Save } from 'lucide-react';

// Form schema
const roleFormSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
  description: z.string().min(5, { message: 'Description must be at least 5 characters' }).max(200),
  permission_ids: z.array(z.number())
});

interface RoleDetailsProps {
  roleId: number;
}

export function RoleDetails({ roleId }: RoleDetailsProps) {
  const { data: role, isLoading: isLoadingRole, error: roleError } = useRole(roleId);
  const { data: permissions, isLoading: isLoadingPermissions } = usePermissions();
  const updateRoleMutation = useUpdateRole(roleId);
    
  // Set up form
  const form = useForm<z.infer<typeof roleFormSchema>>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      name: '',
      description: '',
      permission_ids: []
    },
  });
  
  // Update form values when role data is loaded
  useEffect(() => {
    if (role) {
      form.reset({
        name: role.name,
        description: role.description,
        permission_ids: role.permissions?.map((p: { id: any; }) => p.id) || []
      });
    }
  }, [role, form]);
  
  // Group permissions by resource for better organization
  const permissionsByResource = permissions?.reduce((groups: Record<string, Permission[]>, permission: Permission) => {
    const resourceName = permission.resource;
    if (!groups[resourceName]) {
      groups[resourceName] = [];
    }
    groups[resourceName].push(permission);
    return groups;
  }, {}) || {};
  
  const handleSubmit = async (data: z.infer<typeof roleFormSchema>) => {
    try {
      await updateRoleMutation.mutateAsync({
        id: roleId,
        role: {
          name: data.name,
          description: data.description,
          permission_ids: data.permission_ids
        }
      });
    } catch (error) {
      console.error('Failed to update role:', error);
    }
  };
  
  if (isLoadingRole || !role) {
    return (
      <div className="flex justify-center items-center p-8">
        <Spinner size="lg" />
      </div>
    );
  }
  
  if (roleError) {
    return (
      <div className="bg-destructive/10 p-4 rounded-md text-destructive">
        <p className="font-medium">Error loading role</p>
        <p>{(roleError as Error).message || 'Unknown error occurred'}</p>
      </div>
    );
  }
  
  return (
    <PermissionGate 
      permissions="role:update"
      fallback={<AccessDenied requiredPermission="role:update" />}
    >
      <Card>
        <CardHeader>
          <CardTitle>Edit Role: {role.name}</CardTitle>
          <CardDescription>
            Manage role details and assigned permissions
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Admin, Legal Professional" {...field} />
                    </FormControl>
                    <FormDescription>
                      A short identifier for this role
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe the purpose and scope of this role" 
                        className="resize-none"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      A detailed description explaining what this role is for
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div>
                <h3 className="text-lg font-medium mb-4">Permissions</h3>
                
                {isLoadingPermissions ? (
                  <div className="flex items-center justify-center p-4">
                    <Spinner size="default" className="mr-2" />
                    <span>Loading permissions...</span>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(permissionsByResource).map(([resource, resourcePermissions]) => (
                      <div key={resource} className="border p-4 rounded-md">
                        <h4 className="font-medium text-md mb-2 capitalize">{resource}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {resourcePermissions.map((permission) => (
                            <FormField
                              key={permission.id}
                              control={form.control}
                              name="permission_ids"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(permission.id)}
                                      onCheckedChange={(checked) => {
                                        const newValue = [...(field.value || [])];
                                        if (checked) {
                                          newValue.push(permission.id);
                                        } else {
                                          const index = newValue.indexOf(permission.id);
                                          if (index !== -1) {
                                            newValue.splice(index, 1);
                                          }
                                        }
                                        field.onChange(newValue);
                                      }}
                                    />
                                  </FormControl>
                                  <div className="space-y-1 leading-none">
                                    <FormLabel className="font-normal">
                                      <div className="flex gap-2 items-center">
                                        <span>{permission.action}</span>
                                        <Badge variant="outline" className="text-xs">
                                          {permission.resource}:{permission.action}
                                        </Badge>
                                      </div>
                                    </FormLabel>
                                    <FormDescription className="text-xs">
                                      {permission.description}
                                    </FormDescription>
                                  </div>
                                </FormItem>
                              )}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <CardFooter className="flex justify-end px-0">
                <Button 
                  type="submit" 
                  disabled={updateRoleMutation.isPending || !form.formState.isDirty}
                >
                  {updateRoleMutation.isPending ? (
                    <Spinner size="sm" className="mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </CardFooter>
              
              {updateRoleMutation.isSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-md p-3 flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-800">Role updated successfully</p>
                    <p className="text-sm text-green-700">All changes have been saved</p>
                  </div>
                </div>
              )}
              
              {updateRoleMutation.isError && (
                <div className="bg-destructive/10 p-3 rounded-md text-destructive">
                  <p className="font-medium">Failed to update role</p>
                  <p className="text-sm">{(updateRoleMutation.error as Error)?.message || 'Unknown error occurred'}</p>
                </div>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
    </PermissionGate>
  );
}

export default RoleDetails;
