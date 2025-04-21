/**
 * Root provider component that combines all providers
 */
'use client';

import { ReactNode } from 'react';
import QueryProvider from './QueryProvider';
import { DocumentProvider } from '../context/DocumentContext';
import { AuthProvider } from '../context/AuthContext';
import { NotificationProvider } from '../context/NotificationContext';

interface RootProviderProps {
  children: ReactNode;
}

export default function RootProvider({ children }: RootProviderProps) {
  return (
    <QueryProvider>
      <AuthProvider>
        <NotificationProvider>
          <DocumentProvider>
            {children}
          </DocumentProvider>
        </NotificationProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
