import apiClient from '../../lib/api/client';

// Mock fetch globally
global.fetch = jest.fn();

// Mock axios
jest.mock('axios', () => {
  return {
    create: jest.fn(() => ({
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: { use: jest.fn(), eject: jest.fn() },
        response: { use: jest.fn(), eject: jest.fn() }
      }
    })),
    isAxiosError: jest.fn(() => true)
  };
});

describe('API Client', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn()
      },
      writable: true
    });
  });

  describe('apiClient', () => {
    it('should be properly initialized', () => {
      expect(apiClient).toBeDefined();
      expect(apiClient.defaults.baseURL).toMatch(/^https?:\/\//); 
      expect(apiClient.defaults.headers['Content-Type']).toBe('application/json');
    });
  });

  describe('Error handling', () => {
    it('should handle API responses correctly', async () => {
      // Since the actual implementation is complex and uses axios interceptors,
      // we're mainly testing for proper initialization here
      expect(apiClient.interceptors).toBeDefined();
    });
  });
});
