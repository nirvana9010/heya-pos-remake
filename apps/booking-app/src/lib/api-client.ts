interface ApiConfig {
  baseURL: string;
  timeout?: number;
}

interface ApiResponse<T = any> {
  data: T;
  message?: string;
  error?: string;
}

class ApiClient {
  private config: ApiConfig;
  private merchantSubdomain: string | null = null;

  constructor(config: ApiConfig) {
    this.config = {
      timeout: 30000,
      ...config,
    };
  }

  setMerchantSubdomain(subdomain: string) {
    this.merchantSubdomain = subdomain;
  }

  private addVersionPrefix(endpoint: string): string {
    // Don't add version if already present or if it's an external URL
    if (endpoint.startsWith('/v1/') || endpoint.startsWith('/v2/') || endpoint.startsWith('http')) {
      return endpoint;
    }
    // Add v1 as default version (including public endpoints)
    return `/v1${endpoint}`;
  }

  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const versionedEndpoint = this.addVersionPrefix(endpoint);
    let url = `${this.config.baseURL}${versionedEndpoint}`;
    
    // Check if this is a public endpoint that requires merchant subdomain
    const isPublicEndpoint = endpoint.includes('/public/');
    if (isPublicEndpoint && !this.merchantSubdomain) {
      throw new Error('Merchant subdomain is required');
    }
    
    // Add merchant subdomain as query parameter if set
    if (this.merchantSubdomain) {
      const separator = url.includes('?') ? '&' : '?';
      url += `${separator}subdomain=${this.merchantSubdomain}`;
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout!);

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
      };
      
      // Also add merchant subdomain as header
      if (this.merchantSubdomain) {
        headers['X-Merchant-Subdomain'] = this.merchantSubdomain;
      }
      
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          message: `HTTP ${response.status}: ${response.statusText}`,
        }));
        throw new Error(error.message || error.error || 'Request failed');
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  }

  async get<T = any>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const queryString = params
      ? '?' + new URLSearchParams(params).toString()
      : '';
    
    return this.request<T>(`${endpoint}${queryString}`, {
      method: 'GET',
    });
  }

  async post<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T = any>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }
}

// Dynamic API URL that works with both localhost and external IPs
const getApiBaseUrl = () => {
  const normalize = (value: string) => value.replace(/\/$/, '');
  const envValue = process.env.NEXT_PUBLIC_API_URL;
  
  if (envValue) {
    const normalized = normalize(envValue);
    
    if (typeof window !== 'undefined') {
      const shouldFallbackToOrigin =
        normalized === '/api' ||
        normalized === 'api' ||
        normalized.startsWith('/api') ||
        /\/\/(localhost|127\.0\.0\.1)(:\d+)?\b/.test(normalized);
      
      if (shouldFallbackToOrigin) {
        return `${window.location.origin}/api`;
      }
      
      if (!normalized.startsWith('http')) {
        return `${window.location.origin}${normalized.startsWith('/') ? normalized : `/${normalized}`}`;
      }
    }
    
    return normalized;
  }
  
  // For server-side rendering, use localhost
  if (typeof window === 'undefined') {
    return 'http://localhost:3000/api';
  }
  
  // For client-side, use the same host as the current page
  return `${window.location.origin}/api`;
};

// Create the API client instance
const apiClient = new ApiClient({
  baseURL: getApiBaseUrl(),
});

export default apiClient;
