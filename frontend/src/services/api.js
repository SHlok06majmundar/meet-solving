import { useCallback } from 'react';
import { useAuth } from '@clerk/react';

export const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '').replace(/\/api$/, '');

export function useApi() {
  const { getToken } = useAuth();
  return useCallback(async (path, options = {}) => {
    const token = await getToken();
    if (!token) throw new Error('Sign in to continue.');
    const url = path.startsWith('http') ? new URL(path) : new URL(path, `${API_BASE_URL}/`);
    if (url.origin !== new URL(API_BASE_URL).origin) throw new Error('Invalid API origin');
    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${token}`);
    return fetch(url, { ...options, headers, signal: options.signal || AbortSignal.timeout(35000) });
  }, [getToken]);
}

export async function readResponse(response) {
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'The request failed. Please try again.');
  return data;
}
