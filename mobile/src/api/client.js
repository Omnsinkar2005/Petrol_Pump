import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../config';

/**
 * Single axios instance used by every screen.
 * - Prepends API_URL
 * - Auto-attaches the JWT if stored
 * - On 401 response, triggers a global "logout" handler (wired in AuthContext)
 */
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token on every request if present
api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    /* ignore */
  }
  return config;
});

// Handle global auth failures
let onUnauthorized = null;
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof onUnauthorized === 'function') {
      onUnauthorized();
    }
    return Promise.reject(err);
  }
);

export default api;
