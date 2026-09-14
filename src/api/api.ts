// src/api/api.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';

let onUnauthorized: (() => void | Promise<void>) | null = null;

export function setUnauthorizedHandler(handler: () => void | Promise<void>) {
  onUnauthorized = handler;
}

export async function authenticatedFetch(endpoint: string, options: RequestInit = {}) {
  const token = await AsyncStorage.getItem('jwtToken');

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (response.status === 401) {
    if (onUnauthorized) {
      await onUnauthorized();
    }
    throw new Error('SESSION_EXPIRED');
  }

  return response;
}

export async function authenticatedFetchMultipart(endpoint: string, options: RequestInit = {}) {
  const token = await AsyncStorage.getItem('jwtToken');

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (response.status === 401) {
    if (onUnauthorized) {
      await onUnauthorized();
    }
    throw new Error('SESSION_EXPIRED');
  }

  return response;
}
