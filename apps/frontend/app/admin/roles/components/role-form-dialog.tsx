'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Spinner } from '@/components/ui/spinner';

import { usePermissions } from '@/lib/hooks/usePermissions';
import { useRole } from '@/lib/hooks/useRoles';
import { Permission, Role, RoleParams } from '@/lib/api/types';

// Form schema
const roleFormSchema = z.object({
  name: z.string().min(2, { message: 'Role name must be at least 2 characters' }).max(50, { message: 'Role name must be less than 50 characters' }),
  description: z.string().min(5, { message: 'Description must be at least 5 characters' }).max(200, { message: 'Description must be less than 200 characters' }),
  permission_ids: z.array(z.number()).optional(),
});

type RoleFormValues = z.infer<typeof roleFormSchema>;

interface RoleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  roleId?: number;
  onSubmit: (data: RoleParams) => Promise<void>;
}

export default function RoleFormDialog({ 
  open, 
  onOpenChange, 
  mode = 'create',
  roleId,
  onSubmit 
}: RoleFormDialogProps) {
  const [selectedPermissions, setSelectedPermissions] = useState<Permission[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get permissions data
  const { data: permissions, isLoading: isLoadingPermissions } = usePermissions();
  
  // Only fetch role data when in edit mode and roleId is provided
  const { data: roleData, isLoading: isLoadingRole } = useRole(
    mode === 'edit' && roleId ? roleId : 0
  );

  // Set up form
  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      name: '',
      description: '',
      permission_ids: [],
    },
  });

  // Update form with role data when editing
  useEffect(() => {
    if (mode === 'edit' && roleData) {
      form.reset({
        name: roleData.name,
        description: roleData.description,
        permission_ids: roleData.permissions.map((p) => p.id),
      });
      
      setSelectedPermissions(roleData.permissions);
    }
  }, [form, mode, roleData]);

  const handleSubmit = async (formData: RoleFormValues) => {
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      form.reset();
      setSelectedPermissions([]);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = isLoadingPermissions || (mode === 'edit' && isLoadingRole);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create New Role' : 'Edit Role'}</DialogTitle>
          <DialogDescription>
            {mode === 'create' 
              ? 'Create a new role with permissions to control access to different features.'
              : 'Modify this role and its associated permissions.'}
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Document Manager" {...field} />
                    </FormControl>
                    <FormDescription>
                      A short, descriptive name for this role.
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
                        placeholder="Describe the purpose and access level of this role" 
                        className="resize-none"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Detailed explanation of the role's purpose and responsibilities.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="permission_ids"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Permissions</FormLabel>
                    <div className="mb-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            className="w-full justify-between"
                          >
                            {selectedPermissions.length > 0
                              ? `${selectedPermissions.length} permission${selectedPermissions.length > 1 ? 's' : ''} selected`
                              : 'Select permissions...'}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
                          <Command>
                            <CommandInput placeholder="Search permissions..." />
                            <CommandEmpty>No permissions found.</CommandEmpty>
                            <CommandGroup className="max-h-60 overflow-y-auto">
                              {permissions?.map((permission: Permission) => (
                                <CommandItem
                                  key={permission.id}
                                  value={permission.id.toString()}
                                  onSelect={() => {
                                    const isSelected = field.value?.includes(permission.id);
                                    const newPermissionIds = isSelected
                                      ? field.value?.filter((id) => id !== permission.id) || []
                                      : [...(field.value || []), permission.id];
                                    
                                    field.onChange(newPermissionIds);
                                    
                                    setSelectedPermissions(
                                      isSelected
                                        ? selectedPermissions.filter((p) => p.id !== permission.id)
                                        : [...selectedPermissions, permission]
                                    );
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      field.value?.includes(permission.id) ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <span className="font-medium">
                                    {permission.resource}:{permission.action}
                                  </span>
                                  <span className="ml-2 text-muted-foreground text-xs">
                                    {permission.description}
                                  </span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <FormDescription>
                      Select the permissions that users with this role will have.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Spinner className="mr-2" size="sm" />
                      {mode === 'create' ? 'Creating...' : 'Updating...'}
                    </>
                  ) : (
                    mode === 'create' ? 'Create Role' : 'Update Role'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
