const API_BASE_URL = __DEV__
  ? 'http://localhost:3001/api'
  : 'https://cinelink-api.onrender.com/api';

let _jwtToken: string | null = null;

export function setJwtToken(token: string | null) { _jwtToken = token; }
export function getJwtToken(): string | null { return _jwtToken; }

async function request<T = any>(method: string, path: string, body?: any, skipAuth = false): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (!skipAuth && _jwtToken) headers['Authorization'] = `Bearer ${_jwtToken}`;

  try {
    const response = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
    if (response.status === 204) return {} as T;
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || `API Error ${response.status}`);
    return data as T;
  } catch (error: any) {
    if (error.message?.includes('Network request failed'))
      throw new Error('Network error: Unable to connect to server.');
    throw error;
  }
}

const api = {
  get: <T = any>(path: string, skipAuth = false) => request<T>('GET', path, undefined, skipAuth),
  post: <T = any>(path: string, body?: any, skipAuth = false) => request<T>('POST', path, body, skipAuth),
  put: <T = any>(path: string, body?: any) => request<T>('PUT', path, body),
  patch: <T = any>(path: string, body?: any) => request<T>('PATCH', path, body),
  delete: <T = any>(path: string) => request<T>('DELETE', path),
};

export default api;
