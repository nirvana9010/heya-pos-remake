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

export async function getDashboardStats() {
  // Use the apiClient which has a fallback for 404
  const { apiClient } = await import('./api-client');
  return await apiClient.getDashboardStats();
}

export async function getTodayBookings() {
  // Use apiClient to get today's bookings with proper date filtering
  const { apiClient } = await import('./api-client');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const response = await apiClient.getBookings({
    startDate: today.toISOString(),
    endDate: tomorrow.toISOString(),
  });
  
  // apiClient.getBookings returns the data array directly
  return response;
}