'use client';

import React, { useState, useEffect } from 'react';
import { 
  useBasicHealth, 
  useSystemInfo, 
  useDatabaseStatus, 
  useAIModelsStatus, 
  useFullHealth, 
  useApiConnectivity 
} from '@/lib/hooks/useHealth';
import StatusCard from './StatusCard';

/**
 * Component for displaying a comprehensive system health dashboard
 */
export default function HealthDashboard() {
  // State for connectivity check
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  
  // Setup health check hooks
  const { 
    data: connectivityData, 
    isLoading: connectivityLoading, 
    error: connectivityError,
    refetch: refetchConnectivity
  } = useApiConnectivity({ 
    refetchInterval: 60000, // Check every minute
    timeout: 5000 // 5 second timeout
  });
  
  const { 
    data: healthData, 
    isLoading: healthLoading, 
    error: healthError,
    refetch: refetchHealth
  } = useBasicHealth({
    enabled: !!connectivityData,
    refetchInterval: connectivityData ? 30000 : false // Check every 30 seconds if connected
  });
  
  const { 
    data: systemData, 
    isLoading: systemLoading, 
    error: systemError,
    refetch: refetchSystem
  } = useSystemInfo({
    enabled: !!connectivityData,
    refetchInterval: connectivityData ? 30000 : false
  });
  
  const { 
    data: databaseData, 
    isLoading: databaseLoading, 
    error: databaseError,
    refetch: refetchDatabase
  } = useDatabaseStatus({
    enabled: !!connectivityData,
    refetchInterval: connectivityData ? 30000 : false
  });
  
  const { 
    data: aiModelsData, 
    isLoading: aiModelsLoading, 
    error: aiModelsError,
    refetch: refetchAiModels
  } = useAIModelsStatus({
    enabled: !!connectivityData,
    refetchInterval: connectivityData ? 60000 : false // Check every minute if connected
  });
  
  const { 
    data: fullHealthData, 
    isLoading: fullHealthLoading, 
    error: fullHealthError,
    refetch: refetchFullHealth
  } = useFullHealth({
    enabled: !!connectivityData,
    refetchInterval: connectivityData ? 60000 : false // Check every minute if connected
  });
  
  // Update last sync time when data refreshes
  useEffect(() => {
    if (fullHealthData) {
      setLastSyncTime(new Date());
    }
  }, [fullHealthData]);
  
  // Get status type based on connection and health data
  const getConnectionStatus = () => {
    if (connectivityLoading) return 'unknown';
    if (connectivityError || !connectivityData) return 'error';
    return 'healthy';
  };
  
  const getSystemStatus = () => {
    if (systemLoading || !systemData) return 'unknown';
    if (systemError) return 'error';
    
    // Determine status based on resource usage
    const { cpu_usage_percent, memory_usage_percent, disk_usage_percent } = systemData;
    
    if (cpu_usage_percent > 90 || memory_usage_percent > 90 || disk_usage_percent > 90) {
      return 'error';
    }
    if (cpu_usage_percent > 75 || memory_usage_percent > 75 || disk_usage_percent > 75) {
      return 'warning';
    }
    if (cpu_usage_percent > 60 || memory_usage_percent > 60 || disk_usage_percent > 60) {
      return 'degraded';
    }
    return 'healthy';
  };
  
  const getDatabaseStatus = () => {
    if (databaseLoading || !databaseData) return 'unknown';
    if (databaseError) return 'error';
    if (databaseData.status === 'connected') return 'healthy';
    return 'error';
  };
  
  const getAIModelsStatus = () => {
    if (aiModelsLoading || !aiModelsData) return 'unknown';
    if (aiModelsError) return 'error';
    if (aiModelsData.status === 'operational') return 'healthy';
    if (aiModelsData.status === 'limited') return 'degraded';
    return 'warning';
  };
  
  const getOverallStatus = () => {
    if (fullHealthLoading || !fullHealthData) return 'unknown';
    if (fullHealthError) return 'error';
    if (fullHealthData.status === 'healthy') return 'healthy';
    if (fullHealthData.status === 'degraded') return 'degraded';
    return 'error';
  };
  
  // Refresh all data
  const refreshAllData = () => {
    refetchConnectivity();
    refetchHealth();
    refetchSystem();
    refetchDatabase();
    refetchAiModels();
    refetchFullHealth();
    setLastSyncTime(new Date());
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between border-b pb-4 md:flex-row md:items-center">
        <h1 className="text-2xl font-bold">System Health Dashboard</h1>
        <div className="mt-4 flex items-center space-x-4 md:mt-0">
          <button
            onClick={refreshAllData}
            className="inline-flex items-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="-ml-1 mr-2 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
          <p className="text-xs text-gray-500">
            Last updated: {lastSyncTime.toLocaleTimeString()}
          </p>
        </div>
      </div>
      
      {/* Overall system status */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatusCard
          title="Overall Status"
          status={getOverallStatus()}
          value={fullHealthData?.status}
          description="Overall system health status"
          loading={fullHealthLoading}
          error={!!fullHealthError}
          onRetry={refreshAllData}
          className="col-span-full"
        />
        
        <StatusCard
          title="API Connectivity"
          status={getConnectionStatus()}
          value={connectivityData ? 'Connected' : 'Disconnected'}
          description="Backend API connection status"
          loading={connectivityLoading}
          error={!!connectivityError}
          onRetry={refetchConnectivity}
        />
        
        <StatusCard
          title="Uptime"
          status={healthData ? 'healthy' : 'unknown'}
          value={healthData?.uptime}
          description="System uptime"
          loading={healthLoading}
          error={!!healthError}
          onRetry={refetchHealth}
        />
        
        <StatusCard
          title="Database"
          status={getDatabaseStatus()}
          value={databaseData?.type}
          description={databaseData?.message}
          loading={databaseLoading}
          error={!!databaseError}
          onRetry={refetchDatabase}
        />
        
        <StatusCard
          title="AI Models"
          status={getAIModelsStatus()}
          value={aiModelsData?.status}
          description={`${Object.values(aiModelsData?.models || {}).filter(Boolean).length || 0} model(s) available`}
          loading={aiModelsLoading}
          error={!!aiModelsError}
          onRetry={refetchAiModels}
        />
      </div>
      
      {/* Detailed system information */}
      {systemData && !systemLoading && !systemError && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">System Resources</h2>
          
          <div className="grid gap-4 md:grid-cols-3">
            <ResourceUsageCard
              title="CPU Usage"
              percentage={systemData.cpu_usage_percent}
              description={`System: ${systemData.os} ${systemData.os_version}`}
            />
            
            <ResourceUsageCard
              title="Memory Usage"
              percentage={systemData.memory_usage_percent}
              description="System RAM utilization"
            />
            
            <ResourceUsageCard
              title="Disk Usage"
              percentage={systemData.disk_usage_percent}
              description="Primary disk utilization"
            />
          </div>
        </div>
      )}
      
      {/* AI Models Details */}
      {aiModelsData && !aiModelsLoading && !aiModelsError && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">AI Models Status</h2>
          
          <div className="grid gap-4 md:grid-cols-3">
            <ModelStatusCard
              title="RAG Pipeline"
              available={aiModelsData.models.rag_available}
              description="Retrieval-Augmented Generation"
            />
            
            <ModelStatusCard
              title="Document Summarizer"
              available={aiModelsData.models.summarizer_available}
              description="Document summarization capabilities"
            />
            
            <ModelStatusCard
              title="Document Processor"
              available={aiModelsData.models.document_processor_available}
              description="Document parsing and extraction"
            />
          </div>
        </div>
      )}
      
      {/* Version information */}
      {fullHealthData && (
        <div className="mt-8 text-center text-xs text-gray-500">
          JurisAI Backend v{fullHealthData.version} | Python {systemData?.python_version}
        </div>
      )}
    </div>
  );
}

// Helper component for resource usage
const ResourceUsageCard: React.FC<{
  title: string;
  percentage: number;
  description: string;
}> = ({ title, percentage, description }) => {
  // Get color based on percentage
  const getBarColor = (percentage: number) => {
    if (percentage > 90) return 'bg-red-500';
    if (percentage > 75) return 'bg-orange-500';
    if (percentage > 60) return 'bg-yellow-500';
    return 'bg-green-500';
  };
  
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-medium text-gray-900">{title}</h3>
      <p className="mb-2 text-xs text-gray-500">{description}</p>
      
      <div className="mt-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-700">
            {percentage.toFixed(1)}%
          </span>
        </div>
        <div className="mt-1 h-2 w-full rounded-full bg-gray-200">
          <div
            className={`h-2 rounded-full ${getBarColor(percentage)}`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};

// Helper component for model status
const ModelStatusCard: React.FC<{
  title: string;
  available: boolean;
  description: string;
}> = ({ title, available, description }) => {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-900">{title}</h3>
          <p className="mt-1 text-xs text-gray-500">{description}</p>
        </div>
        <div className="flex items-center space-x-1.5">
          <div className={`h-2.5 w-2.5 rounded-full ${available ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-xs font-medium">
            {available ? 'Available' : 'Unavailable'}
          </span>
        </div>
      </div>
    </div>
  );
};
