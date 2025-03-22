import apiClient from './client';
import { User } from '../context/AuthContext';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

/**
 * Login a user with email and password
 */
export const login = async (data: LoginRequest): Promise<LoginResponse> => {
  const response = await apiClient.post<LoginResponse>('/auth/login', data);
  return response.data;
};

/**
 * Register a new user account
 */
export const register = async (data: RegisterRequest): Promise<LoginResponse> => {
  const response = await apiClient.post<LoginResponse>('/auth/register', data);
  return response.data;
};

/**
 * Get the current user profile
 */
export const getCurrentUser = async (): Promise<User> => {
  const response = await apiClient.get<User>('/auth/me');
  return response.data;
};

/**
 * Update user profile information
 */
export const updateUserProfile = async (data: Partial<User>): Promise<User> => {
  const response = await apiClient.patch<User>('/auth/profile', data);
  return response.data;
};

/**
 * Change user password
 */
export const changePassword = async (
  oldPassword: string,
  newPassword: string
): Promise<{ success: boolean }> => {
  const response = await apiClient.post<{ success: boolean }>('/auth/password', {
    oldPassword,
    newPassword,
  });
  return response.data;
};
