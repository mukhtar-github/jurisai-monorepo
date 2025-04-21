'use client';

import { useState } from 'react';
import { useGenerateDocumentSummary } from '@/lib/hooks/useRAG';
import Markdown from 'react-markdown';

interface DocumentSummarizerProps {
  documentId: number;
  documentTitle?: string;
}

const DocumentSummarizer = ({
  documentId,
  documentTitle = 'Document',
}: DocumentSummarizerProps) => {
  const [options, setOptions] = useState({
    maxLength: 500,
    focusAreas: [] as string[],
    customFocusArea: '',
  });

  const [summaryVisible, setSummaryVisible] = useState(false);

  const summarizeMutation = useGenerateDocumentSummary();

  const handleGenerateSummary = async () => {
    // Prepare focus areas - combine predefined and custom areas
    const focusAreas = [
      ...options.focusAreas,
      ...(options.customFocusArea ? [options.customFocusArea] : []),
    ];

    try {
      await summarizeMutation.mutateAsync({
        documentId,
        options: {
          max_length: options.maxLength,
          focus_areas: focusAreas.length > 0 ? focusAreas : undefined,
        },
      });
      setSummaryVisible(true);
    } catch (error) {
      console.error('Error generating summary:', error);
    }
  };

  const handleFocusAreaToggle = (area: string) => {
    setOptions((prev) => {
      const currentAreas = prev.focusAreas;
      const newAreas = currentAreas.includes(area)
        ? currentAreas.filter((a) => a !== area)
        : [...currentAreas, area];

      return { ...prev, focusAreas: newAreas };
    });
  };

  return (
    <div className="rounded-md border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
        <h3 className="text-lg font-medium text-gray-900">Document Summary</h3>
      </div>

      <div className="p-4">
        <div className="mb-4">
          <h4 className="mb-2 text-sm font-medium text-gray-700">Summary Options</h4>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <label htmlFor="max-length" className="block text-xs font-medium text-gray-700">
                Maximum Length: {options.maxLength} words
              </label>
              <input
                id="max-length"
                type="range"
                min="100"
                max="1000"
                step="50"
                value={options.maxLength}
                onChange={(e) =>
                  setOptions((prev) => ({
                    ...prev,
                    maxLength: parseInt(e.target.value),
                  }))
                }
                className="mt-1 w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700">
                Focus Areas (optional)
              </label>
              <div className="mt-1 space-y-1">
                {['Legal arguments', 'Factual background', 'Key conclusions', 'Reasoning'].map(
                  (area) => (
                    <div key={area} className="flex items-center">
                      <input
                        id={`focus-${area}`}
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        checked={options.focusAreas.includes(area)}
                        onChange={() => handleFocusAreaToggle(area)}
                      />
                      <label htmlFor={`focus-${area}`} className="ml-2 text-sm text-gray-700">
                        {area}
                      </label>
                    </div>
                  )
                )}

                <div className="mt-2">
                  <input
                    type="text"
                    placeholder="Custom focus area"
                    value={options.customFocusArea}
                    onChange={(e) =>
                      setOptions((prev) => ({
                        ...prev,
                        customFocusArea: e.target.value,
                      }))
                    }
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={handleGenerateSummary}
            disabled={summarizeMutation.isPending}
            className="inline-flex items-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {summarizeMutation.isPending ? (
              <>
                <svg
                  className="-ml-1 mr-2 h-4 w-4 animate-spin text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  ></path>
                </svg>
                Generating...
              </>
            ) : (
              'Generate Summary'
            )}
          </button>

          {summarizeMutation.isSuccess && (
            <div className="text-sm text-gray-500">
              Generated in {summarizeMutation.data?.processing_time.toFixed(2)}s
            </div>
          )}
        </div>

        {/* Display the summary */}
        {summarizeMutation.isSuccess && summaryVisible && (
          <div className="mt-6">
            <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
              <h4 className="mb-3 text-sm font-medium text-gray-700">Summary of {documentTitle}</h4>
              <div className="prose max-w-none">
                <Markdown>{summarizeMutation.data?.summary || ''}</Markdown>
              </div>
            </div>
          </div>
        )}

        {/* Error message */}
        {summarizeMutation.isError && (
          <div className="mt-4 rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error generating summary</h3>
                <p className="mt-2 text-sm text-red-700">
                  There was an error generating the document summary. Please try again or contact
                  support if the issue persists.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentSummarizer;
