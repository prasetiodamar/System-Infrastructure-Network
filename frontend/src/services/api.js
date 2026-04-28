import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost/infrastructure-network/backend/public/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Always set Accept header for API requests
  config.headers['Accept'] = 'application/json';

  // Only set Content-Type if not already set (e.g., FormData)
  if (!config.headers['Content-Type'] && !(config.data instanceof FormData)) {
    config.headers['Content-Type'] = 'application/json';
  }

  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 302 redirect - convert to proper error
    if (error.response?.status === 302) {
      error.response.status = 401;
      error.response.data = { message: 'Session expired. Please login again.' };
    }
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
