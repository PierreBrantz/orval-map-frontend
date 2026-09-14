// src/api/version.ts
import { API_BASE_URL } from '../config';

export interface VersionInfo {
  android: {
    latestVersion: string;
    minimumVersion: string;
  };
}

export async function fetchVersionInfo(): Promise<VersionInfo> {
  // Cet appel est public, pas besoin de authenticatedFetch
  const response = await fetch(`${API_BASE_URL}/api/version`);
  if (!response.ok) {
    throw new Error("Impossible de récupérer les informations de version.");
  }
  return response.json();
}
