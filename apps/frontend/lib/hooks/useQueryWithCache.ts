/**
 * Enhanced React Query hooks with HTTP caching integration
 * Provides improved caching strategies for API requests
 */
import { 
  useQuery, 
  useMutation, 
  useQueryClient,
  UseQueryOptions,
  UseMutationOptions,
  QueryKey,
  QueryClient,
  UseQueryResult,
  UseMutationResult
} from '@tanstack/react-query';
import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import apiClient, { ApiError, invalidateCacheTags } from '@/lib/api/client';
import { CachePriority } from '@/lib/services/cacheService';

// Specialized query options including cache configuration
export interface CachedQueryOptions<TData, TError> 
  extends Omit<UseQueryOptions<TData, TError, TData, QueryKey>, 'queryKey' | 'queryFn'> {
  cachePriority?: CachePriority;
  cacheTtl?: number;
  forceRefresh?: boolean;
  cacheTags?: string[];
}

/**
 * Creates a query hook for a specific API endpoint
 * @param endpoint - The API endpoint path (without base URL)
 * @param queryKeyFn - Function to generate the query key
 * @returns A hook function that can be used to query the endpoint
 */
export function createQuery<TParams, TData>(
  endpoint: string,
  queryKeyFn: (params: TParams) => QueryKey
) {
  return function useEndpointQuery(
    params: TParams,
    options?: CachedQueryOptions<TData, ApiError>
  ): UseQueryResult<TData, ApiError> {
    // Extract cache options
    const { 
      cachePriority = CachePriority.MEDIUM,
      cacheTtl,
      forceRefresh,
      cacheTags,
      ...queryOptions 
    } = options || {};
    
    // Build full URL with parameters if any
    const buildUrl = () => {
      // Convert params to URL parameters for GET requests
      if (params && typeof params === 'object') {
        const queryParams = Object.entries(params as Record<string, any>)
          .filter(([key]) => !['_', 'page', 'limit'].includes(key)) // Filter out special params
          .reduce<Record<string, any>>((acc, [key, value]) => {
            if (value !== undefined && value !== null) {
              acc[key] = value;
            }
            return acc;
          }, {});
          
        // Handle pagination separately to ensure consistent caching
        const pagination: Record<string, any> = {};
        if ((params as any).page) pagination.page = (params as any).page;
        if ((params as any).limit) pagination.limit = (params as any).limit;
        
        return {
          url: endpoint,
          params: { ...queryParams, ...pagination }
        };
      }
      
      return { url: endpoint, params: {} };
    };
    
    // Create query function that handles both object and primitive params
    const queryFn = async (): Promise<TData> => {
      const { url, params: urlParams } = buildUrl();
      
      try {
        const response = await apiClient.get(url, {
          params: urlParams,
          cacheOptions: {
            priority: cachePriority,
            ttl: cacheTtl,
            forceRefresh,
            cacheTags
          }
        });
        
        return response.data;
      } catch (error) {
        throw error;
      }
    };
    
    // Return the query with proper configuration
    return useQuery<TData, ApiError>({
      queryKey: queryKeyFn(params),
      queryFn,
      // Use custom option handling to work with React Query v4 API
      ...queryOptions,
    });
  };
}

/**
 * Creates a paginated query hook for endpoints that return paginated results
 * @param endpoint - The API endpoint path (without base URL)
 * @param queryKeyFn - Function to generate the query key
 * @returns A hook function that can be used to query paginated data
 */
export function createPaginatedQuery<TParams extends { page?: number; limit?: number }, TData>(
  endpoint: string,
  queryKeyFn: (params: TParams) => QueryKey
) {
  return function usePaginatedQuery(
    params: TParams,
    options?: CachedQueryOptions<TData, ApiError>
  ): UseQueryResult<TData, ApiError> {
    // Extract pagination parameters
    const page = params.page || 1;
    const limit = params.limit || 10;
    
    // Use the standard query hook with pagination defaults
    return createQuery<TParams, TData>(endpoint, queryKeyFn)(
      { ...params, page, limit },
      {
        // Default settings for paginated content
        cachePriority: CachePriority.MEDIUM,
        cacheTtl: 5 * 60 * 1000, // 5 minutes
        ...options
      }
    );
  };
}

// Types for mutation options with cache invalidation
export interface CachedMutationOptions<TData, TError, TVariables, TContext>
  extends Omit<UseMutationOptions<TData, TError, TVariables, TContext>, 'mutationFn'> {
  invalidateQueries?: QueryKey | QueryKey[];
  invalidateTags?: string[];
}

/**
 * Creates a mutation hook for a specific API endpoint
 * @param endpoint - The API endpoint path (without base URL)
 * @param method - The HTTP method to use
 * @returns A hook function that can be used to mutate data
 */
export function createMutation<TVariables, TData>(
  endpoint: string,
  method: 'post' | 'put' | 'patch' | 'delete' = 'post'
) {
  return function useEndpointMutation(
    options?: CachedMutationOptions<TData, ApiError, TVariables, unknown>
  ): UseMutationResult<TData, ApiError, TVariables, unknown> {
    const queryClient = useQueryClient();
    
    const { invalidateQueries, invalidateTags, ...mutationOptions } = options || {};
    
    // Create mutation function that sends data to the API
    const mutationFn = async (variables: TVariables): Promise<TData> => {
      try {
        let response;
        
        switch (method) {
          case 'post':
            response = await apiClient.post(endpoint, variables);
            break;
          case 'put':
            response = await apiClient.put(endpoint, variables);
            break;
          case 'patch':
            response = await apiClient.patch(endpoint, variables);
            break;
          case 'delete':
            response = await apiClient.delete(endpoint, {
              data: variables,
            });
            break;
        }
        
        return response.data;
      } catch (error) {
        throw error;
      }
    };
    
    return useMutation<TData, ApiError, TVariables>({
      mutationFn,
      onSuccess: (data, variables, context) => {
        // Invalidate queries if specified
        if (invalidateQueries) {
          const queriesToInvalidate = Array.isArray(invalidateQueries[0])
            ? invalidateQueries as QueryKey[]
            : [invalidateQueries as QueryKey];
          
          queriesToInvalidate.forEach(queryKey => {
            queryClient.invalidateQueries({ queryKey });
          });
        }
        
        // Invalidate cache tags if specified
        if (invalidateTags && invalidateTags.length > 0) {
          invalidateCacheTags(invalidateTags);
        }
        
        // Call the original onSuccess handler if provided
        if (options?.onSuccess) {
          options.onSuccess(data, variables, context);
        }
      },
      ...mutationOptions,
    });
  };
}

/**
 * Creates a query hook for prefetching data
 * @param queryClient - The QueryClient instance
 * @param queryKey - The query key to prefetch
 * @param queryFn - The query function to execute
 * @param options - Query options
 */
export function prefetchQuery<TData>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  queryFn: () => Promise<TData>,
  options?: CachedQueryOptions<TData, ApiError>
): Promise<void> {
  return queryClient.prefetchQuery({
    queryKey,
    queryFn,
    ...options
  });
}

/**
 * Example usage:
 * 
 * // Define your queries
 * export const useDocuments = createQuery<{ type?: string }, Document[]>(
 *   '/documents',
 *   (params) => ['documents', params]
 * );
 * 
 * // Define your mutations
 * export const useCreateDocument = createMutation<CreateDocumentRequest, Document>(
 *   '/documents',
 *   'post'
 * );
 * 
 * // Using the hooks in components
 * const { data, isLoading } = useDocuments({ type: 'legal' }, {
 *   cachePriority: CachePriority.HIGH,
 *   cacheTags: ['documents', 'legal'],
 *   staleTime: 5 * 60 * 1000 // 5 minutes
 * });
 * 
 * const createDocument = useCreateDocument({
 *   invalidateQueries: [['documents']],
 *   invalidateTags: ['documents'],
 *   onSuccess: (data) => {
 *     console.log('Document created:', data);
 *   }
 * });
 */
