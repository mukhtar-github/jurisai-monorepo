/**
 * Agent Task List Component
 * Displays user's agent tasks with real-time status updates
 */
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  RefreshCw, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Bot, 
  FileText,
  TrendingUp,
  Filter
} from 'lucide-react';
// Simple date formatting without external dependency
const formatDistanceToNow = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
};

import { 
  useUserAgentTasks,
  useInvalidateAgentQueries,
  agentTaskKeys 
} from '@/lib/hooks/useAgentTasks';
import type { AgentTaskListParams } from '@/lib/api/types';

interface AgentTaskListProps {
  className?: string;
  showFilters?: boolean;
  maxTasks?: number;
}

export function AgentTaskList({ 
  className, 
  showFilters = true,
  maxTasks = 50 
}: AgentTaskListProps) {
  const [filters, setFilters] = useState<AgentTaskListParams>({
    limit: maxTasks,
  });

  const { 
    data: tasks = [], 
    isLoading, 
    error, 
    refetch,
    isFetching 
  } = useUserAgentTasks(filters);

  const { invalidateAllTasks } = useInvalidateAgentQueries();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'failed':
        return 'destructive';
      case 'processing':
        return 'secondary';
      case 'pending':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getAgentTypeIcon = (agentType: string) => {
    switch (agentType) {
      case 'document_analyzer':
        return <FileText className="w-4 h-4" />;
      default:
        return <Bot className="w-4 h-4" />;
    }
  };

  const formatAgentType = (agentType: string) => {
    return agentType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleRefresh = () => {
    invalidateAllTasks();
    refetch();
  };

  const handleFilterChange = (key: keyof AgentTaskListParams, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? undefined : value,
    }));
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load agent tasks: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              Agent Tasks
            </CardTitle>
            <CardDescription>
              Monitor your AI agent task executions
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isFetching}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filters */}
        {showFilters && (
          <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            
            <Select
              value={filters.status_filter || 'all'}
              onValueChange={(value) => handleFilterChange('status_filter', value)}
            >
              <SelectTrigger className="w-[140px] h-8">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.agent_type || 'all'}
              onValueChange={(value) => handleFilterChange('agent_type', value)}
            >
              <SelectTrigger className="w-[160px] h-8">
                <SelectValue placeholder="Agent Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="document_analyzer">Document Analyzer</SelectItem>
                <SelectItem value="legal_research_agent">Legal Research</SelectItem>
                <SelectItem value="contract_review_agent">Contract Review</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span>Loading tasks...</span>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && tasks.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Bot className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No agent tasks found</p>
            <p className="text-sm">Start a document analysis to see tasks here</p>
          </div>
        )}

        {/* Task List */}
        {!isLoading && tasks.length > 0 && (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.task_id}
                className="border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getAgentTypeIcon(task.agent_type)}
                    <div>
                      <h4 className="font-medium">
                        {formatAgentType(task.agent_type)}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Task ID: {task.task_id.substring(0, 8)}...
                      </p>
                    </div>
                  </div>
                  
                  <Badge variant={getStatusColor(task.status)} className="flex items-center gap-1">
                    {getStatusIcon(task.status)}
                    {task.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Created:</span>
                    <br />
                    {task.created_at ? (
                      <span title={new Date(task.created_at).toLocaleString()}>
                        {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
                      </span>
                    ) : (
                      'Unknown'
                    )}
                  </div>
                  
                  {task.processing_time_ms && (
                    <div>
                      <span className="text-muted-foreground">Duration:</span>
                      <br />
                      {(task.processing_time_ms / 1000).toFixed(2)}s
                    </div>
                  )}

                  {task.confidence && (
                    <div>
                      <span className="text-muted-foreground">Confidence:</span>
                      <br />
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {Math.round(task.confidence * 100)}%
                      </div>
                    </div>
                  )}
                </div>

                {/* Results Preview */}
                {task.status === 'completed' && task.result && (
                  <div className="border-t pt-3">
                    <h5 className="text-sm font-medium mb-2">Results:</h5>
                    <div className="space-y-1 text-sm">
                      {task.result.summary && (
                        <div>
                          <span className="text-muted-foreground">Summary:</span>
                          <p className="text-xs mt-1 p-2 bg-muted rounded">
                            {task.result.summary.substring(0, 150)}
                            {task.result.summary.length > 150 && '...'}
                          </p>
                        </div>
                      )}
                      
                      {task.result.document_type && (
                        <div>
                          <span className="text-muted-foreground">Type:</span>
                          <Badge variant="outline" className="ml-2 text-xs">
                            {task.result.document_type}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {task.status === 'failed' && (
                  <Alert variant="destructive" className="mt-2">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      Task failed - check the error logs for details
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Summary */}
        {!isLoading && tasks.length > 0 && (
          <div className="border-t pt-3 text-sm text-muted-foreground">
            Showing {tasks.length} task{tasks.length !== 1 ? 's' : ''}
            {filters.status_filter && ` with status "${filters.status_filter}"`}
            {filters.agent_type && ` of type "${formatAgentType(filters.agent_type)}"`}
          </div>
        )}
      </CardContent>
    </Card>
  );
}