'use client';

import { Suspense } from 'react';
import HealthDashboard from '@/components/health/HealthDashboard';

/**
 * Health Dashboard Page
 * Provides a comprehensive view of system health and connectivity
 */
export default function HealthPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Suspense fallback={<HealthDashboardSkeleton />}>
        <HealthDashboard />
      </Suspense>
    </div>
  );
}

/**
 * Skeleton loader for health dashboard
 */
function HealthDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between border-b pb-4 md:flex-row md:items-center">
        <div className="h-8 w-64 animate-pulse rounded bg-gray-200"></div>
        <div className="mt-4 flex items-center space-x-4 md:mt-0">
          <div className="h-10 w-28 animate-pulse rounded bg-gray-200"></div>
          <div className="h-4 w-40 animate-pulse rounded bg-gray-200"></div>
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="col-span-full h-24 animate-pulse rounded-lg bg-gray-200"></div>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-200"></div>
        ))}
      </div>
      
      <div className="space-y-4">
        <div className="h-6 w-40 animate-pulse rounded bg-gray-200"></div>
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg bg-gray-200"></div>
          ))}
        </div>
      </div>
    </div>
  );
}
