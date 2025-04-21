'use client';

import { useState } from 'react';
import { useExtractDocumentInformation } from '@/lib/hooks/useRAG';

// Define types for extraction results
interface Entity {
  text: string;
  type: string;
  metadata?: Record<string, string>;
}

interface DateInfo {
  text: string;
  type?: string;
  normalized?: string;
  context?: string;
}

interface Citation {
  text: string;
  type?: string;
  reference?: string;
}

interface Definition {
  term: string;
  definition: string;
  context?: string;
}

interface ExtractionResult {
  entities?: Entity[];
  dates?: DateInfo[];
  citations?: Citation[];
  definitions?: Definition[];
  custom?: string;
  processing_time: number;
}

interface DocumentInformationExtractorProps {
  documentId: number;
  documentTitle?: string;
}

const DocumentInformationExtractor = ({
  documentId,
  documentTitle = 'Document',
}: DocumentInformationExtractorProps) => {
  const [extractionTypes, setExtractionTypes] = useState<{
    entities: boolean;
    dates: boolean;
    citations: boolean;
    definitions: boolean;
    custom: boolean;
  }>({
    entities: true,
    dates: true,
    citations: true,
    definitions: true,
    custom: false,
  });

  const [customExtraction, setCustomExtraction] = useState('');
  const [resultsVisible, setResultsVisible] = useState(false);

  const extractMutation = useExtractDocumentInformation<ExtractionResult>();

  const handleExtractInformation = async () => {
    const selectedTypes = (Object.entries(extractionTypes)
      .filter(([_, value]) => value)
      .map(([key]) => key) as ('entities' | 'dates' | 'citations' | 'definitions' | 'custom')[]);

    if (selectedTypes.length === 0) return;

    try {
      await extractMutation.mutateAsync({
        documentId,
        extractionTypes: selectedTypes,
      });
      setResultsVisible(true);
    } catch (error) {
      console.error('Error extracting information:', error);
    }
  };

  const handleExtractionTypeToggle = (type: keyof typeof extractionTypes) => {
    setExtractionTypes((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  // Format the extraction results for display
  const renderExtractionResults = () => {
    if (!extractMutation.data) return null;

    return (
      <div className="space-y-6">
        {/* Entities */}
        {extractMutation.data.entities && extractMutation.data.entities.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-medium text-gray-700">Entities</h4>
            <div className="rounded-md border border-gray-200 bg-white p-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {extractMutation.data.entities.map((entity, index) => (
                  <div
                    key={`entity-${index}`}
                    className="rounded-md border border-gray-100 bg-gray-50 p-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">{entity.text}</span>
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                        {entity.type}
                      </span>
                    </div>
                    {entity.metadata && (
                      <div className="mt-1 text-xs text-gray-500">
                        {Object.entries(entity.metadata).map(([key, value]) => (
                          <div key={key}>
                            <span className="font-medium">{key}:</span> {value}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Dates */}
        {extractMutation.data.dates && extractMutation.data.dates.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-medium text-gray-700">Dates</h4>
            <div className="rounded-md border border-gray-200 bg-white p-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {extractMutation.data.dates.map((date, index) => (
                  <div
                    key={`date-${index}`}
                    className="rounded-md border border-gray-100 bg-gray-50 p-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">{date.text}</span>
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                        {date.type || 'Date'}
                      </span>
                    </div>
                    {date.normalized && (
                      <div className="mt-1 text-xs text-gray-500">
                        Normalized: {date.normalized}
                      </div>
                    )}
                    {date.context && (
                      <div className="mt-1 text-xs text-gray-500">
                        Context: {date.context.length > 60 ? `${date.context.substring(0, 60)}...` : date.context}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Citations */}
        {extractMutation.data.citations && extractMutation.data.citations.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-medium text-gray-700">Citations</h4>
            <div className="rounded-md border border-gray-200 bg-white p-4">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                    >
                      Citation
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                    >
                      Type
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                    >
                      Reference
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {extractMutation.data.citations.map((citation, index) => (
                    <tr key={`citation-${index}`}>
                      <td className="whitespace-normal px-3 py-2 text-sm text-gray-900">
                        {citation.text}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-500">
                        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
                          {citation.type || 'Citation'}
                        </span>
                      </td>
                      <td className="whitespace-normal px-3 py-2 text-sm text-gray-500">
                        {citation.reference || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Definitions */}
        {extractMutation.data.definitions && extractMutation.data.definitions.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-medium text-gray-700">Definitions</h4>
            <div className="rounded-md border border-gray-200 bg-white p-4">
              <dl className="space-y-3">
                {extractMutation.data.definitions.map((definition, index) => (
                  <div
                    key={`definition-${index}`}
                    className="rounded-md border border-gray-100 bg-gray-50 p-3"
                  >
                    <dt className="text-sm font-medium text-gray-900">{definition.term}</dt>
                    <dd className="mt-1 text-sm text-gray-700">{definition.definition}</dd>
                    {definition.context && (
                      <div className="mt-2 text-xs italic text-gray-500">
                        Context: {definition.context}
                      </div>
                    )}
                  </div>
                ))}
              </dl>
            </div>
          </div>
        )}

        {/* Custom extraction */}
        {extractMutation.data.custom && (
          <div>
            <h4 className="mb-2 text-sm font-medium text-gray-700">Custom Extraction</h4>
            <div className="rounded-md border border-gray-200 bg-white p-4">
              <div className="whitespace-pre-wrap text-sm text-gray-700">
                {extractMutation.data.custom}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="rounded-md border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
        <h3 className="text-lg font-medium text-gray-900">Extract Information</h3>
      </div>

      <div className="p-4">
        <div className="mb-4">
          <h4 className="mb-2 text-sm font-medium text-gray-700">Extraction Options</h4>
          <div className="space-y-2">
            <div className="flex items-center">
              <input
                id="extract-entities"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                checked={extractionTypes.entities}
                onChange={() => handleExtractionTypeToggle('entities')}
              />
              <label htmlFor="extract-entities" className="ml-2 text-sm text-gray-700">
                Named Entities (people, organizations, locations)
              </label>
            </div>

            <div className="flex items-center">
              <input
                id="extract-dates"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                checked={extractionTypes.dates}
                onChange={() => handleExtractionTypeToggle('dates')}
              />
              <label htmlFor="extract-dates" className="ml-2 text-sm text-gray-700">
                Dates and Timeframes
              </label>
            </div>

            <div className="flex items-center">
              <input
                id="extract-citations"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                checked={extractionTypes.citations}
                onChange={() => handleExtractionTypeToggle('citations')}
              />
              <label htmlFor="extract-citations" className="ml-2 text-sm text-gray-700">
                Legal Citations
              </label>
            </div>

            <div className="flex items-center">
              <input
                id="extract-definitions"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                checked={extractionTypes.definitions}
                onChange={() => handleExtractionTypeToggle('definitions')}
              />
              <label htmlFor="extract-definitions" className="ml-2 text-sm text-gray-700">
                Definitions and Terms
              </label>
            </div>

            <div className="flex items-center">
              <input
                id="extract-custom"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                checked={extractionTypes.custom}
                onChange={() => handleExtractionTypeToggle('custom')}
              />
              <label htmlFor="extract-custom" className="ml-2 text-sm text-gray-700">
                Custom Extraction
              </label>
            </div>

            {/* Custom extraction input */}
            {extractionTypes.custom && (
              <div className="mt-2">
                <label
                  htmlFor="custom-extraction"
                  className="block text-xs font-medium text-gray-700"
                >
                  Custom Extraction Instructions
                </label>
                <textarea
                  id="custom-extraction"
                  rows={2}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500"
                  value={customExtraction}
                  onChange={(e) => setCustomExtraction(e.target.value)}
                  placeholder="E.g., Extract all financial amounts mentioned in the document"
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={handleExtractInformation}
            disabled={extractMutation.isPending || Object.values(extractionTypes).every((v) => !v)}
            className="inline-flex items-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {extractMutation.isPending ? (
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
                Extracting...
              </>
            ) : (
              'Extract Information'
            )}
          </button>

          {extractMutation.isSuccess && (
            <div className="text-sm text-gray-500">
              Processed in {extractMutation.data?.processing_time.toFixed(2)}s
            </div>
          )}
        </div>

        {/* Display the extraction results */}
        {extractMutation.isSuccess && resultsVisible && (
          <div className="mt-6">
            <h4 className="mb-3 text-sm font-medium text-gray-700">
              Extracted Information from {documentTitle}
            </h4>
            {renderExtractionResults()}
          </div>
        )}

        {/* Error message */}
        {extractMutation.isError && (
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
                <h3 className="text-sm font-medium text-red-800">Error extracting information</h3>
                <p className="mt-2 text-sm text-red-700">
                  There was an error processing your extraction request. Please try again or contact
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

export default DocumentInformationExtractor;
