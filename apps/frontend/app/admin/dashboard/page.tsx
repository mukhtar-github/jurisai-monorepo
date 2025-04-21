'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { AccessDenied } from '@/components/auth/AccessDenied';
import { PermissionsDashboard } from '@/components/admin/PermissionsDashboard';
import { SystemFeaturesDashboard } from '@/components/admin/SystemFeaturesDashboard';
import { useAuth } from '@/lib/context/AuthContext';
import { Shield, Users, Activity, Settings, Layers } from 'lucide-react';

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <PermissionGate
      permissions={["admin:access"]}
      fallback={<AccessDenied title="Admin Access Required" message="You don't have permission to access the admin dashboard." />}
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <Badge variant="outline" className="px-3 py-1 text-sm">
            {user?.role === 'admin' ? 'Administrator' : 'Limited Access'}
          </Badge>
        </div>

        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-5 h-auto">
            <TabsTrigger value="overview" className="flex items-center gap-2 py-3">
              <Activity className="h-4 w-4" />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2 py-3">
              <Users className="h-4 w-4" />
              <span>Users</span>
            </TabsTrigger>
            <TabsTrigger value="roles" className="flex items-center gap-2 py-3">
              <Shield className="h-4 w-4" />
              <span>Roles</span>
            </TabsTrigger>
            <TabsTrigger value="permissions" className="flex items-center gap-2 py-3">
              <Layers className="h-4 w-4" />
              <span>Permissions</span>
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2 py-3">
              <Settings className="h-4 w-4" />
              <span>System</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <PermissionGate permissions="user:read">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Users</CardTitle>
                    <CardDescription>User account management</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-2">
                      <Button variant="outline" className="justify-start" asChild>
                        <a href="/admin/users">
                          <Users className="h-4 w-4 mr-2" />
                          Manage Users
                        </a>
                      </Button>
                      <Button variant="outline" className="justify-start" asChild>
                        <a href="/admin/roles/users">
                          <Users className="h-4 w-4 mr-2" />
                          User Role Assignments
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </PermissionGate>

              <PermissionGate permissions="role:read">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Roles</CardTitle>
                    <CardDescription>Role configuration</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-2">
                      <Button variant="outline" className="justify-start" asChild>
                        <a href="/admin/roles">
                          <Shield className="h-4 w-4 mr-2" />
                          Manage Roles
                        </a>
                      </Button>
                      <Button variant="outline" className="justify-start" asChild>
                        <a href="/admin/roles/create">
                          <Shield className="h-4 w-4 mr-2" />
                          Create New Role
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </PermissionGate>

              <PermissionGate permissions="permission:read">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Permissions</CardTitle>
                    <CardDescription>System permissions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-2">
                      <Button variant="outline" className="justify-start" asChild>
                        <a href="/admin/permissions">
                          <Layers className="h-4 w-4 mr-2" />
                          Manage Permissions
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </PermissionGate>
            </div>
            
            <PermissionGate permissions="system:view">
              <Card>
                <CardHeader>
                  <CardTitle>System Status</CardTitle>
                  <CardDescription>Overall system health and feature implementation</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="p-6 pt-0">
                    <SystemFeaturesDashboard />
                  </div>
                </CardContent>
              </Card>
            </PermissionGate>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <PermissionGate 
              permissions="user:read"
              fallback={<AccessDenied requiredPermission="user:read" />}
            >
              <Card>
                <CardHeader>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>
                    Manage system users and their access levels
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-lg text-center py-6">
                    User management components will be integrated here
                  </p>
                </CardContent>
              </Card>
            </PermissionGate>
          </TabsContent>

          {/* Roles Tab */}
          <TabsContent value="roles">
            <PermissionGate 
              permissions="role:read"
              fallback={<AccessDenied requiredPermission="role:read" />}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Role Management</CardTitle>
                  <CardDescription>
                    Configure roles and their associated permissions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-lg text-center py-6">
                    Role management interface will be integrated here
                  </p>
                </CardContent>
              </Card>
            </PermissionGate>
          </TabsContent>

          {/* Permissions Tab */}
          <TabsContent value="permissions">
            <PermissionGate 
              permissions="permission:read"
              fallback={<AccessDenied requiredPermission="permission:read" />}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Permission Management</CardTitle>
                  <CardDescription>
                    View and configure system permissions
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="p-6 pt-0">
                    <PermissionsDashboard />
                  </div>
                </CardContent>
              </Card>
            </PermissionGate>
          </TabsContent>

          {/* System Tab */}
          <TabsContent value="system">
            <PermissionGate 
              permissions="system:view"
              fallback={<AccessDenied requiredPermission="system:view" />}
            >
              <Card>
                <CardHeader>
                  <CardTitle>System Settings</CardTitle>
                  <CardDescription>
                    Configure system-wide settings and monitor feature status
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="p-6 pt-0">
                    <SystemFeaturesDashboard />
                  </div>
                </CardContent>
              </Card>
            </PermissionGate>
          </TabsContent>
        </Tabs>
      </div>
    </PermissionGate>
  );
}
