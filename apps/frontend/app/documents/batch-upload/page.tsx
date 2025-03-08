'use client';

import { useState, useRef, FormEvent, ChangeEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function BatchUploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [documentType, setDocumentType] = useState('case_law');
  const [jurisdiction, setJurisdiction] = useState('Nigeria');
  const [processWithAI, setProcessWithAI] = useState(true);
  const [autoAnalyze, setAutoAnalyze] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // API URL (would normally be in env variables)
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // Convert FileList to Array
      const fileArray = Array.from(e.target.files);
      setFiles(prevFiles => [...prevFiles, ...fileArray]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };

  const clearFiles = () => {
    setFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (files.length === 0) {
      setErrorMessage('Please select at least one file to upload');
      return;
    }

    if (files.length > 20) {
      setErrorMessage('Maximum 20 files can be uploaded in a batch');
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      
      // Append all files
      files.forEach(file => {
        formData.append('files', file);
      });
      
      // Append other form data
      formData.append('document_type', documentType);
      formData.append('jurisdiction', jurisdiction);
      formData.append('process_with_ai', processWithAI.toString());
      formData.append('auto_analyze', autoAnalyze.toString());

      const response = await fetch(`${API_URL}/documents/batch-upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to upload documents');
      }

      const result = await response.json();
      // Redirect to batch status page
      router.push(`/documents/batch-status/${result.batch_id}`);
    } catch (error) {
      console.error('Upload error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to upload documents');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Batch Document Upload</h1>
        <Link href="/documents" className="btn btn-secondary">
          Back to Documents
        </Link>
      </div>

      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File input */}
          <div className="space-y-2">
            <label className="label font-medium">Select Files</label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              className="w-full p-2 border border-gray-300 rounded-md"
            />
            <p className="text-sm text-gray-500">Maximum 20 files allowed. Supported formats: PDF, DOCX, TXT</p>
          </div>

          {/* Selected files preview */}
          {files.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="font-medium">Selected Files ({files.length})</h3>
                <button 
                  type="button" 
                  onClick={clearFiles}
                  className="text-red-600 text-sm hover:text-red-800"
                >
                  Clear All
                </button>
              </div>
              <div className="max-h-60 overflow-y-auto border rounded-md divide-y">
                {files.map((file, index) => (
                  <div key={index} className="flex justify-between items-center p-2 hover:bg-gray-50">
                    <div className="flex items-center">
                      <span className="text-sm">{file.name}</span>
                      <span className="ml-2 text-xs text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => removeFile(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Document metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="docType">Document Type</label>
              <select
                id="docType"
                className="select w-full"
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                required
              >
                <option value="case_law">Case Law</option>
                <option value="legislation">Legislation</option>
                <option value="regulation">Regulation</option>
                <option value="contract">Contract</option>
                <option value="legal_opinion">Legal Opinion</option>
              </select>
            </div>

            <div>
              <label className="label" htmlFor="jurisdiction">Jurisdiction</label>
              <select
                id="jurisdiction"
                className="select w-full"
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value)}
                required
              >
                <option value="Nigeria">Nigeria</option>
                <option value="Ghana">Ghana</option>
                <option value="Kenya">Kenya</option>
                <option value="South Africa">South Africa</option>
                <option value="International">International</option>
              </select>
            </div>
          </div>

          {/* Processing options */}
          <div className="space-y-3">
            <h3 className="font-medium">Processing Options</h3>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="process-ai"
                checked={processWithAI}
                onChange={(e) => setProcessWithAI(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="process-ai">Process with AI (extract metadata and enhance content)</label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="auto-analyze"
                checked={autoAnalyze}
                onChange={(e) => setAutoAnalyze(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="auto-analyze">Automatically analyze documents (extract entities and key terms)</label>
            </div>
          </div>

          {/* Error message */}
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {errorMessage}
            </div>
          )}

          {/* Submit buttons */}
          <div className="flex justify-end space-x-3">
            <Link href="/documents" className="btn btn-secondary">
              Cancel
            </Link>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isUploading || files.length === 0}
            >
              {isUploading ? 'Uploading...' : 'Upload Batch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
