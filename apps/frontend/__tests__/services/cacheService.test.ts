import httpCache from '../../lib/services/cacheService';

describe('CacheService', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    jest.spyOn(Storage.prototype, 'setItem');
    jest.spyOn(Storage.prototype, 'getItem');
    jest.spyOn(Storage.prototype, 'removeItem');
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Mock Date.now to return a consistent timestamp
    jest.spyOn(Date, 'now').mockReturnValue(1625097600000); // July 1, 2021
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getCacheKey', () => {
    it('should generate consistent cache keys for the same input', () => {
      const key1 = httpCache.getCacheKey('users', 1, { sort: 'name' });
      const key2 = httpCache.getCacheKey('users', 1, { sort: 'name' });
      expect(key1).toBe(key2);
    });

    it('should generate different cache keys for different inputs', () => {
      const key1 = httpCache.getCacheKey('users', 1, { sort: 'name' });
      const key2 = httpCache.getCacheKey('users', 2, { sort: 'name' });
      const key3 = httpCache.getCacheKey('users', 1, { sort: 'age' });
      expect(key1).not.toBe(key2);
      expect(key1).not.toBe(key3);
      expect(key2).not.toBe(key3);
    });

    it('should handle all data types', () => {
      const key = httpCache.getCacheKey(
        'endpoint',
        123,
        true,
        null,
        undefined,
        { complex: { nested: 'object' } },
        ['array', 'of', 'values']
      );
      expect(key).toContain('endpoint');
      expect(key).toContain('123');
      expect(key).toContain('true');
      expect(key).toContain('null');
      expect(key).toContain('undefined');
      expect(key).toContain('object');
      expect(key).toContain('array');
    });
  });

  describe('saveToCache', () => {
    it('should save data to localStorage with the correct key', () => {
      const key = 'test-key';
      const data = { name: 'Test Data' };
      
      httpCache.saveToCache(key, data);
      
      expect(localStorage.setItem).toHaveBeenCalledWith(
        expect.stringContaining(key),
        expect.any(String)
      );
      
      const savedValue = JSON.parse(localStorage.getItem(key) || '{}');
      expect(savedValue.data).toEqual(data);
    });

    it('should save with the default TTL when not specified', () => {
      const key = 'test-key';
      const data = { name: 'Test Data' };
      
      httpCache.saveToCache(key, data);
      
      const savedValue = JSON.parse(localStorage.getItem(key) || '{}');
      expect(savedValue.expiresAt).toBeDefined();
    });

    it('should save with the specified TTL', () => {
      const key = 'test-key';
      const data = { name: 'Test Data' };
      const ttl = 60; // 60 seconds
      
      httpCache.saveToCache(key, data, ttl);
      
      const savedValue = JSON.parse(localStorage.getItem(key) || '{}');
      const expectedExpiry = Date.now() + ttl * 1000;
      expect(savedValue.expiresAt).toBe(expectedExpiry);
    });

    it('should handle saving non-serializable data', () => {
      const key = 'test-key';
      const circular: any = { name: 'Circular' };
      circular.self = circular; // Create circular reference
      
      httpCache.saveToCache(key, circular);
      
      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe('getFromCache', () => {
    it('should return null for non-existent keys', () => {
      const result = httpCache.getFromCache('non-existent-key');
      expect(result).toBeNull();
    });

    it('should return null for expired cache entries', () => {
      // Setup an expired cache entry
      const key = 'expired-key';
      const expiredData = {
        data: { name: 'Expired Data' },
        expiresAt: Date.now() - 1000 // Expired 1 second ago
      };
      localStorage.setItem(key, JSON.stringify(expiredData));
      
      const result = httpCache.getFromCache(key);
      
      expect(result).toBeNull();
      // Should clean up expired entry
      expect(localStorage.removeItem).toHaveBeenCalledWith(key);
    });

    it('should return valid non-expired cache data', () => {
      // Setup a valid cache entry
      const key = 'valid-key';
      const validData = {
        data: { name: 'Valid Data' },
        expiresAt: Date.now() + 60000 // Expires in 1 minute
      };
      localStorage.setItem(key, JSON.stringify(validData));
      
      const result = httpCache.getFromCache(key);
      
      expect(result).toEqual(validData.data);
    });

    it('should handle corrupted cache data', () => {
      // Setup corrupted cache entry
      const key = 'corrupted-key';
      localStorage.setItem(key, 'not-json-data');
      
      const result = httpCache.getFromCache(key);
      
      expect(result).toBeNull();
      expect(console.warn).toHaveBeenCalled();
      // Should clean up corrupted entry
      expect(localStorage.removeItem).toHaveBeenCalledWith(key);
    });
  });

  describe('invalidateCache', () => {
    it('should remove the specified cache key', () => {
      const key = 'test-key';
      
      // First save something to cache
      httpCache.saveToCache(key, { data: 'test' });
      
      // Then invalidate it
      httpCache.invalidateCache(key);
      
      expect(localStorage.removeItem).toHaveBeenCalledWith(key);
      expect(httpCache.getFromCache(key)).toBeNull();
    });
  });

  describe('invalidateKeyPattern', () => {
    beforeEach(() => {
      // Setup multiple cache entries
      httpCache.saveToCache('users:list', { list: [1, 2, 3] });
      httpCache.saveToCache('users:1:detail', { id: 1, name: 'User 1' });
      httpCache.saveToCache('users:2:detail', { id: 2, name: 'User 2' });
      httpCache.saveToCache('posts:list', { list: [1, 2] });
    });

    it('should invalidate keys matching the pattern', () => {
      httpCache.invalidateKeyPattern('users:');
      
      expect(httpCache.getFromCache('users:list')).toBeNull();
      expect(httpCache.getFromCache('users:1:detail')).toBeNull();
      expect(httpCache.getFromCache('users:2:detail')).toBeNull();
      
      // Should not affect unrelated keys
      expect(httpCache.getFromCache('posts:list')).not.toBeNull();
    });

    it('should invalidate specific pattern keys', () => {
      httpCache.invalidateKeyPattern('users:1:');
      
      expect(httpCache.getFromCache('users:list')).not.toBeNull();
      expect(httpCache.getFromCache('users:1:detail')).toBeNull();
      expect(httpCache.getFromCache('users:2:detail')).not.toBeNull();
    });

    it('should handle no matches gracefully', () => {
      httpCache.invalidateKeyPattern('non-existent:');
      
      // Nothing should be removed
      expect(httpCache.getFromCache('users:list')).not.toBeNull();
      expect(httpCache.getFromCache('users:1:detail')).not.toBeNull();
      expect(httpCache.getFromCache('users:2:detail')).not.toBeNull();
      expect(httpCache.getFromCache('posts:list')).not.toBeNull();
    });
  });

  describe('createCacheKeyFromRequest', () => {
    it('should create a key from a fetch Request object', () => {
      const request = new Request('https://api.example.com/users?page=1&sort=name', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const key = httpCache.createCacheKeyFromRequest(request);
      
      expect(key).toContain('users');
      expect(key).toContain('page=1');
      expect(key).toContain('sort=name');
    });

    it('should handle different HTTP methods', () => {
      const getRequest = new Request('https://api.example.com/users', { method: 'GET' });
      const postRequest = new Request('https://api.example.com/users', { method: 'POST' });
      
      const getKey = httpCache.createCacheKeyFromRequest(getRequest);
      const postKey = httpCache.createCacheKeyFromRequest(postRequest);
      
      expect(getKey).not.toBe(postKey);
      expect(getKey).toContain('GET');
      expect(postKey).toContain('POST');
    });

    it('should include request body in the key for POST/PUT requests', () => {
      const request = new Request('https://api.example.com/users', {
        method: 'POST',
        body: JSON.stringify({ name: 'New User' })
      });
      
      const key = httpCache.createCacheKeyFromRequest(request);
      
      expect(key).toContain('New User');
    });
  });

  describe('setupCacheInterceptor', () => {
    let originalFetch: typeof window.fetch;
    
    beforeEach(() => {
      originalFetch = window.fetch;
      window.fetch = jest.fn().mockImplementation(() => 
        Promise.resolve(new Response(JSON.stringify({ success: true })))
      );
    });
    
    afterEach(() => {
      window.fetch = originalFetch;
    });

    it('should intercept fetch requests and check cache first', async () => {
      // Setup cached response
      const key = 'https://api.example.com/users:GET';
      httpCache.saveToCache(key, { cached: true });
      
      // Set up the interceptor
      httpCache.setupCacheInterceptor();
      
      // Make a request that should be cached
      const result = await fetch('https://api.example.com/users');
      const data = await result.json();
      
      expect(data).toEqual({ cached: true });
      // Original fetch should not be called since response was cached
      expect(window.fetch).not.toHaveBeenCalled();
    });

    it('should cache responses for GET requests', async () => {
      // Set up the interceptor
      httpCache.setupCacheInterceptor();
      
      // No cached data for this endpoint
      const url = 'https://api.example.com/posts';
      (window.fetch as jest.Mock).mockImplementationOnce(() => 
        Promise.resolve(new Response(JSON.stringify({ posts: [1, 2, 3] })))
      );
      
      // Make the request
      await fetch(url);
      
      // Verify it was cached
      const key = `${url}:GET`;
      const cachedData = httpCache.getFromCache(key);
      expect(cachedData).toEqual({ posts: [1, 2, 3] });
    });

    it('should not cache non-GET requests', async () => {
      // Set up the interceptor
      httpCache.setupCacheInterceptor();
      
      const url = 'https://api.example.com/users';
      await fetch(url, { method: 'POST', body: JSON.stringify({ name: 'New User' }) });
      
      // Verify it was not cached
      const key = `${url}:POST`;
      const cachedData = httpCache.getFromCache(key);
      expect(cachedData).toBeNull();
    });

    it('should not cache failed responses', async () => {
      // Set up the interceptor
      httpCache.setupCacheInterceptor();
      
      const url = 'https://api.example.com/error';
      (window.fetch as jest.Mock).mockImplementationOnce(() => 
        Promise.resolve(new Response('Error', { status: 500 }))
      );
      
      // Make the request (will fail)
      await fetch(url).catch(() => {});
      
      // Verify it was not cached
      const key = `${url}:GET`;
      const cachedData = httpCache.getFromCache(key);
      expect(cachedData).toBeNull();
    });
  });
});
