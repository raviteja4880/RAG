import axios from 'axios';

// Environment-aware API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const API_VERSION = '/api/v1';

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}${API_VERSION}`,
  withCredentials: true,
  timeout: 30000,
});

// Request Interceptor: Add Auth Tokens or Tracing IDs
apiClient.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Standardize Error Handling
apiClient.interceptors.response.use(
  (response) => {
    if (response.data && response.data.success === false) {
      return Promise.reject(response.data.error || 'Unknown Error');
    }
    return response;
  },
  (error) => {
    // Handle standard HTTP errors
    const message = error.response?.data?.message || error.message || 'API Connection Failed';
    
    // Add retry logic if needed for specific cases
    if (error.code === 'ECONNABORTED') {
      console.error('Request timed out');
    }

    return Promise.reject({
      message,
      status: error.response?.status,
      originalError: error
    });
  }
);

export default apiClient;
