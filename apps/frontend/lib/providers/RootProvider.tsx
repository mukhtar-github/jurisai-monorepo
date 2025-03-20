/**
 * Root provider component that combines all providers
 */
'use client';

import { ReactNode } from 'react';
import QueryProvider from './QueryProvider';
import { DocumentProvider } from '../context/DocumentContext';

interface RootProviderProps {
  children: ReactNode;
}

export default function RootProvider({ children }: RootProviderProps) {
  return (
    <QueryProvider>
      <DocumentProvider>
        {children}
      </DocumentProvider>
    </QueryProvider>
  );
}
