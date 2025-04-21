'use client';

import { useState } from 'react';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useHasPermission } from '@/lib/hooks/usePermissionCheck';
import { Permission } from '@/lib/api/types';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { AccessDenied } from '@/components/auth/AccessDenied';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Shield, Search, Filter, Plus, Trash2, RefreshCw } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export function PermissionsDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [resourceFilter, setResourceFilter] = useState<string | null>(null);
  const [permissionToDelete, setPermissionToDelete] = useState<Permission | null>(null);
  
  const { data: permissions, isLoading, error, refetch } = usePermissions();
  
  // Extract all unique resources for filtering
  const uniqueResources = permissions ? 
    Array.from(new Set(permissions.map(p => p.resource))) : 
    [];
  
  // Filter and search permissions
  const filteredPermissions = permissions?.filter(permission => {
    // Apply resource filter if selected
    if (resourceFilter && permission.resource !== resourceFilter) {
      return false;
    }
    
    // Apply search filter if provided
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        permission.resource.toLowerCase().includes(query) ||
        permission.action.toLowerCase().includes(query) ||
        `${permission.resource}:${permission.action}`.toLowerCase().includes(query) ||
        permission.description.toLowerCase().includes(query)
      );
    }
    
    return true;
  }) || [];
  
  // Group permissions by resource
  const permissionsByResource = filteredPermissions.reduce((groups: Record<string, Permission[]>, permission: Permission) => {
    const resourceName = permission.resource;
    if (!groups[resourceName]) {
      groups[resourceName] = [];
    }
    groups[resourceName].push(permission);
    return groups;
  }, {});
  
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
    <PermissionGate
      permissions="permission:read"
      fallback={<AccessDenied requiredPermission="permission:read" />}
    >
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Shield className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">System Permissions</h2>
          </div>
          
          <div className="flex flex-col md:flex-row gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search permissions..."
                className="pl-8 w-full md:w-[250px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {/* Resource Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full md:w-auto">
                  <Filter className="h-4 w-4 mr-2" />
                  {resourceFilter ? resourceFilter : 'All Resources'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0" align="end">
                <Command>
                  <CommandInput placeholder="Search resources..." />
                  <CommandList>
                    <CommandEmpty>No resources found</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        onSelect={() => setResourceFilter(null)}
                        className={!resourceFilter ? 'bg-accent' : ''}
                      >
                        All Resources
                      </CommandItem>
                      {uniqueResources.map((resource) => (
                        <CommandItem
                          key={resource}
                          onSelect={() => setResourceFilter(resource)}
                          className={resourceFilter === resource ? 'bg-accent' : ''}
                        >
                          {resource}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            
            {/* Refresh */}
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            
            {/* Create Permission (only for users with permission:write permission) */}
            <PermissionGate permissions="permission:write">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Permission
              </Button>
            </PermissionGate>
          </div>
        </div>
        
        {/* Permissions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Permission Registry</CardTitle>
            <CardDescription>
              {filteredPermissions.length} permission{filteredPermissions.length !== 1 ? 's' : ''} found
              {resourceFilter && ` for resource "${resourceFilter}"`}
              {searchQuery && ` matching "${searchQuery}"`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Permission</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead className="hidden md:table-cell">Description</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPermissions.length > 0 ? (
                  filteredPermissions.map((permission) => (
                    <TableRow key={permission.id}>
                      <TableCell>
                        <Badge variant="outline">
                          {permission.resource}:{permission.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{permission.resource}</TableCell>
                      <TableCell>{permission.action}</TableCell>
                      <TableCell className="hidden md:table-cell">{permission.description}</TableCell>
                      <TableCell className="text-right">
                        <PermissionGate permissions="permission:delete">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setPermissionToDelete(permission)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </PermissionGate>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No permissions found. {resourceFilter || searchQuery ? 'Try changing your filters.' : ''}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        {/* Resource Groups View */}
        <div className="grid grid-cols-1 gap-6">
          {Object.entries(permissionsByResource).map(([resource, resourcePermissions]) => (
            <Card key={resource}>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="capitalize">{resource}</CardTitle>
                    <CardDescription>
                      {resourcePermissions.length} permission{resourcePermissions.length !== 1 ? 's' : ''}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-sm">{resource}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {resourcePermissions.map((permission) => (
                    <div 
                      key={permission.id} 
                      className="flex justify-between items-center p-3 border rounded-md hover:bg-accent/50 transition-colors"
                    >
                      <div>
                        <div className="font-medium">
                          {permission.action}
                          <Badge variant="outline" className="ml-2 text-xs">
                            {permission.resource}:{permission.action}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">{permission.description}</div>
                      </div>
                      <PermissionGate permissions="permission:delete">
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => setPermissionToDelete(permission)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </PermissionGate>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!permissionToDelete} onOpenChange={(open: boolean) => !open && setPermissionToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Permission</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the permission &quot;{permissionToDelete?.resource}:{permissionToDelete?.action}&quot;?
                This action cannot be undone and may break functionality for users with roles that depend on this permission.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  // Handle permission deletion here
                  setPermissionToDelete(null);
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PermissionGate>
  );
}

export default PermissionsDashboard;
