/**
 * Enhanced Document Analysis Component
 * Simplified interface for agent-powered document analysis
 * Alternative to DocumentAnalysisButton with streamlined UX
 */
'use client';

import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Spinner } from '../ui/spinner';
import { useAgentDocumentAnalysis, useAgentTaskStatus } from '../../lib/hooks/useAgentTasks';

interface Props {
  documentId: string;
  onAnalysisComplete: (result: any) => void;
}

export const AgentEnhancedAnalysis: React.FC<Props> = ({ 
  documentId, 
  onAnalysisComplete 
}) => {
  const [taskId, setTaskId] = useState<string | null>(null);
  const analysisMutation = useAgentDocumentAnalysis();
  const { data: taskStatus } = useAgentTaskStatus(taskId);

  const handleStartAnalysis = async (useAgents: boolean) => {
    try {
      const result = await analysisMutation.mutateAsync({
        documentId: parseInt(documentId),
        enableAgents: useAgents
      });
      
      if (result.agent_enabled && result.task_id) {
        setTaskId(result.task_id);
      } else {
        onAnalysisComplete(result);
      }
    } catch (error) {
      console.error('Analysis failed:', error);
    }
  };

  // Handle completed agent task
  React.useEffect(() => {
    if (taskStatus?.status === 'completed') {
      onAnalysisComplete(taskStatus.result);
      setTaskId(null);
    }
  }, [taskStatus, onAnalysisComplete]);

  const isProcessing = taskId && taskStatus?.status === 'processing';

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button 
          onClick={() => handleStartAnalysis(false)}
          disabled={analysisMutation.isPending || isProcessing}
          variant="outline"
        >
          Standard Analysis
        </Button>
        
        <Button 
          onClick={() => handleStartAnalysis(true)}
          disabled={analysisMutation.isPending || isProcessing}
        >
          {isProcessing && <Spinner className="mr-2 h-4 w-4" />}
          AI Agent Analysis
          <Badge variant="secondary" className="ml-2">Beta</Badge>
        </Button>
      </div>

      {isProcessing && (
        <div className="p-4 border rounded-lg bg-blue-50">
          <div className="flex items-center gap-2">
            <Spinner className="h-4 w-4" />
            <span>AI agent is analyzing your document...</span>
          </div>
          {taskStatus?.confidence && (
            <div className="mt-2 text-sm text-gray-600">
              Confidence: {Math.round(taskStatus.confidence * 100)}%
            </div>
          )}
        </div>
      )}
    </div>
  );
};