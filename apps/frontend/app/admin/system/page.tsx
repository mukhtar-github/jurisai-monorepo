'use client';

import { useQuery } from '@tanstack/react-query';
import { getSystemFeatures } from '@/lib/api/roles';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';

export default function SystemPage() {
  // Fetch system features status
  const { data, isLoading, error } = useQuery({
    queryKey: ['systemFeatures'],
    queryFn: getSystemFeatures,
  });

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

  const features = data?.features || {};
  
  // Count features by status
  const statusCounts = Object.values(features).reduce(
    (acc: Record<string, number>, feature) => {
      acc[feature.status] = (acc[feature.status] || 0) + 1;
      return acc;
    }, 
    {}
  );
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'unavailable':
        return <XCircle className="h-5 w-5 text-destructive" />;
      case 'partial':
        return <AlertCircle className="h-5 w-5 text-amber-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-500 text-white';
      case 'unavailable':
        return 'bg-destructive text-destructive-foreground';
      case 'partial':
        return 'bg-amber-500 text-black';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">System Status</h2>
        <p className="text-muted-foreground mt-1">Overview of JurisAI system features and their implementation status</p>
      </div>
      
      {/* Status Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-green-500 flex items-center">
              <CheckCircle className="mr-2 h-5 w-5" />
              Available
            </CardTitle>
            <CardDescription>Fully implemented features</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{statusCounts['available'] || 0}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-amber-500 flex items-center">
              <AlertCircle className="mr-2 h-5 w-5" />
              Partial
            </CardTitle>
            <CardDescription>Partially implemented features</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{statusCounts['partial'] || 0}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-destructive flex items-center">
              <XCircle className="mr-2 h-5 w-5" />
              Unavailable
            </CardTitle>
            <CardDescription>Unimplemented features</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{statusCounts['unavailable'] || 0}</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Feature Details */}
      <div className="space-y-4">
        <h3 className="text-xl font-medium">Feature Details</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(features).map(([key, feature]) => (
            <Card key={key} className="overflow-hidden">
              <CardHeader className="border-b bg-muted/50 pb-2 pt-4">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-base">{feature.name}</CardTitle>
                  <Badge className={getStatusColor(feature.status)}>
                    <span className="flex items-center">
                      {getStatusIcon(feature.status)}
                      <span className="ml-1">{feature.status}</span>
                    </span>
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <p>{feature.description}</p>
                {feature.version && (
                  <p className="mt-2 text-xs text-muted-foreground">Version: {feature.version}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
