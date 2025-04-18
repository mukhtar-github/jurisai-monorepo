'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { FormDescription } from '@/components/ui/form';

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

export type InputMethod = 'text' | 'upload';

interface SummarizationConfigProps {
  inputMethod: InputMethod;
  maxLength: number;
  setMaxLength: (value: number) => void;
  focusArea: string;
  setFocusArea: (value: string) => void;
  extractKeyPoints: boolean;
  setExtractKeyPoints: (value: boolean) => void;
  preserveCitations: boolean;
  setPreserveCitations: (value: boolean) => void;
  documentTitle?: string;
  setDocumentTitle?: (value: string) => void;
  documentType?: string;
  setDocumentType?: (value: string) => void;
  jurisdiction?: string;
  setJurisdiction?: (value: string) => void;
}

export function SummarizationConfig({
  inputMethod,
  maxLength,
  setMaxLength,
  focusArea,
  setFocusArea,
  extractKeyPoints,
  setExtractKeyPoints,
  preserveCitations,
  setPreserveCitations,
  documentTitle,
  setDocumentTitle,
  documentType,
  setDocumentType,
  jurisdiction,
  setJurisdiction
}: SummarizationConfigProps) {
  return (
    <div className="space-y-6">
      {/* Always show summarization parameters for both input methods */}
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
          <p className="text-sm text-muted-foreground">
            Maximum character length for the generated summary
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="focus-area">Focus Area (Optional)</Label>
          <Input
            id="focus-area"
            placeholder="e.g., contract liability, negligence, etc."
            value={focusArea}
            onChange={(e) => setFocusArea(e.target.value)}
          />
          <p className="text-sm text-muted-foreground">
            Area of law to emphasize in the summary
          </p>
        </div>
      </div>
      
      {/* Show document metadata fields depending on input method */}
      {inputMethod === 'upload' && setDocumentTitle && setDocumentType && setJurisdiction && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="document-title">Document Title</Label>
              <Input
                id="document-title"
                placeholder="Enter document title"
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Will be auto-filled from filename if left empty
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="document-type">Document Type</Label>
              <Select 
                value={documentType} 
                onValueChange={setDocumentType}
              >
                <SelectTrigger id="document-type">
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Type of legal document being analyzed
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="jurisdiction">Jurisdiction</Label>
            <Select 
              value={jurisdiction} 
              onValueChange={setJurisdiction}
            >
              <SelectTrigger id="jurisdiction">
                <SelectValue placeholder="Select jurisdiction" />
              </SelectTrigger>
              <SelectContent>
                {JURISDICTIONS.map((j) => (
                  <SelectItem key={j.value} value={j.value}>
                    {j.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Jurisdiction of the legal document
            </p>
          </div>
        </div>
      )}
      
      {/* Processing options for both input methods */}
      <div className="space-y-3">
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
    </div>
  );
}
