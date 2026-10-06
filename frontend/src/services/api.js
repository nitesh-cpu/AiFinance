import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Attach auth token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('spendsense_token') || sessionStorage.getItem('spendsense_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle auth errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('spendsense_token');
      localStorage.removeItem('spendsense_user');
      sessionStorage.removeItem('spendsense_token');
      sessionStorage.removeItem('spendsense_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
