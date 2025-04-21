'use client';

import { Shield, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface AccessDeniedProps {
  title?: string;
  message?: string;
  showHomeButton?: boolean;
  requiredPermission?: string;
}

/**
 * A component to display when a user doesn't have access to a feature
 */
export function AccessDenied({
  title = "Access Denied",
  message = "You don't have permission to access this resource.",
  showHomeButton = true,
  requiredPermission
}: AccessDeniedProps) {
  return (
    <div className="flex items-center justify-center h-full p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Shield className="h-12 w-12 text-destructive opacity-80" />
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            {message}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {requiredPermission && (
            <div className="bg-muted p-3 rounded-md mb-4 flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium mb-1">Required Permission</p>
                <code className="bg-background px-1.5 py-0.5 rounded text-xs">{requiredPermission}</code>
              </div>
            </div>
          )}
          
          <div className="flex flex-col space-y-2 mt-4">
            {showHomeButton && (
              <Button asChild>
                <Link href="/">Return to Home</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AccessDenied;
