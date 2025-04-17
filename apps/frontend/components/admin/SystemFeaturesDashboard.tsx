'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SystemFeaturesResponse } from '@/lib/api/types';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Spinner } from '@/components/ui/spinner';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { AccessDenied } from '@/components/auth/AccessDenied';
import { CheckCircle, XCircle, AlertCircle, RefreshCw, Activity, Database, Users, Search, FileText, Lock } from 'lucide-react';

// API endpoint to fetch system features status
const fetchSystemFeatures = async (): Promise<SystemFeaturesResponse> => {
  const response = await fetch('/api/system/features');
  if (!response.ok) {
    throw new Error('Failed to fetch system features');
  }
  return response.json();
};

// Feature category definitions
const FEATURE_CATEGORIES = {
  core: {
    title: 'Core Features',
    icon: <Database className="h-5 w-5" />,
  },
  document: {
    title: 'Document Processing',
    icon: <FileText className="h-5 w-5" />,
  },
  search: {
    title: 'Search & RAG',
    icon: <Search className="h-5 w-5" />,
  },
  users: {
    title: 'User Management',
    icon: <Users className="h-5 w-5" />,
  },
  security: {
    title: 'Security & Access',
    icon: <Lock className="h-5 w-5" />,
  },
};

// Map feature keys to categories
const getFeatureCategory = (featureKey: string): string => {
  if (featureKey.startsWith('document_')) return 'document';
  if (featureKey.startsWith('search_') || featureKey.includes('rag')) return 'search';
  if (featureKey.startsWith('user_') || featureKey.includes('auth')) return 'users';
  if (featureKey.includes('role') || featureKey.includes('permission')) return 'security';
  return 'core';
};

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  switch (status.toLowerCase()) {
    case 'implemented':
    case 'complete':
    case 'active':
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
          <CheckCircle className="h-3.5 w-3.5 mr-1" />
          {status}
        </Badge>
      );
    case 'in_progress':
    case 'partial':
      return (
        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200">
          <AlertCircle className="h-3.5 w-3.5 mr-1" />
          In Progress
        </Badge>
      );
    case 'not_implemented':
    case 'missing':
    case 'inactive':
      return (
        <Badge className="bg-red-100 text-red-800 hover:bg-red-200">
          <XCircle className="h-3.5 w-3.5 mr-1" />
          Not Implemented
        </Badge>
      );
    default:
      return (
        <Badge variant="outline">
          {status}
        </Badge>
      );
  }
};

export function SystemFeaturesDashboard() {
  const [activeTab, setActiveTab] = useState('all');
  
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['system-features'],
    queryFn: fetchSystemFeatures,
  });
  
  // Group features by category
  const featuresByCategory = data?.features ? 
    Object.entries(data.features).reduce(
      (acc: Record<string, any>, [key, feature]) => {
        const category = getFeatureCategory(key);
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push({ key, ...feature });
        return acc;
      },
      {}
    ) : {};
  
  // Count features by status
  const statusCounts = data?.features ? 
    Object.values(data.features).reduce(
      (acc: Record<string, number>, feature: any) => {
        const status = feature.status.toLowerCase();
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      {}
    ) : {};
  
  const totalFeatures = data?.features ? Object.keys(data.features).length : 0;
  const implementedFeatures = statusCounts?.['implemented'] || 0;
  const implementationPercentage = totalFeatures ? Math.round((implementedFeatures / totalFeatures) * 100) : 0;
  
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
        <p className="font-medium">Error loading system features</p>
        <p>{(error as Error).message || 'Unknown error occurred'}</p>
      </div>
    );
  }
  
  return (
    <PermissionGate
      permissions="system:view"
      fallback={<AccessDenied requiredPermission="system:view" />}
    >
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Activity className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">System Features</h2>
          </div>
          
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Status
          </Button>
        </div>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Implementation Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">{implementationPercentage}%</div>
                <div className="text-sm text-muted-foreground">
                  {implementedFeatures} of {totalFeatures} features
                </div>
              </div>
              <div className="mt-2 h-2 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary"
                  style={{ width: `${implementationPercentage}%` }}
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Implementation Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-green-500 mr-2" />
                    <span>Implemented</span>
                  </div>
                  <Badge variant="outline">{statusCounts?.['implemented'] || 0}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-amber-500 mr-2" />
                    <span>In Progress</span>
                  </div>
                  <Badge variant="outline">{statusCounts?.['in_progress'] || 0}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-red-500 mr-2" />
                    <span>Not Implemented</span>
                  </div>
                  <Badge variant="outline">{statusCounts?.['not_implemented'] || 0}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">System Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>API Status</span>
                  <StatusBadge status="active" />
                </div>
                <div className="flex justify-between items-center">
                  <span>Database</span>
                  <StatusBadge status="active" />
                </div>
                <div className="flex justify-between items-center">
                  <span>Redis Cache</span>
                  <StatusBadge status="active" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Features Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>Feature Implementation Status</CardTitle>
            <CardDescription>
              Track the status of all system features and components
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="all">All Features</TabsTrigger>
                {Object.keys(FEATURE_CATEGORIES).map(category => (
                  <TabsTrigger key={category} value={category}>
                    {FEATURE_CATEGORIES[category as keyof typeof FEATURE_CATEGORIES].title}
                  </TabsTrigger>
                ))}
              </TabsList>
              
              <TabsContent value="all" className="space-y-6">
                {Object.entries(featuresByCategory).map(([category, features]) => (
                  <div key={category}>
                    <div className="flex items-center space-x-2 mb-3">
                      {FEATURE_CATEGORIES[category as keyof typeof FEATURE_CATEGORIES].icon}
                      <h3 className="text-lg font-medium">
                        {FEATURE_CATEGORIES[category as keyof typeof FEATURE_CATEGORIES].title}
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {(features as any[]).map(feature => (
                        <Card key={feature.key} className="border overflow-hidden">
                          <div className={`h-1 w-full ${
                            feature.status.toLowerCase() === 'implemented' ? 'bg-green-500' :
                            feature.status.toLowerCase() === 'in_progress' ? 'bg-amber-500' :
                            'bg-red-500'
                          }`} />
                          <CardHeader className="p-4 pb-2">
                            <div className="flex justify-between items-start">
                              <CardTitle className="text-md">{feature.name}</CardTitle>
                              <StatusBadge status={feature.status} />
                            </div>
                          </CardHeader>
                          <CardContent className="p-4 pt-0">
                            <p className="text-sm text-muted-foreground">{feature.description}</p>
                            {feature.version && (
                              <div className="mt-2">
                                <Badge variant="outline">v{feature.version}</Badge>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </TabsContent>
              
              {Object.keys(FEATURE_CATEGORIES).map(category => (
                <TabsContent key={category} value={category} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(featuresByCategory[category] as any[] || []).map(feature => (
                      <Card key={feature.key} className="border overflow-hidden">
                        <div className={`h-1 w-full ${
                          feature.status.toLowerCase() === 'implemented' ? 'bg-green-500' :
                          feature.status.toLowerCase() === 'in_progress' ? 'bg-amber-500' :
                          'bg-red-500'
                        }`} />
                        <CardHeader className="p-4 pb-2">
                          <div className="flex justify-between items-start">
                            <CardTitle className="text-md">{feature.name}</CardTitle>
                            <StatusBadge status={feature.status} />
                          </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                          <p className="text-sm text-muted-foreground">{feature.description}</p>
                          {feature.version && (
                            <div className="mt-2">
                              <Badge variant="outline">v{feature.version}</Badge>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </PermissionGate>
  );
}

export default SystemFeaturesDashboard;
