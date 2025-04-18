'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useLegalDocumentSummarization } from '@/lib/hooks/useSummarization';
import { SummaryViewer } from './SummaryViewer';
import { SummaryResponse } from '@/lib/api/summarization';
import { SummarizationConfig } from './SummarizationConfig';

/**
 * A component for submitting legal text for summarization
 */
export function TextSummarizer() {
  const [text, setText] = useState('');
  const [maxLength, setMaxLength] = useState(1000);
  const [focusArea, setFocusArea] = useState('');
  const [extractKeyPoints, setExtractKeyPoints] = useState(true);
  const [preserveCitations, setPreserveCitations] = useState(true);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  
  const { mutate, isPending, isError, error } = useLegalDocumentSummarization();
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (text.trim().length < 50) {
      alert('Please enter at least 50 characters of text to summarize.');
      return;
    }
    
    mutate(
      {
        text,
        maxLength,
        focusArea: focusArea || undefined,
        extractKeyPoints,
        preserveCitations,
      },
      {
        onSuccess: (data) => {
          setSummary(data);
          // Scroll to summary results
          setTimeout(() => {
            const summaryElement = document.getElementById('summary-results');
            if (summaryElement) {
              summaryElement.scrollIntoView({ behavior: 'smooth' });
            }
          }, 100);
        },
      }
    );
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Legal Document Summarizer</CardTitle>
          <CardDescription>
            Enter legal text to generate a concise summary with key points and preserved citations
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="legal-text">Legal Document Text</Label>
              <Textarea
                id="legal-text"
                placeholder="Paste your legal document text here (minimum 50 characters)..."
                className="min-h-[200px]"
                value={text}
                onChange={(e) => setText(e.target.value)}
                required
              />
            </div>
            
            {/* Using the standardized SummarizationConfig component */}
            <SummarizationConfig
              inputMethod="text"
              maxLength={maxLength}
              setMaxLength={setMaxLength}
              focusArea={focusArea}
              setFocusArea={setFocusArea}
              extractKeyPoints={extractKeyPoints}
              setExtractKeyPoints={setExtractKeyPoints}
              preserveCitations={preserveCitations}
              setPreserveCitations={setPreserveCitations}
            />
          </CardContent>
          
          <CardFooter>
            <Button type="submit" disabled={isPending || text.trim().length < 50}>
              {isPending ? <><Spinner size="sm" className="mr-2" /> Generating Summary...</> : 'Generate Summary'}
            </Button>
          </CardFooter>
        </form>
      </Card>
      
      {isPending && (
        <div className="flex flex-col items-center justify-center p-8 border rounded-lg bg-muted/50">
          <Spinner size="lg" />
          <p className="mt-4 text-center text-muted-foreground">
            Generating your legal document summary...
            <br />
            <span className="text-sm">This may take a moment for longer documents</span>
          </p>
        </div>
      )}
      
      {isError && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700">Error Generating Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700">
              {error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.'}
            </p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Reload Page
            </Button>
          </CardFooter>
        </Card>
      )}
      
      {summary && !isPending && (
        <div id="summary-results">
          <SummaryViewer summary={summary} originalContent={text} />
        </div>
      )}
    </div>
  );
}
