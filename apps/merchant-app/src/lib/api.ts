const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export interface LoginResponse {
  token: string;
  refreshToken: string;
  merchant: {
    id: string;
    name: string;
    email: string;
    subdomain: string;
  };
  user: {
    id: string;
    username: string;
    role: string;
  };
}

export async function merchantLogin(username: string, password: string, rememberMe: boolean = false): Promise<LoginResponse> {
  console.log('Calling API at:', `${API_URL}/auth/merchant/login`);
  
  try {
    // Use api-client for consistency and to get auto token refresh
    const { apiClient } = await import('./api-client');
    const response = await apiClient.login(username, password, rememberMe);
    
    // Transform response to match expected format
    return {
      token: response.access_token,
      refreshToken: response.refresh_token,
      merchant: response.merchant,
      user: response.user
    };
  } catch (error: any) {
    console.error('Login error:', error);
    if (error.message === 'Failed to fetch' || error.code === 'ECONNREFUSED') {
      throw new Error('Cannot connect to API server. Please ensure the API is running on port 3000.');
    }
    throw error;
  }
}

export async function getDashboardStats(token: string) {
  const response = await fetch(`${API_URL}/dashboard/stats`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch dashboard stats');
  }

  return response.json();
}

export async function getTodayBookings(token: string) {
  const response = await fetch(`${API_URL}/bookings/today`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch bookings');
  }

  return response.json();
}