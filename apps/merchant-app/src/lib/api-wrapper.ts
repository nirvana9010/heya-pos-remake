import { apiClient } from './api-client';
import { transformApiResponse } from './db-transforms';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export const api = {
  async get(path: string, options?: any) {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${API_URL}${path}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Request failed');
    }

    const responseData = await response.json();
    return transformApiResponse(responseData);
  },

  async post(path: string, data?: any, options?: any) {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(data),
      ...options,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Request failed');
    }

    const responseData = await response.json();
    return transformApiResponse(responseData);
  },

  async put(path: string, data?: any, options?: any) {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${API_URL}${path}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(data),
      ...options,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Request failed');
    }

    const responseData = await response.json();
    return transformApiResponse(responseData);
  },

  async delete(path: string, options?: any) {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${API_URL}${path}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Request failed');
    }

    const responseData = await response.json();
    return transformApiResponse(responseData);
  },
};