'use client';

import { useState } from 'react';
import { Permission, PermissionParams } from '@/lib/api/types';
import { usePermissions, useCreatePermission, useDeletePermission } from '@/lib/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Plus, Trash2, Edit } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// Form schema
const permissionFormSchema = z.object({
  resource: z.string().min(2, { message: 'Resource name must be at least 2 characters' }),
  action: z.string().min(2, { message: 'Action must be at least 2 characters' }),
  description: z.string().min(5, { message: 'Description must be at least 5 characters' }).max(200),
});

type PermissionFormValues = z.infer<typeof permissionFormSchema>;

export default function PermissionsPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [permissionToDelete, setPermissionToDelete] = useState<Permission | null>(null);
  
  const { data: permissions, isLoading, error } = usePermissions();
  const createPermissionMutation = useCreatePermission();
  const deletePermissionMutation = useDeletePermission();
  
  // Set up form
  const form = useForm<PermissionFormValues>({
    resolver: zodResolver(permissionFormSchema),
    defaultValues: {
      resource: '',
      action: '',
      description: '',
    },
  });
  
  const handleCreatePermission = async (data: PermissionFormValues) => {
    try {
      await createPermissionMutation.mutateAsync(data);
      setIsCreateDialogOpen(false);
      form.reset();
    } catch (error) {
      console.error('Failed to create permission:', error);
    }
  };
  
  const handleDeletePermission = async () => {
    if (!permissionToDelete) return;
    
    try {
      await deletePermissionMutation.mutateAsync(permissionToDelete.id);
      setPermissionToDelete(null);
    } catch (error) {
      console.error('Failed to delete permission:', error);
    }
  };
  
  // Group permissions by resource
  const permissionsByResource = permissions?.reduce((groups: Record<string, Permission[]>, permission: Permission) => {
    const resourceName = permission.resource;
    if (!groups[resourceName]) {
      groups[resourceName] = [];
    }
    groups[resourceName].push(permission);
    return groups;
  }, {}) || {};
  
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
        <p className="font-medium">Error loading permissions</p>
        <p>{(error as Error).message || 'Unknown error occurred'}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Permission Management</h2>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Permission
        </Button>
      </div>

      {permissions && permissions.length > 0 ? (
        <div className="grid grid-cols-1 gap-6">
          {(Object.entries(permissionsByResource) as [string, Permission[]][]).map(([resource, resourcePermissions]) => (
            <Card key={resource}>
              <CardHeader className="pb-3">
                <CardTitle>{resource}</CardTitle>
                <CardDescription>
                  {resourcePermissions.length} permission{resourcePermissions.length > 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {resourcePermissions.map(permission => (
                    <div 
                      key={permission.id} 
                      className="flex justify-between items-center p-3 border rounded-md hover:bg-accent/50 transition-colors"
                    >
                      <div>
                        <div className="font-medium">{permission.resource}:{permission.action}</div>
                        <div className="text-sm text-muted-foreground">{permission.description}</div>
                      </div>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => setPermissionToDelete(permission)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-muted rounded-md">
          <p className="text-muted-foreground mb-4">No permissions have been created yet</p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>Create Your First Permission</Button>
        </div>
      )}

      {/* Create Permission Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Permission</DialogTitle>
            <DialogDescription>
              Add a new permission to control access to a specific resource and action.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreatePermission)} className="space-y-6">
              <FormField
                control={form.control}
                name="resource"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resource</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. document, user, role" {...field} />
                    </FormControl>
                    <FormDescription>
                      The entity or resource this permission controls access to.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="action"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Action</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. read, write, delete" {...field} />
                    </FormControl>
                    <FormDescription>
                      The operation that this permission allows on the resource.
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
                        placeholder="Describe what this permission allows" 
                        className="resize-none"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      A clear explanation of what this permission grants access to.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                  disabled={createPermissionMutation.isPending}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createPermissionMutation.isPending}
                >
                  {createPermissionMutation.isPending ? (
                    <>
                      <Spinner className="mr-2" size="sm" />
                      Creating...
                    </>
                  ) : (
                    'Create Permission'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!permissionToDelete} onOpenChange={(open: boolean) => !open && setPermissionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Permission</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the permission 
              &quot;{permissionToDelete?.resource}:{permissionToDelete?.action}&quot;? 
              This action cannot be undone and may cause issues for roles that rely on this permission.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeletePermission}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
