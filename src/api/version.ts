// src/api/version.ts

export interface VersionInfo {
  android: {
    latestVersion: string;
    minimumVersion: string;
  };
}

export async function fetchVersionInfo(baseUrl: string): Promise<VersionInfo> {
  // Cet appel est public, pas besoin de token d'authentification
  const response = await fetch(`${baseUrl}/api/version`);
  if (!response.ok) {
    throw new Error("Impossible de récupérer les informations de version.");
  }
  return response.json();
}
