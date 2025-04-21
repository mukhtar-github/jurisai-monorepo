/**
 * Cache Service for JurisAI
 * 
 * Implements advanced caching strategies for API requests:
 * - HTTP Cache with RFC 7234 compliance (Cache-Control, ETag)
 * - Request deduplication
 * - Persisted cache for offline use
 * - Cache prioritization based on data type
 * - Automatic cache expiration
 */

interface CacheEntry {
  data: any;
  etag?: string;
  lastModified?: string;
  cachedAt: number;
  expires?: number;
  cacheControl?: string;
  priority: CachePriority;
}

// Cache priority levels
export enum CachePriority {
  HIGH = 'high',     // Essential data (user profile, documents list, etc.)
  MEDIUM = 'medium', // Important but not critical data (search results, etc.)
  LOW = 'low',       // Ephemeral data (temporary search results, etc.)
  PREFETCH = 'prefetch' // Pre-fetched data (not yet requested by user)
}

// Default cache TTL for different priority levels (in milliseconds)
const DEFAULT_TTL: Record<CachePriority, number> = {
  [CachePriority.HIGH]: 24 * 60 * 60 * 1000, // 24 hours
  [CachePriority.MEDIUM]: 60 * 60 * 1000,   // 1 hour
  [CachePriority.LOW]: 5 * 60 * 1000,       // 5 minutes
  [CachePriority.PREFETCH]: 30 * 60 * 1000  // 30 minutes
};

// Maximum cache size (in entries)
const MAX_CACHE_SIZE = 500;

// Cache storage key
const CACHE_STORAGE_KEY = 'JURISAI_HTTP_CACHE';

class HttpCacheService {
  private cache: Map<string, CacheEntry> = new Map();
  private pendingRequests: Map<string, Promise<any>> = new Map();
  private initialized = false;
  private cacheDirty = false;
  private persistenceTimeout: NodeJS.Timeout | null = null;
  
  constructor() {
    this.loadFromStorage();
    
    // Set up interval to clean expired entries
    if (typeof window !== 'undefined') {
      setInterval(() => this.cleanup(), 15 * 60 * 1000); // Clean up every 15 minutes
      
      // Listen for window beforeunload to persist cache
      window.addEventListener('beforeunload', () => this.persistToStorage(true));
    }
  }
  
  /**
   * Generate a cache key from request details
   */
  private generateCacheKey(url: string, params?: Record<string, any>): string {
    const normalizedUrl = url.toLowerCase();
    
    if (!params || Object.keys(params).length === 0) {
      return normalizedUrl;
    }
    
    // Sort params by key for consistent cache keys
    const sortedParams = Object.keys(params)
      .sort()
      .reduce<Record<string, any>>((acc, key) => {
        // Skip params that start with _ (often used for cache busting)
        if (!key.startsWith('_')) {
          acc[key] = params[key];
        }
        return acc;
      }, {});
    
    return `${normalizedUrl}?${JSON.stringify(sortedParams)}`;
  }
  
  /**
   * Load cache from localStorage
   */
  private loadFromStorage(): void {
    if (typeof window === 'undefined' || this.initialized) return;
    
    try {
      const storedCache = localStorage.getItem(CACHE_STORAGE_KEY);
      if (storedCache) {
        const parsedCache = JSON.parse(storedCache);
        
        // Convert the plain object back to a Map
        if (parsedCache && typeof parsedCache === 'object') {
          Object.entries(parsedCache).forEach(([key, value]) => {
            this.cache.set(key, value as CacheEntry);
          });
        }
      }
    } catch (error) {
      console.error('Failed to load cache from storage:', error);
      // Reset cache if loading fails
      this.cache = new Map();
    }
    
    this.initialized = true;
  }
  
  /**
   * Persist cache to localStorage
   */
  private persistToStorage(immediate = false): void {
    if (typeof window === 'undefined' || !this.cacheDirty) return;
    
    // Clear existing timeout if there is one
    if (this.persistenceTimeout) {
      clearTimeout(this.persistenceTimeout);
      this.persistenceTimeout = null;
    }
    
    const persistCache = () => {
      try {
        // Convert the Map to a plain object for storage
        const cacheObj = Array.from(this.cache.entries()).reduce<Record<string, CacheEntry>>(
          (obj, [key, value]) => {
            obj[key] = value;
            return obj;
          },
          {}
        );
        
        localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(cacheObj));
        this.cacheDirty = false;
      } catch (error) {
        console.error('Failed to persist cache to storage:', error);
      }
    };
    
    if (immediate) {
      persistCache();
    } else {
      // Debounce persistence to avoid excessive writes
      this.persistenceTimeout = setTimeout(persistCache, 2000);
    }
  }
  
  /**
   * Remove expired entries and enforce size limits
   */
  private cleanup(): void {
    if (this.cache.size === 0) return;
    
    const now = Date.now();
    let entriesRemoved = false;
    
    // Remove expired entries
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expires && entry.expires < now) {
        this.cache.delete(key);
        entriesRemoved = true;
      }
    }
    
    // If we're still over the limit, remove oldest entries by priority
    if (this.cache.size > MAX_CACHE_SIZE) {
      const entries = Array.from(this.cache.entries())
        .map(([key, value]) => ({ key, ...value }))
        .sort((a, b) => {
          // First sort by priority (low priority gets removed first)
          const priorityOrder = {
            [CachePriority.LOW]: 0,
            [CachePriority.PREFETCH]: 1,
            [CachePriority.MEDIUM]: 2,
            [CachePriority.HIGH]: 3
          };
          
          const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
          if (priorityDiff !== 0) return priorityDiff;
          
          // Then sort by cachedAt (oldest gets removed first)
          return a.cachedAt - b.cachedAt;
        });
      
      // Remove oldest entries until we're under the limit
      const entriesToRemove = entries.slice(0, this.cache.size - MAX_CACHE_SIZE);
      entriesToRemove.forEach(entry => {
        this.cache.delete(entry.key);
        entriesRemoved = true;
      });
    }
    
    // Persist changes if any entries were removed
    if (entriesRemoved) {
      this.cacheDirty = true;
      this.persistToStorage();
    }
  }
  
  /**
   * Get entry from cache
   */
  get(url: string, params?: Record<string, any>): CacheEntry | undefined {
    const key = this.generateCacheKey(url, params);
    const entry = this.cache.get(key);
    
    // Check if entry exists and is not expired
    if (entry) {
      if (entry.expires && entry.expires < Date.now()) {
        // Remove expired entry
        this.cache.delete(key);
        this.cacheDirty = true;
        this.persistToStorage();
        return undefined;
      }
      return entry;
    }
    
    return undefined;
  }
  
  /**
   * Set entry in cache
   */
  set(
    url: string, 
    data: any, 
    params?: Record<string, any>, 
    options?: {
      etag?: string;
      lastModified?: string;
      cacheControl?: string;
      maxAge?: number;
      priority?: CachePriority;
    }
  ): void {
    const key = this.generateCacheKey(url, params);
    const priority = options?.priority || CachePriority.MEDIUM;
    
    // Parse cache-control header if present
    let expires: number | undefined;
    
    if (options?.cacheControl) {
      const maxAgeMatch = options.cacheControl.match(/max-age=(\d+)/);
      if (maxAgeMatch && maxAgeMatch[1]) {
        const maxAgeSeconds = parseInt(maxAgeMatch[1], 10);
        expires = Date.now() + (maxAgeSeconds * 1000);
      }
    } else if (options?.maxAge) {
      expires = Date.now() + options.maxAge;
    } else {
      // Use default TTL based on priority
      expires = Date.now() + DEFAULT_TTL[priority];
    }
    
    // Store in cache
    this.cache.set(key, {
      data,
      etag: options?.etag,
      lastModified: options?.lastModified,
      cachedAt: Date.now(),
      expires,
      cacheControl: options?.cacheControl,
      priority
    });
    
    this.cacheDirty = true;
    this.persistToStorage();
  }
  
  /**
   * Delete entry from cache
   */
  delete(url: string, params?: Record<string, any>): void {
    const key = this.generateCacheKey(url, params);
    if (this.cache.has(key)) {
      this.cache.delete(key);
      this.cacheDirty = true;
      this.persistToStorage();
    }
  }
  
  /**
   * Clear all entries from cache
   */
  clear(): void {
    this.cache.clear();
    this.cacheDirty = true;
    this.persistToStorage(true);
  }
  
  /**
   * Clear entries by URL pattern
   */
  clearByPattern(urlPattern: string | RegExp): void {
    let pattern: RegExp;
    if (typeof urlPattern === 'string') {
      pattern = new RegExp(urlPattern.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
    } else {
      pattern = urlPattern;
    }
    
    let entriesRemoved = false;
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
        entriesRemoved = true;
      }
    }
    
    if (entriesRemoved) {
      this.cacheDirty = true;
      this.persistToStorage();
    }
  }
  
  /**
   * Track a pending request to deduplicate concurrent requests
   */
  trackPendingRequest(url: string, params: Record<string, any> | undefined, promise: Promise<any>): void {
    const key = this.generateCacheKey(url, params);
    this.pendingRequests.set(key, promise);
    
    // Remove from pending requests when finished
    promise.finally(() => {
      if (this.pendingRequests.get(key) === promise) {
        this.pendingRequests.delete(key);
      }
    });
  }
  
  /**
   * Get a pending request if one exists
   */
  getPendingRequest(url: string, params?: Record<string, any>): Promise<any> | undefined {
    const key = this.generateCacheKey(url, params);
    return this.pendingRequests.get(key);
  }
  
  /**
   * Prefetch and cache API resources
   */
  async prefetch(url: string, params?: Record<string, any>, options?: { priority?: CachePriority }): Promise<void> {
    // Don't prefetch if we already have a cached or pending version
    const key = this.generateCacheKey(url, params);
    if (this.cache.has(key) || this.pendingRequests.has(key)) {
      return;
    }
    
    const defaultOptions = { priority: CachePriority.PREFETCH };
    const mergedOptions = { ...defaultOptions, ...options };
    
    try {
      // This assumes a fetch or axios-like API where we can set a priority flag
      const response = await fetch(url, {
        method: 'GET',
        // Add prefetch header for server-side tracking
        headers: { 'X-Prefetch': 'true' }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Get cache headers
        const etag = response.headers.get('etag') || undefined;
        const lastModified = response.headers.get('last-modified') || undefined;
        const cacheControl = response.headers.get('cache-control') || undefined;
        
        // Store in cache with prefetch priority
        this.set(url, data, params, {
          etag,
          lastModified,
          cacheControl,
          priority: mergedOptions.priority
        });
      }
    } catch (error) {
      // Silently fail for prefetch requests
      console.debug(`Prefetch failed for ${url}:`, error);
    }
  }
}

// Export a singleton instance
export const httpCache = new HttpCacheService();
export default httpCache;
