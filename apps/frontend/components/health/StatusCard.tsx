'use client';

import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type StatusType = 'healthy' | 'degraded' | 'error' | 'warning' | 'unknown';

interface StatusCardProps {
  title: string;
  status: StatusType;
  value?: string | number | ReactNode;
  description?: string;
  icon?: ReactNode;
  className?: string;
  loading?: boolean;
  error?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
}

/**
 * Component for displaying a status card with health information
 */
const StatusCard: React.FC<StatusCardProps> = ({
  title,
  status,
  value,
  description,
  icon,
  className,
  loading = false,
  error = false,
  errorMessage,
  onRetry
}) => {
  // Get status color
  const getStatusColor = (status: StatusType) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'degraded':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'unknown':
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  // Get status indicator color
  const getStatusIndicatorColor = (status: StatusType) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500';
      case 'degraded':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      case 'warning':
        return 'bg-orange-500';
      case 'unknown':
      default:
        return 'bg-gray-500';
    }
  };

  // Get status text
  const getStatusText = (status: StatusType) => {
    switch (status) {
      case 'healthy':
        return 'Operational';
      case 'degraded':
        return 'Degraded';
      case 'error':
        return 'Offline';
      case 'warning':
        return 'Warning';
      case 'unknown':
      default:
        return 'Unknown';
    }
  };

  return (
    <div
      className={cn(
        'rounded-lg border p-4 shadow-sm transition-all',
        getStatusColor(status),
        loading ? 'opacity-75' : '',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-medium">{title}</h3>
          
          {loading ? (
            <div className="mt-2 h-5 w-20 animate-pulse rounded bg-current opacity-25"></div>
          ) : error ? (
            <div className="mt-1">
              <p className="text-xs text-red-600">{errorMessage || 'Error fetching data'}</p>
              {onRetry && (
                <button 
                  onClick={onRetry}
                  className="mt-2 text-xs font-medium text-primary-600 hover:text-primary-500"
                >
                  Retry
                </button>
              )}
            </div>
          ) : (
            <>
              {value !== undefined && (
                <div className="mt-1 text-2xl font-semibold">
                  {value}
                </div>
              )}
              {description && (
                <p className="mt-1 text-xs">{description}</p>
              )}
            </>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {icon && <div className="text-xl">{icon}</div>}
          <div className="flex items-center">
            <div
              className={cn(
                'mr-1.5 h-2.5 w-2.5 rounded-full',
                getStatusIndicatorColor(status)
              )}
            ></div>
            <span className="text-xs font-medium">
              {getStatusText(status)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusCard;
