'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Upload, File } from 'lucide-react';
import { useSummarizeDocument } from '@/lib/hooks/useSummarization';
import { SummaryViewer } from './SummaryViewer';
import { SummaryResponse } from '@/lib/api/summarization';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { SummarizationConfig } from './SummarizationConfig';

// Document types
const DOCUMENT_TYPES = [
  { value: 'case_law', label: 'Case Law' },
  { value: 'statute', label: 'Statute' },
  { value: 'contract', label: 'Contract' },
  { value: 'legal_opinion', label: 'Legal Opinion' },
  { value: 'other', label: 'Other' }
];

// Nigerian jurisdictions
const JURISDICTIONS = [
  { value: 'federal', label: 'Federal' },
  { value: 'state', label: 'State' },
  { value: 'local', label: 'Local' }
];

interface FormValues {
  title: string;
  file: FileList;
  document_type: string;
  jurisdiction: string;
}

export function DocumentUploader() {
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  // Add summarization config state
  const [maxLength, setMaxLength] = useState(1000);
  const [focusArea, setFocusArea] = useState('');
  const [extractKeyPoints, setExtractKeyPoints] = useState(true);
  const [preserveCitations, setPreserveCitations] = useState(true);
  
  const form = useForm<FormValues>({
    defaultValues: {
      title: '',
      document_type: 'case_law',
      jurisdiction: 'federal'
    }
  });
  
  const { mutate: summarizeDocument, isPending, isError, error } = useSummarizeDocument();
  
  const onSubmit = async (data: FormValues) => {
    if (data.file && data.file.length > 0) {
      const file = data.file[0];
      
      // Read the file content to display in the original text section
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setFileContent(e.target.result as string);
        }
      };
      reader.readAsText(file);
      
      // Upload and summarize the document
      summarizeDocument(
        {
          document_id: 0, // Will be assigned by the backend after upload
          file: file,
          title: data.title || file.name,
          document_type: data.document_type,
          jurisdiction: data.jurisdiction,
          maxLength: maxLength,
          focusArea: focusArea || undefined,
          extractKeyPoints: extractKeyPoints,
          preserveCitations: preserveCitations
        },
        {
          onSuccess: (data) => {
            setSummary(data);
            // Scroll to summary results
            setTimeout(() => {
              const summaryElement = document.getElementById('document-summary-results');
              if (summaryElement) {
                summaryElement.scrollIntoView({ behavior: 'smooth' });
              }
            }, 100);
          }
        }
      );
    }
  };
  
  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Upload Legal Document</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="file"
                render={({ field: { onChange, value, ...rest } }) => (
                  <FormItem>
                    <FormLabel>Document File</FormLabel>
                    <FormControl>
                      <div className="grid w-full items-center gap-1.5">
                        <label 
                          htmlFor="document-file" 
                          className="group cursor-pointer relative border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 flex flex-col items-center justify-center hover:border-primary/50 transition-colors"
                        >
                          <div className="flex flex-col items-center justify-center gap-2 text-center">
                            <Upload className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors" />
                            <p className="font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                              Drag and drop your file here or click to browse
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Supported formats: .pdf, .docx, .txt (Max 10MB)
                            </p>
                            {form.watch('file') && form.watch('file').length > 0 && (
                              <div className="flex items-center gap-2 mt-2 bg-primary/10 px-3 py-1 rounded-full">
                                <File className="h-4 w-4" />
                                <span className="text-sm font-medium">{form.watch('file')[0]?.name}</span>
                              </div>
                            )}
                          </div>
                          <Input
                            id="document-file"
                            type="file"
                            className="hidden"
                            accept=".pdf,.doc,.docx,.txt"
                            onChange={(e) => {
                              onChange(e.target.files);
                              if (e.target.files?.[0]) {
                                form.setValue('title', e.target.files[0].name.replace(/\.[^/.]+$/, ''));
                              }
                            }}
                            {...rest}
                          />
                        </label>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Upload the legal document you want to summarize.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Using the standardized SummarizationConfig component */}
              <SummarizationConfig
                inputMethod="upload"
                maxLength={maxLength}
                setMaxLength={setMaxLength}
                focusArea={focusArea}
                setFocusArea={setFocusArea}
                extractKeyPoints={extractKeyPoints}
                setExtractKeyPoints={setExtractKeyPoints}
                preserveCitations={preserveCitations}
                setPreserveCitations={setPreserveCitations}
                documentTitle={form.watch('title')}
                setDocumentTitle={(value) => form.setValue('title', value)}
                documentType={form.watch('document_type')}
                setDocumentType={(value) => form.setValue('document_type', value)}
                jurisdiction={form.watch('jurisdiction')}
                setJurisdiction={(value) => form.setValue('jurisdiction', value)}
              />
              
              <Button 
                type="submit" 
                className="w-full md:w-auto" 
                disabled={!form.watch('file')?.length || isPending}
              >
                {isPending ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Processing...
                  </>
                ) : (
                  <>Upload & Summarize</>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      {isPending && (
        <div className="flex flex-col items-center justify-center p-8 border rounded-lg bg-muted/50">
          <Spinner size="lg" />
          <p className="mt-4 text-center text-muted-foreground">
            Analyzing and summarizing your document...
            <br />
            <span className="text-sm">This may take a moment for longer documents</span>
          </p>
        </div>
      )}
      
      {isError && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700">Error Processing Document</CardTitle>
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
        <div id="document-summary-results">
          <SummaryViewer summary={summary} originalContent={fileContent} />
        </div>
      )}
    </div>
  );
}
