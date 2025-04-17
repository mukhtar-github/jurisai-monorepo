'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import { useLegalDocumentSummarization } from '@/lib/hooks/useSummarization';
import { SummaryViewer } from './SummaryViewer';
import { SummaryResponse } from '@/lib/api/summarization';

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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="max-length">Maximum Summary Length</Label>
                <Input
                  id="max-length"
                  type="number"
                  min={100}
                  max={5000}
                  value={maxLength}
                  onChange={(e) => setMaxLength(parseInt(e.target.value) || 1000)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="focus-area">Focus Area (Optional)</Label>
                <Input
                  id="focus-area"
                  placeholder="e.g., contract liability, negligence, etc."
                  value={focusArea}
                  onChange={(e) => setFocusArea(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex flex-col space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="extract-key-points"
                  checked={extractKeyPoints}
                  onCheckedChange={(checked) => setExtractKeyPoints(checked as boolean)}
                />
                <Label htmlFor="extract-key-points">Extract key points</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="preserve-citations"
                  checked={preserveCitations}
                  onCheckedChange={(checked) => setPreserveCitations(checked as boolean)}
                />
                <Label htmlFor="preserve-citations">Preserve legal citations</Label>
              </div>
            </div>
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
