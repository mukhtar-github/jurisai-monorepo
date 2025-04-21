'use client';

import React, { useState } from 'react';
import { TextSummarizer, DocumentUploader } from '@/components/summarization';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Upload } from 'lucide-react';
import { SummarizationDebugger } from '@/components/summarization/SummarizationDebugger';

export default function SummarizationPage() {
  const [activeTab, setActiveTab] = useState('text');
  
  return (
    <div className="container mx-auto py-8 px-4 md:px-6 max-w-7xl">
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Legal Document Summarization</h1>
          <p className="text-muted-foreground">
            Generate concise summaries of legal documents with key points and citation preservation
          </p>
        </div>
        
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-lg">About this feature</CardTitle>
            <CardDescription>
              This specialized legal document summarizer is designed for Nigerian legal documents.
              It automatically identifies document sections, preserves citations, and extracts key points.
            </CardDescription>
          </CardHeader>
        </Card>
        
        <Tabs defaultValue="text" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="text" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>Paste Text</span>
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              <span>Upload Document</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="text" className="mt-0">
            <TextSummarizer />
          </TabsContent>
          
          <TabsContent value="upload" className="mt-0">
            <DocumentUploader />
          </TabsContent>
        </Tabs>
        
        <div className="bg-muted/50 rounded-lg p-6 mt-8">
          <h2 className="text-xl font-semibold mb-4">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-white rounded-md shadow-sm">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-primary text-primary-foreground mb-4">
                1
              </div>
              <h3 className="text-lg font-medium mb-2">Document Analysis</h3>
              <p className="text-sm">
                Our AI analyzes the document structure, identifying sections like facts, judgments, and rulings.
              </p>
            </div>
            
            <div className="p-4 bg-white rounded-md shadow-sm">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-primary text-primary-foreground mb-4">
                2
              </div>
              <h3 className="text-lg font-medium mb-2">Citation Preservation</h3>
              <p className="text-sm">
                The system automatically detects and preserves legal citations like [2019] LPELR 12345 and (2020) 15 NWLR 123.
              </p>
            </div>
            
            <div className="p-4 bg-white rounded-md shadow-sm">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-primary text-primary-foreground mb-4">
                3
              </div>
              <h3 className="text-lg font-medium mb-2">Key Point Extraction</h3>
              <p className="text-sm">
                Important legal determinations and rulings are extracted as key points for quick reference.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Debugger component - hidden by default, toggle with Alt+Shift+D */}
      <SummarizationDebugger />
    </div>
  );
}
