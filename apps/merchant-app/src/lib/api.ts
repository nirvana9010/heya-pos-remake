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

export async function merchantLogin(username: string, password: string): Promise<LoginResponse> {
  console.log('Calling API at:', `${API_URL}/auth/merchant/login`);
  
  try {
    const response = await fetch(`${API_URL}/auth/merchant/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    return response.json();
  } catch (error: any) {
    console.error('Login error:', error);
    if (error.message === 'Failed to fetch') {
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