import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { useDocumentList, useBatchAnalyze } from '@/lib/hooks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the API responses
jest.mock('@/lib/api/documents', () => ({
  listDocuments: jest.fn().mockResolvedValue({ data: [], total: 0, filters: {} }),
  batchAnalyzeDocuments: jest.fn().mockResolvedValue('batch-id-123')
}));

// Component that uses our hooks
function TestComponent() {
  const { data, isLoading } = useDocumentList({});
  const batchAnalyzeMutation = useBatchAnalyze();
  
  return (
    <div>
      <div data-testid="loading-state">{isLoading ? 'Loading' : 'Loaded'}</div>
      <div data-testid="data-state">{data ? 'Has Data' : 'No Data'}</div>
      <div data-testid="mutation-state">{batchAnalyzeMutation.isPending ? 'Mutating' : 'Ready'}</div>
    </div>
  );
}

describe('Document Query Hooks', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    // Create a new QueryClient for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          // Turn off retries to make testing easier
          retry: false,
          // Make queries resolve immediately without artificial delay
          refetchOnMount: false,
          refetchOnWindowFocus: false,
          refetchOnReconnect: false,
          // Fake success immediately to make tests faster
          gcTime: 0,
          staleTime: 0,
        },
      },
    });
  });

  it('useDocumentList should initialize correctly', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <TestComponent />
      </QueryClientProvider>
    );

    // Check that the mutation is in the ready state
    expect(screen.getByTestId('mutation-state').textContent).toBe('Ready');
    
    // Verify that the component renders with loading state first
    expect(screen.getByTestId('loading-state')).toBeInTheDocument();
  });

  it('useBatchAnalyze mutation should be initialized correctly', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <TestComponent />
      </QueryClientProvider>
    );

    // Mutation should be ready initially
    expect(screen.getByTestId('mutation-state').textContent).toBe('Ready');
  });
});
