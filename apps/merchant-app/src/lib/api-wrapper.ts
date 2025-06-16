import { apiClient } from './api-client';

// Re-export the apiClient methods for backward compatibility
// The apiClient already handles version prefixes and data transformation
export const api = {
  async get(path: string, options?: any) {
    try {
      const response = await apiClient.get(path, options);
      return response.data || response;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Request failed');
    }
  },

  async post(path: string, data?: any, options?: any) {
    try {
      const response = await apiClient.post(path, data, options);
      return response.data || response;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Request failed');
    }
  },

  async put(path: string, data?: any, options?: any) {
    try {
      const response = await apiClient.put(path, data, options);
      return response.data || response;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Request failed');
    }
  },

  async delete(path: string, options?: any) {
    try {
      const response = await apiClient.delete(path, options);
      return response.data || response;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Request failed');
    }
  },
};