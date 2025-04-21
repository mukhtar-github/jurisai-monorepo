'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { SummaryResponse } from '@/lib/api/summarization';

interface SummaryViewerProps {
  summary: SummaryResponse;
  originalContent?: string;
  isLoading?: boolean;
}

/**
 * A component for displaying document summaries with key points and citations
 */
export function SummaryViewer({ summary, originalContent, isLoading = false }: SummaryViewerProps) {
  const [activeTab, setActiveTab] = useState<string>("summary");
  
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle><Skeleton className="h-8 w-3/4" /></CardTitle>
          <CardDescription><Skeleton className="h-4 w-1/2" /></CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>{summary.title || 'Document Summary'}</CardTitle>
          <CardDescription className="mt-1">
            {summary.ai_used ? (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 mr-2">
                AI-Generated
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 mr-2">
                Extracted
              </Badge>
            )}
            <span className="text-sm text-muted-foreground">
              {summary.original_length} characters summarized to {summary.summary_length}
            </span>
          </CardDescription>
        </div>
        
        {originalContent && (
          <div className="flex space-x-2">
            <Button
              variant={activeTab === "summary" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("summary")}
            >
              Summary
            </Button>
            <Button
              variant={activeTab === "original" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("original")}
            >
              Original
            </Button>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 w-48 mb-4">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            {originalContent && <TabsTrigger value="original">Original</TabsTrigger>}
          </TabsList>
          <TabsContent value="summary" className="mt-0">
            <div className="space-y-6">
              {summary.key_points.length > 0 && (
                <div className="bg-muted rounded-md p-4">
                  <h3 className="font-medium text-lg mb-3">Key Points</h3>
                  <ul className="list-disc pl-5 space-y-2">
                    {summary.key_points.map((point, index) => (
                      <li key={index} className="text-sm">
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="prose max-w-none">
                <h3 className="font-medium text-lg mb-3">Summary</h3>
                {summary.summary.split('\n\n').map((paragraph, index) => (
                  <p key={index} className="mb-4">
                    {paragraph}
                  </p>
                ))}
              </div>
              
              {summary.citations.length > 0 && (
                <div className="border-t pt-4 mt-4">
                  <h3 className="font-medium text-lg mb-3">Relevant Citations</h3>
                  <ul className="list-none space-y-2">
                    {summary.citations.map((citation, index) => (
                      <li key={index} className="text-sm font-mono bg-muted inline-block mr-2 mb-2 px-2 py-1 rounded">
                        {citation}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </TabsContent>
          
          {originalContent && (
            <TabsContent value="original" className="mt-0">
              <div className="bg-muted rounded-md p-4 overflow-auto max-h-[600px]">
                <pre className="whitespace-pre-wrap font-mono text-sm">
                  {originalContent}
                </pre>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}
