'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { login as apiLogin, getCurrentUser } from '../api/auth';
import apiClient from '../api/client';

// Define user type
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
}

// Define authentication state type
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Define context value type
interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
}

// Create the context with default values
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Local storage keys
const TOKEN_KEY = 'jurisai_auth_token';
const USER_KEY = 'jurisai_user';

// Auth provider props
interface AuthProviderProps {
  children: ReactNode;
}

// Auth provider component
export function AuthProvider({ children }: AuthProviderProps) {
  // State for auth data
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Initialize auth state from localStorage on component mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = localStorage.getItem(TOKEN_KEY);
        const storedUser = localStorage.getItem(USER_KEY);

        if (storedToken && storedUser) {
          // Set the token in the API client for all future requests
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          
          // Try to fetch the current user from API to validate token
          try {
            const user = await getCurrentUser();
            setState({
              user,
              token: storedToken,
              isAuthenticated: true,
              isLoading: false,
            });
          } catch (error) {
            // Token might be invalid or expired, clear auth state
            console.error('Error fetching user profile, token may be invalid:', error);
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            setState({
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
            });
          }
        } else {
          setState((prev) => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error('Error initializing auth state:', error);
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    };

    initializeAuth();
  }, []);

  // Login function - now using the API
  const login = async (email: string, password: string) => {
    try {
      // Call the login API
      const { user, token } = await apiLogin({ email, password });

      // Set the token in the API client for all future requests
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      // Store in localStorage
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));

      // Update state
      setState({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  // Logout function
  const logout = () => {
    // Clear localStorage
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    
    // Remove authorization header
    delete apiClient.defaults.headers.common['Authorization'];

    // Reset state
    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  };

  // Update user information
  const updateUser = (userData: Partial<User>) => {
    if (!state.user) return;

    const updatedUser = { ...state.user, ...userData };

    // Update localStorage
    localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));

    // Update state
    setState((prev) => ({
      ...prev,
      user: updatedUser,
    }));
  };

  // Context value
  const value: AuthContextType = {
    ...state,
    login,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Auth guard higher-order component
export function withAuth(Component: React.ComponentType<any>) {
  return function AuthenticatedComponent(props: any) {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
      return <div>Loading...</div>;
    }

    if (!isAuthenticated) {
      // In a real app, you'd redirect to login
      return <div>Please log in to access this page.</div>;
    }

    return <Component {...props} />;
  };
}
