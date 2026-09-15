import axios from 'axios';

const baseURL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;

const api = axios.create({ baseURL });

// Attach the JWT to every request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('syncspace_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// A 401 anywhere means the session is gone — clear it and send the user to sign in.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !location.pathname.startsWith('/login')) {
      localStorage.removeItem('syncspace_token');
      localStorage.removeItem('syncspace_user');
      location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const apiError = (err) => err?.response?.data?.message || err?.message || 'Something went wrong';

export default api;
