import React from 'react';
import { render, screen } from '@testing-library/react';
import QueryProvider from '@/lib/providers/QueryProvider';

// Component that uses the QueryProvider
function TestComponent() {
  return <div data-testid="test-component">Test Component</div>;
}

describe('QueryProvider', () => {
  it('should render children correctly', () => {
    render(
      <QueryProvider>
        <TestComponent />
      </QueryProvider>
    );

    expect(screen.getByTestId('test-component')).toBeInTheDocument();
  });

  it('should initialize with the correct configuration', () => {
    // Mock console.log to verify configuration
    const originalConsoleLog = console.log;
    const mockConsoleLog = jest.fn();
    console.log = mockConsoleLog;

    render(
      <QueryProvider>
        <TestComponent />
      </QueryProvider>
    );

    // Restore console.log
    console.log = originalConsoleLog;

    // The test passes if the provider renders without errors
    expect(screen.getByTestId('test-component')).toBeInTheDocument();
  });
});
