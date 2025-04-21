/**
 * React Query provider for global state management with enhanced features:
 * - Query persistence for offline support
 * - Optimized query invalidation
 * - Improved stale-while-revalidate pattern
 */
'use client';

import { 
  QueryClient, 
  QueryClientProvider,
  MutationCache,
  onlineManager,
  QueryCache,
  focusManager
} from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, ReactNode, useEffect } from 'react';

// Typeguard for browser environment
const isBrowser = typeof window !== 'undefined';

export default function QueryProvider({ children }: { children: ReactNode }) {
  // State to track online status
  const [isOnline, setIsOnline] = useState(true);
  
  // Create a client that persists for the lifetime of the component
  const [queryClient] = useState(() => {
    const client = new QueryClient({
      defaultOptions: {
        queries: {
          // Configure general query behavior
          retry: 3,
          staleTime: 5 * 60 * 1000, // 5 minutes
          gcTime: 1000 * 60 * 60 * 24, // 24 hours (replaced cacheTime)
          refetchOnWindowFocus: true,
          refetchOnReconnect: true,
          refetchOnMount: false,
          // Use placeholderData for SWR pattern (instead of keepPreviousData which is deprecated)
          placeholderData: (previousData: unknown) => previousData,
        },
      },
      // Configure global query error handling
      queryCache: new QueryCache({
        onError: (error, query) => {
          // Only log query errors that weren't manually handled
          if (query.state.data === undefined) {
            console.error(`Query error in ${query.queryKey.toString()}: `, error);
          }
        },
      }),
      // Configure global mutation error handling
      mutationCache: new MutationCache({
        onError: (error, _variables, _context, mutation) => {
          console.error(
            `Mutation error (${mutation.options.mutationKey?.join('/') || 'unknown'})`,
            error
          );
        },
        onSuccess: (_data, _variables, _context, mutation) => {
          // We can optionally log successful mutations
          // console.log(`Mutation successful: ${mutation.options.mutationKey?.join('/') || 'unknown'}`);
        },
      }),
    });
    
    // Setup persistence only in browser environment
    if (isBrowser) {
      // Implement simple local storage persistence
      // Note: We've removed the dependency on @tanstack/react-query-persist-client
      // to simplify the implementation and avoid compatibility issues
      try {
        // Load any cached data on startup
        const cachedData = localStorage.getItem('JURISAI_QUERY_CACHE');
        if (cachedData) {
          client.setQueryData(['queryData'], JSON.parse(cachedData));
        }

        // Subscribe to cache changes to persist them
        client.getQueryCache().subscribe(() => {
          // Throttle saving to avoid excessive writes
          const saveTimeout = setTimeout(() => {
            const state = client.getQueryCache().getAll()
              .filter(query => query.state.status === 'success')
              .reduce<Record<string, unknown>>((acc, query) => {
                if (query.queryKey[0] === 'queryData') return acc;
                acc[query.queryKey.join('/')] = query.state.data;
                return acc;
              }, {});
            
            // Only save non-empty state
            if (Object.keys(state).length > 0) {
              localStorage.setItem('JURISAI_QUERY_CACHE', JSON.stringify(state));
            }
          }, 1000);
          
          return () => clearTimeout(saveTimeout);
        });
      } catch (e) {
        console.error('Failed to set up query persistence:', e);
      }
    }
    
    return client;
  });
  
  // Configure online status monitoring
  useEffect(() => {
    // Skip in non-browser environments
    if (!isBrowser) return;
    
    // Handle focus management for refetching on tab focus
    focusManager.setEventListener(handleFocus => {
      // Create a proper event handler function
      const visibilityChangeHandler = () => {
        // Call handleFocus with the correct parameter based on document visibility
        handleFocus(document.visibilityState === 'visible');
      };
      
      // Add the event listener with our properly typed handler
      document.addEventListener('visibilitychange', visibilityChangeHandler);
      
      // Return cleanup function
      return () => {
        document.removeEventListener('visibilitychange', visibilityChangeHandler);
      };
    });
    
    // Set up online status change handlers
    const updateOnlineStatus = () => {
      const online = navigator.onLine;
      setIsOnline(online);
      
      // Notify React Query's online manager
      onlineManager.setOnline(online);
      
      // Trigger refetching when coming back online
      if (online) {
        console.log('🌐 Network connection restored. Refetching stale data...');
        queryClient.invalidateQueries();
      } else {
        console.log('🔌 Network connection lost. Using cached data...');
      }
    };
    
    // Set initial status
    updateOnlineStatus();
    
    // Add event listeners for online/offline events
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    // Configure React Query's online manager
    onlineManager.setEventListener(setOnline => {
      return () => {
        window.addEventListener('online', () => setOnline(true));
        window.addEventListener('offline', () => setOnline(false));
        
        return () => {
          window.removeEventListener('online', () => setOnline(true));
          window.removeEventListener('offline', () => setOnline(false));
        };
      };
    });
    
    // Cleanup on unmount
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, [queryClient]);
  
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      
      {/* Only enable React Query DevTools in development mode */}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
      
      {/* Optional connection status indicator */}
      {!isOnline && (
        <div className="fixed bottom-4 right-4 bg-amber-500 text-white px-4 py-2 rounded shadow-lg z-50">
          Offline Mode - Using cached data
        </div>
      )}
    </QueryClientProvider>
  );
}
