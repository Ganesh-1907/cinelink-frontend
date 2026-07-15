/**
 * CineLink API Service
 *
 * Centralized API client for the CineLink backend server.
 * All API calls go through this module so the base URL and auth token
 * are handled consistently.
 *
 * USAGE:
 *   import api from '../src/api/client';
 *   const result = await api.post('/payments/create-order', { amount: 299 });
 */

import auth from '@react-native-firebase/auth';

// ── Configuration ────────────────────────────────────────────────────────────
// Change this to your deployed server URL in production.
// For local dev, use your machine's local IP so the phone/emulator can reach it.
//   Android emulator → 10.0.2.2
//   iOS simulator    → localhost
//   Physical device  → your-machine-ip
const API_BASE_URL = __DEV__
  ? 'http://localhost:3001/api'   // Use `adb reverse tcp:3001 tcp:3001` for USB devices
  : 'https://cinelink-api.onrender.com/api'; // Production

// Set this override if you need a specific URL (e.g., iOS simulator)
// export const API_BASE_URL = 'http://localhost:3001/api';

// ── Types ────────────────────────────────────────────────────────────────────

interface ApiResponse<T = any> {
  success?: boolean;
  error?: string;
  [key: string]: any;
}

interface RequestOptions {
  headers?: Record<string, string>;
  skipAuth?: boolean;
}

// ── Core Request Function ────────────────────────────────────────────────────

async function request<T = ApiResponse>(
  method: string,
  path: string,
  body?: any,
  options?: RequestOptions,
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options?.headers,
  };

  // Attach Firebase auth token (unless skipAuth is set)
  if (!options?.skipAuth) {
    try {
      const user = auth().currentUser;
      if (user) {
        const token = await user.getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
      }
    } catch (err) {
      console.warn('[API] Failed to get auth token:', err);
    }
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    // Handle raw responses (204 No Content, etc.)
    if (response.status === 204) {
      return {} as T;
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || `API Error ${response.status}`);
    }

    return data as T;
  } catch (error: any) {
    // Network errors or API errors
    if (error.message?.includes('Network request failed')) {
      throw new Error('Network error: Unable to connect to server. Check your internet connection.');
    }
    throw error;
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

const api = {
  get: <T = ApiResponse>(path: string, options?: RequestOptions) =>
    request<T>('GET', path, undefined, options),

  post: <T = ApiResponse>(path: string, body?: any, options?: RequestOptions) =>
    request<T>('POST', path, body, options),

  put: <T = ApiResponse>(path: string, body?: any, options?: RequestOptions) =>
    request<T>('PUT', path, body, options),

  patch: <T = ApiResponse>(path: string, body?: any, options?: RequestOptions) =>
    request<T>('PATCH', path, body, options),

  delete: <T = ApiResponse>(path: string, options?: RequestOptions) =>
    request<T>('DELETE', path, undefined, options),
};

export default api;

// ── Export base URL for direct use if needed ──
export { API_BASE_URL };
