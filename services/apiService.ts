import { Platform } from 'react-native';

// Use the remote production server API URL.
export const API_BASE_URL = 'https://floodleveliot-be.onrender.com/api';

class ApiService {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  getToken() {
    return this.token;
  }

  async fetch(endpoint: string, options: RequestInit = {}) {
    const headers = new Headers(options.headers || {});
    
    // Always attach token if exists
    if (this.token) {
      headers.set('Authorization', `Bearer ${this.token}`);
    }
    
    // Ensure content type json is set for requests unless omitted explicitly
    if (!headers.has('Content-Type') && options.method !== 'GET') {
      headers.set('Content-Type', 'application/json');
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    const url = `${API_BASE_URL}${endpoint}`;
    
    try {
      const response = await fetch(url, config);
      
      // Parse JSON
      const isJson = response.headers.get('content-type')?.includes('application/json');
      const data = isJson ? await response.json() : await response.text();

      if (!response.ok) {
        // Build an error object containing the response data
        let errorMessage = response.statusText;
        
        if (data) {
          if (typeof data === 'string') {
            errorMessage = data;
          } else if (data.message) {
            errorMessage = data.message;
          } else if (data.title) {
            errorMessage = data.title;
          }
        }
        
        const error = new Error(errorMessage);
        (error as any).response = response;
        (error as any).data = data;
        throw error;
      }

      return data;
    } catch (error) {
      console.error(`[API Error] ${options.method || 'GET'} ${url}`, error);
      throw error;
    }
  }

  // GET helper
  get(endpoint: string) {
    return this.fetch(endpoint, { method: 'GET' });
  }

  // POST helper
  post(endpoint: string, body?: any) {
    return this.fetch(endpoint, { 
      method: 'POST', 
      body: body ? JSON.stringify(body) : undefined 
    });
  }

  // PUT helper
  put(endpoint: string, body?: any) {
    return this.fetch(endpoint, { 
      method: 'PUT', 
      body: body ? JSON.stringify(body) : undefined 
    });
  }

  // DELETE helper
  delete(endpoint: string) {
    return this.fetch(endpoint, { method: 'DELETE' });
  }
}

export const apiService = new ApiService();
export default apiService;
