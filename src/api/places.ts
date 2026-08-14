// src/api/places.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Place, PlaceRequest } from "../types/Place";

const CACHE_KEY = "orval_places_cache_v1";
const CACHE_TTL_MS = 5 * 60 * 1000;

type CachedPlaces = {
  timestamp: number;
  data: Place[];
};

type PagedResponse<T> = {
  content: T[];
  totalPages: number;
  totalElements: number;
  last: boolean;
};

// Helper pour les requêtes JSON
async function authorizedFetch(input: RequestInfo, init: RequestInit = {}) {
  const token = await AsyncStorage.getItem("jwtToken");
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(init.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  return fetch(input, { ...init, headers });
}

// NOUVEAU helper pour les requêtes de fichiers (multipart/form-data)
async function authorizedFetchMultipart(input: RequestInfo, init: RequestInit = {}) {
  const token = await AsyncStorage.getItem("jwtToken");
  const headers: HeadersInit = {
    ...(init.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  return fetch(input, { ...init, headers });
}

export async function fetchPlaces(baseUrl: string, placeType: 'BAR' | 'RESTAURANT' | 'BREWERY' | null = null, page = 0, size = 20): Promise<Place[]> {
  if (!baseUrl) throw new Error("baseUrl required");

  let url = `${baseUrl.replace(/\/$/, "")}/api/places?page=${page}&size=${size}`;
  if (placeType) {
    url += `&placeType=${placeType}`;
  }

  if (page === 0 && !placeType) {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed: CachedPlaces = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < CACHE_TTL_MS) return parsed.data;
    }
  }

  const res = await authorizedFetch(url);
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  const responseJson: PagedResponse<Place> = await res.json();
  const data = responseJson.content || [];

  if (page === 0 && !placeType) {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data }));
  }
  return data;
}

// --- PASSPORT API ---

export async function visitPlace(baseUrl: string, placeId: number, coords: { lat: number; lng: number }): Promise<any> {
  const body = JSON.stringify(coords);
  console.log(`[DEBUG] Sending visit request for place ${placeId} with body:`, body); // <-- LOG DE DÉBOGAGE

  const res = await authorizedFetch(`${baseUrl}/api/places/${placeId}/visit`, {
    method: "POST",
    body: body,
  });
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Erreur de visite: ${res.status} - ${errorBody}`);
  }
  return res.json();
}

export async function unvisitPlace(baseUrl: string, placeId: number): Promise<void> {
  const res = await authorizedFetch(`${baseUrl}/api/places/${placeId}/visit`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Erreur de suppression de visite: ${res.status} - ${errorBody}`);
  }
}

// --- END PASSPORT API ---

export async function uploadPlaceImage(baseUrl: string, placeId: number, localUri: string): Promise<string> {
  const endpoint = `${baseUrl}/api/places/${placeId}/upload-image`;
  const formData = new FormData();
  const filename = localUri.split('/').pop() || 'photo.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : `image`;
  formData.append('file', { uri: localUri, name: filename, type } as any);

  const res = await authorizedFetchMultipart(endpoint, { method: 'POST', body: formData });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Upload Error: ${res.status} - ${errorBody}`);
  }
  const responseData = await res.json();
  if (!responseData.url) {
      throw new Error("L'URL de l'image n'a pas été retournée par le serveur.");
  }
  return responseData.url;
}

export async function uploadRequestImage(baseUrl: string, localUri: string): Promise<string> {
  const endpoint = `${baseUrl}/api/place-requests/upload-image`;
  const formData = new FormData();
  const filename = localUri.split('/').pop() || 'photo.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : `image`;
  formData.append('file', { uri: localUri, name: filename, type } as any);

  const res = await authorizedFetchMultipart(endpoint, { method: 'POST', body: formData });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Upload Request Image Error: ${res.status} - ${errorBody}`);
  }
  const responseData = await res.json();
  if (!responseData.url) {
      throw new Error("L'URL de l'image n'a pas été retournée par le serveur.");
  }
  return responseData.url;
}


export async function suggestPlace(baseUrl: string, request: Omit<PlaceRequest, 'status'>): Promise<PlaceRequest> {
  const res = await authorizedFetch(`${baseUrl}/api/place-requests`, {
    method: "POST",
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Erreur suggestion: ${res.status} - ${errorBody}`);
  }
  return res.json();
}

export async function fetchPlaceRequests(baseUrl: string): Promise<PlaceRequest[]> {
  const res = await authorizedFetch(`${baseUrl}/api/place-requests/pending`);
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Erreur admin: ${res.status} - ${errorBody}`);
  }
  return res.json();
}

export async function validatePlaceRequest(baseUrl: string, id: number, approve: boolean): Promise<void> {
  const res = await authorizedFetch(`${baseUrl}/api/place-requests/${id}/validate?approve=${approve}`, {
    method: "POST",
  });
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Erreur validation: ${res.status} - ${errorBody}`);
  }
}

export async function updatePlace(baseUrl: string, place: Place): Promise<Place> {
  const res = await authorizedFetch(`${baseUrl}/api/places/${place.id}`, {
    method: "PUT",
    body: JSON.stringify(place),
  });
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Update Error: ${res.status} - ${errorBody}`);
  }
  return res.json();
}

export async function addPlace(baseUrl: string, place: Omit<Place, "id">): Promise<Place> {
  const res = await authorizedFetch(`${baseUrl}/api/places`, {
    method: "POST",
    body: JSON.stringify(place),
  });
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Add Error: ${res.status} - ${errorBody}`);
  }
  return res.json();
}

export async function deletePlace(baseUrl: string, placeId: number): Promise<void> {
  const res = await authorizedFetch(`${baseUrl}/api/places/${placeId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Delete Error: ${res.status} - ${errorBody}`);
  }
}

export async function clearPlacesCache(): Promise<void> {
  await AsyncStorage.removeItem(CACHE_KEY);
}
