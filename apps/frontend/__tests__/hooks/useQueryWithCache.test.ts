import { renderHook, act } from '@testing-library/react';
import { useQueryWithCache } from '../../lib/hooks/useQueryWithCache';
import * as cacheService from '../../lib/services/cacheService';

// Mock the cacheService module
jest.mock('../../lib/services/cacheService', () => ({
  getFromCache: jest.fn(),
  saveToCache: jest.fn(),
  invalidateCache: jest.fn(),
  getCacheKey: jest.fn((...args) => JSON.stringify(args))
}));

describe('useQueryWithCache', () => {
  // Setup mock functions
  const mockFetcher = jest.fn();
  const mockOnSuccess = jest.fn();
  const mockOnError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Default implementation of getFromCache returns null (cache miss)
    (cacheService.getFromCache as jest.Mock).mockReturnValue(null);
    
    // Default implementation of successful fetcher
    mockFetcher.mockResolvedValue({ data: 'test-data' });
  });

  it('should fetch data and cache it when cache is empty', async () => {
    // Setup: cache miss
    (cacheService.getFromCache as jest.Mock).mockReturnValue(null);
    
    // Run the hook
    const { result, waitForNextUpdate } = renderHook(() => 
      useQueryWithCache(
        ['test-key'], 
        mockFetcher,
        { onSuccess: mockOnSuccess, onError: mockOnError }
      )
    );
    
    // Initial state should be loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeUndefined();
    
    // Wait for fetch to complete
    await waitForNextUpdate();
    
    // After fetch completes
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toEqual({ data: 'test-data' });
    expect(result.current.error).toBeUndefined();
    
    // Verify interactions
    expect(cacheService.getFromCache).toHaveBeenCalledWith(expect.any(String));
    expect(mockFetcher).toHaveBeenCalled();
    expect(cacheService.saveToCache).toHaveBeenCalledWith(
      expect.any(String),
      { data: 'test-data' },
      undefined // default TTL
    );
    expect(mockOnSuccess).toHaveBeenCalledWith({ data: 'test-data' });
    expect(mockOnError).not.toHaveBeenCalled();
  });

  it('should return cached data when available and not fetch', async () => {
    // Setup: cache hit
    const cachedData = { data: 'cached-data' };
    (cacheService.getFromCache as jest.Mock).mockReturnValue(cachedData);
    
    // Run the hook
    const { result } = renderHook(() => 
      useQueryWithCache(
        ['test-key'], 
        mockFetcher,
        { onSuccess: mockOnSuccess, onError: mockOnError }
      )
    );
    
    // Should immediately have data and not be loading
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toEqual(cachedData);
    expect(result.current.error).toBeUndefined();
    
    // Verify interactions
    expect(cacheService.getFromCache).toHaveBeenCalledWith(expect.any(String));
    expect(mockFetcher).not.toHaveBeenCalled();
    expect(cacheService.saveToCache).not.toHaveBeenCalled();
    expect(mockOnSuccess).toHaveBeenCalledWith(cachedData);
    expect(mockOnError).not.toHaveBeenCalled();
  });

  it('should handle fetch errors correctly', async () => {
    // Setup: cache miss and fetcher error
    (cacheService.getFromCache as jest.Mock).mockReturnValue(null);
    const testError = new Error('Fetch failed');
    mockFetcher.mockRejectedValue(testError);
    
    // Run the hook
    const { result, waitForNextUpdate } = renderHook(() => 
      useQueryWithCache(
        ['test-key'], 
        mockFetcher,
        { onSuccess: mockOnSuccess, onError: mockOnError }
      )
    );
    
    // Initial state should be loading
    expect(result.current.isLoading).toBe(true);
    
    // Wait for fetch to complete
    await waitForNextUpdate();
    
    // After fetch error
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBe(testError);
    
    // Verify interactions
    expect(mockFetcher).toHaveBeenCalled();
    expect(cacheService.saveToCache).not.toHaveBeenCalled();
    expect(mockOnSuccess).not.toHaveBeenCalled();
    expect(mockOnError).toHaveBeenCalledWith(testError);
  });

  it('should respect skipCache option', async () => {
    // Setup: cache hit but skipCache=true
    const cachedData = { data: 'cached-data' };
    (cacheService.getFromCache as jest.Mock).mockReturnValue(cachedData);
    
    // Run the hook with skipCache=true
    const { result, waitForNextUpdate } = renderHook(() => 
      useQueryWithCache(
        ['test-key'], 
        mockFetcher,
        { 
          onSuccess: mockOnSuccess, 
          onError: mockOnError,
          skipCache: true 
        }
      )
    );
    
    // Initial state should be loading despite cache hit
    expect(result.current.isLoading).toBe(true);
    
    // Wait for fetch to complete
    await waitForNextUpdate();
    
    // After fetch completes
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toEqual({ data: 'test-data' });
    
    // Verify interactions
    expect(cacheService.getFromCache).not.toHaveBeenCalled();
    expect(mockFetcher).toHaveBeenCalled();
    expect(cacheService.saveToCache).toHaveBeenCalled();
  });

  it('should respect cacheTTL option', async () => {
    // Setup: cache miss
    (cacheService.getFromCache as jest.Mock).mockReturnValue(null);
    
    // Run the hook with custom TTL
    const customTTL = 60; // 60 seconds
    const { result, waitForNextUpdate } = renderHook(() => 
      useQueryWithCache(
        ['test-key'], 
        mockFetcher,
        { 
          onSuccess: mockOnSuccess, 
          onError: mockOnError,
          cacheTTL: customTTL 
        }
      )
    );
    
    // Wait for fetch to complete
    await waitForNextUpdate();
    
    // Verify custom TTL was used
    expect(cacheService.saveToCache).toHaveBeenCalledWith(
      expect.any(String),
      { data: 'test-data' },
      customTTL
    );
  });

  it('should refetch data when refresh() is called', async () => {
    // Setup: initial cache hit
    const cachedData = { data: 'cached-data' };
    (cacheService.getFromCache as jest.Mock).mockReturnValue(cachedData);
    
    // Run the hook
    const { result, waitForNextUpdate } = renderHook(() => 
      useQueryWithCache(
        ['test-key'], 
        mockFetcher,
        { onSuccess: mockOnSuccess, onError: mockOnError }
      )
    );
    
    // Initially should have cached data
    expect(result.current.data).toEqual(cachedData);
    
    // Reset mocks for the next step
    jest.clearAllMocks();
    
    // Call refresh
    act(() => {
      result.current.refresh();
    });
    
    // Should be loading again
    expect(result.current.isLoading).toBe(true);
    
    // Wait for fetch to complete
    await waitForNextUpdate();
    
    // After refresh
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toEqual({ data: 'test-data' });
    
    // Verify interactions
    expect(mockFetcher).toHaveBeenCalled();
    expect(cacheService.saveToCache).toHaveBeenCalled();
  });

  it('should update query keys correctly', async () => {
    // Setup
    const { result, rerender, waitForNextUpdate } = renderHook(
      (props) => useQueryWithCache(props.keys, mockFetcher),
      { initialProps: { keys: ['initial-key'] } }
    );
    
    // Wait for initial fetch
    await waitForNextUpdate();
    
    // Clear mocks for the next step
    jest.clearAllMocks();
    
    // Change query keys
    rerender({ keys: ['new-key'] });
    
    // Should trigger a new fetch with the new key
    expect(mockFetcher).toHaveBeenCalled();
    expect(cacheService.getFromCache).toHaveBeenCalledWith(expect.stringContaining('new-key'));
  });
});
