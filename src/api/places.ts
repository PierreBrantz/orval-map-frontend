// src/api/places.ts
import { authenticatedFetch, authenticatedFetchMultipart } from './api';
import { Place, PlaceRequest } from "../types/Place";
import AsyncStorage from "@react-native-async-storage/async-storage";

// v2 only contains complete results; v1 could contain just the first 20 places.
const CACHE_KEY = "orval_places_cache_v2";
const CACHE_TTL_MS = 5 * 60 * 1000;
const PAGE_SIZE = 100;

type CachedPlaces = {
  timestamp: number;
  data: Place[];
};

type PagedResponse<T> = {
  content: T[];
  last?: boolean;
  totalPages?: number;
};

export async function fetchPlaces(baseUrl: string, placeType: 'BAR' | 'RESTAURANT' | 'BREWERY' | null = null): Promise<Place[]> {
  if (!placeType) {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed: CachedPlaces = JSON.parse(cached);
        if (Array.isArray(parsed.data) && Date.now() - parsed.timestamp < CACHE_TTL_MS) return parsed.data;
      }
    } catch {
      // A missing or corrupt cache must not prevent a fresh download.
    }
  }

  const places = new Map<number, Place>();
  for (let page = 0; ; page++) {
    let endpoint = `/api/places?page=${page}&size=${PAGE_SIZE}&sort=id,asc`;
    if (placeType) endpoint += `&placeType=${placeType}`;
    const res = await authenticatedFetch(endpoint);
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    const response: PagedResponse<Place> = await res.json();
    if (!Array.isArray(response.content)) throw new Error('Invalid places response');
    if (response.content.length === 0) break;

    const previousCount = places.size;
    for (const place of response.content) places.set(place.id, place);
    if (places.size === previousCount) throw new Error('Places pagination did not advance');
    if (response.last === true || (typeof response.totalPages === 'number' && page + 1 >= response.totalPages)) break;
    // Without pagination metadata, continue until an empty page. The server may
    // cap its page size below PAGE_SIZE, so a short page is not necessarily last.
  }

  const data = [...places.values()];
  if (!placeType) {
    try {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data }));
    } catch {
      // The complete result remains usable even if local storage is full.
    }
  }
  return data;
}

export async function visitPlace(baseUrl: string, placeId: number, coords: { lat: number; lng: number }): Promise<any> {
  const res = await authenticatedFetch(`/api/places/${placeId}/visit`, {
    method: "POST",
    body: JSON.stringify(coords),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Une erreur est survenue lors de la visite.");
  }
  return res.json();
}

export async function unvisitPlace(baseUrl: string, placeId: number): Promise<void> {
  const res = await authenticatedFetch(`/api/places/${placeId}/visit`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Erreur de suppression de visite: ${res.status} - ${errorBody}`);
  }
}

export async function uploadPlaceImage(baseUrl: string, placeId: number, localUri: string): Promise<string> {
  const formData = new FormData();
  const filename = localUri.split('/').pop() || 'photo.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : `image`;
  formData.append('file', { uri: localUri, name: filename, type } as any);

  const res = await authenticatedFetchMultipart(`/api/places/${placeId}/upload-image`, { method: 'POST', body: formData });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Upload Error: ${res.status} - ${errorBody}`);
  }
  const responseData = await res.json();
  return responseData.url;
}

export async function uploadRequestImage(baseUrl: string, localUri: string): Promise<string> {
  const formData = new FormData();
  const filename = localUri.split('/').pop() || 'photo.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : `image`;
  formData.append('file', { uri: localUri, name: filename, type } as any);

  const res = await authenticatedFetchMultipart('/api/place-requests/upload-image', { method: 'POST', body: formData });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Upload Request Image Error: ${res.status} - ${errorBody}`);
  }
  const responseData = await res.json();
  return responseData.url;
}

export async function suggestPlace(baseUrl: string, request: Omit<PlaceRequest, 'status'>): Promise<PlaceRequest> {
  const res = await authenticatedFetch('/api/place-requests', {
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
  const res = await authenticatedFetch('/api/place-requests/pending');
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Erreur admin: ${res.status} - ${errorBody}`);
  }
  return res.json();
}

export async function validatePlaceRequest(baseUrl: string, id: number, approve: boolean): Promise<void> {
  const res = await authenticatedFetch(`/api/place-requests/${id}/validate?approve=${approve}`, {
    method: "POST",
  });
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Erreur validation: ${res.status} - ${errorBody}`);
  }
}

export async function updatePlace(baseUrl: string, place: Place): Promise<Place> {
  const res = await authenticatedFetch(`/api/places/${place.id}`, {
    method: "PUT",
    body: JSON.stringify(place),
  });
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Update Error: ${res.status} - ${errorBody}`);
  }
  return res.json();
}

export async function deletePlace(baseUrl: string, placeId: number): Promise<void> {
  const res = await authenticatedFetch(`/api/places/${placeId}`, {
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
