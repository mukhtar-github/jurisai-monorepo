/**
 * Document Analysis Button with Agent Integration
 * Example component showing how to use the agent task hooks
 */
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Loader2, 
  Bot, 
  FileText,
  TrendingUp
} from 'lucide-react';

import { 
  useDocumentAnalysisWorkflow,
  useAgentsStatus,
  useFeatureFlag 
} from '@/lib/hooks/useAgentTasks';

interface DocumentAnalysisButtonProps {
  documentId: number;
  documentTitle?: string;
  className?: string;
}

export function DocumentAnalysisButton({ 
  documentId, 
  documentTitle = 'Document',
  className 
}: DocumentAnalysisButtonProps) {
  const [enableAgents, setEnableAgents] = useState(true);
  const [analysisParams, setAnalysisParams] = useState({
    max_summary_length: 500,
    preserve_citations: true,
  });

  // Use the workflow hook for complete analysis management
  const workflow = useDocumentAnalysisWorkflow(documentId);
  
  // Check agent system status
  const { data: agentsStatus } = useAgentsStatus();
  const { data: documentAnalysisFlag } = useFeatureFlag('enable_document_analysis_agent');

  const handleStartAnalysis = () => {
    workflow.startAnalysis({
      documentId,
      request: { parameters: analysisParams },
      enableAgents,
    });
  };

  const getStatusColor = () => {
    if (workflow.isAnalysisFailed) return 'destructive';
    if (workflow.isAnalysisComplete) return 'default';
    if (workflow.isProcessing) return 'secondary';
    return 'outline';
  };

  const getStatusIcon = () => {
    if (workflow.isAnalysisFailed) return <XCircle className="w-4 h-4" />;
    if (workflow.isAnalysisComplete) return <CheckCircle className="w-4 h-4" />;
    if (workflow.isProcessing) return <Loader2 className="w-4 h-4 animate-spin" />;
    return <Clock className="w-4 h-4" />;
  };

  const isAgentAvailable = agentsStatus?.data?.document_analyzer?.enabled && 
                          documentAnalysisFlag?.enabled !== false;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="w-5 h-5" />
          AI Document Analysis
          {isAgentAvailable && (
            <Badge variant="secondary" className="ml-2">
              AI Enhanced
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Analyze "{documentTitle}" with {isAgentAvailable ? 'AI-powered' : 'standard'} analysis
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Analysis Controls */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="enable-agents"
              checked={enableAgents}
              onChange={(e) => setEnableAgents(e.target.checked)}
              disabled={!isAgentAvailable}
              className="rounded"
            />
            <label htmlFor="enable-agents" className="text-sm">
              Use AI Agent {!isAgentAvailable && '(Not Available)'}
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <label htmlFor="summary-length" className="text-sm">
              Summary Length:
            </label>
            <select
              id="summary-length"
              value={analysisParams.max_summary_length}
              onChange={(e) => setAnalysisParams(prev => ({
                ...prev,
                max_summary_length: parseInt(e.target.value)
              }))}
              className="rounded border px-2 py-1 text-sm"
            >
              <option value={200}>Short (200 words)</option>
              <option value={500}>Medium (500 words)</option>
              <option value={1000}>Long (1000 words)</option>
            </select>
          </div>
        </div>

        {/* Analysis Button */}
        <Button
          onClick={handleStartAnalysis}
          disabled={workflow.isStarting || workflow.isProcessing}
          className="w-full"
        >
          {workflow.isStarting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <FileText className="w-4 h-4 mr-2" />
          )}
          {workflow.isProcessing ? 'Analyzing...' : 'Start Analysis'}
        </Button>

        {/* Status Display */}
        {workflow.taskStatus && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status:</span>
              <Badge variant={getStatusColor()} className="flex items-center gap-1">
                {getStatusIcon()}
                {workflow.taskStatus.status}
              </Badge>
            </div>

            {workflow.isProcessing && (
              <div className="space-y-1">
                <Progress value={undefined} className="w-full" />
                <p className="text-xs text-muted-foreground text-center">
                  AI agent is analyzing your document...
                </p>
              </div>
            )}

            {workflow.processingTime && (
              <div className="text-xs text-muted-foreground">
                Processing time: {(workflow.processingTime / 1000).toFixed(2)}s
              </div>
            )}
          </div>
        )}

        {/* Results Display */}
        {workflow.isAnalysisComplete && workflow.results && (
          <div className="space-y-3 border-t pt-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Analysis Results
              </h4>
              {workflow.confidence && (
                <Badge variant="outline">
                  {Math.round(workflow.confidence * 100)}% confidence
                </Badge>
              )}
            </div>

            {workflow.results.summary && (
              <div className="space-y-1">
                <h5 className="text-sm font-medium">Summary:</h5>
                <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
                  {workflow.results.summary}
                </p>
              </div>
            )}

            {workflow.results.document_type && (
              <div className="space-y-1">
                <h5 className="text-sm font-medium">Document Type:</h5>
                <Badge variant="secondary">{workflow.results.document_type}</Badge>
              </div>
            )}

            {workflow.results.entities && (
              <div className="space-y-1">
                <h5 className="text-sm font-medium">Key Entities:</h5>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(workflow.results.entities).map(([type, entities]) => (
                    entities && Array.isArray(entities) && entities.length > 0 && (
                      <Badge key={type} variant="outline" className="text-xs">
                        {type}: {entities.length}
                      </Badge>
                    )
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {workflow.isAnalysisFailed && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              Analysis failed: {workflow.taskError?.message || 'Unknown error'}
            </AlertDescription>
          </Alert>
        )}

        {/* Analysis Error */}
        {workflow.analysisError && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to start analysis: {workflow.analysisError.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Reset Button */}
        {(workflow.isAnalysisComplete || workflow.isAnalysisFailed) && (
          <Button
            variant="outline"
            onClick={workflow.reset}
            className="w-full"
          >
            Start New Analysis
          </Button>
        )}
      </CardContent>
    </Card>
  );
}