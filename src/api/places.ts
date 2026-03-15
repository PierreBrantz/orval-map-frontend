// src/api/places.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Place } from "../types/Place";

const CACHE_KEY = "orval_places_cache_v1";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

type CachedPlaces = {
  timestamp: number;
  data: Place[];
};

// Structure de la réponse paginée de Spring Boot
type PagedResponse<T> = {
  content: T[];
  pageable: any;
  totalPages: number;
  totalElements: number;
  last: boolean;
  // ... autres champs
};

// 🛠️ Helper : ajoute automatiquement le header JWT
async function authorizedFetch(input: RequestInfo, init: RequestInit = {}) {
  const token = await AsyncStorage.getItem("jwtToken");

  const headers: HeadersInit = {
    ...(init.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  return fetch(input, { ...init, headers });
}

/**
 * Récupère la liste des lieux (avec cache local + JWT).
 * Supporte la pagination (page, size).
 */
export async function fetchPlaces(baseUrl: string, page = 0, size = 20): Promise<Place[]> {
  if (!baseUrl) throw new Error("fetchPlaces: baseUrl must be provided");

  // 1️⃣ Lire le cache (seulement pour la première page pour l'instant)
  // Si on demande une page spécifique > 0, on ignore le cache global
  if (page === 0) {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const parsed: CachedPlaces = JSON.parse(cached);
        const age = Date.now() - parsed.timestamp;

        if (age < CACHE_TTL_MS && parsed.data?.length) {
          console.log("🗂️ Données chargées depuis le cache");
          return parsed.data;
        }
      } catch (e) {
        console.warn("Erreur lecture cache", e);
      }
    }
  }

  // 2️⃣ Requête réseau
  try {
    console.log(`🌐 Requête API (authentifiée) pour les lieux (page=${page}, size=${size})…`);

    // Construction de l'URL avec les paramètres de pagination
    const url = `${baseUrl.replace(/\/$/, "")}/api/places?page=${page}&size=${size}`;

    const res = await authorizedFetch(url);
    if (!res.ok) throw new Error(`Erreur API: ${res.status}`);

    const responseJson: PagedResponse<Place> = await res.json();

    // ✅ Extraction des données depuis le champ "content"
    const data = responseJson.content || [];

    // 3️⃣ Cache (seulement la première page)
    if (page === 0) {
      await AsyncStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ timestamp: Date.now(), data })
      );
      console.log("✅ Données (page 0) sauvegardées dans le cache");
    }

    return data;
  } catch (error) {
    console.warn("⚠️ Erreur API:", error);

    // 4️⃣ Fallback sur cache (seulement si on demandait la page 0)
    if (page === 0) {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const parsed: CachedPlaces = JSON.parse(cached);
          if (parsed.data?.length) {
            console.log("📦 Utilisation du cache suite à une erreur réseau");
            return parsed.data;
          }
        } catch (e) {
          console.warn("Cache illisible après échec réseau", e);
        }
      }
    }

    throw new Error("Impossible de charger les lieux (réseau et cache indisponibles).");
  }
}

/** 🚀 Envoie une image au serveur et retourne son URL publique */
export async function uploadImage(baseUrl: string, placeId: number, localUri: string): Promise<string> {
  const endpoint = `${baseUrl}/api/places/${placeId}/upload-image`;

  const formData = new FormData();

  const filename = localUri.split('/').pop() || 'photo.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : `image`;

  formData.append('file', { uri: localUri, name: filename, type } as any);

  const res = await authorizedFetch(endpoint, {
    method: 'POST',
    body: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  if (!res.ok) {
    throw new Error(`Erreur lors de l'envoi de l'image: ${res.status}`);
  }

  const responseData = await res.json();
  if (!responseData.url) {
      throw new Error("L'URL de l'image n'a pas été retournée par le serveur.");
  }

  return responseData.url;
}


/** Ajoute un lieu */
export async function addPlace(baseUrl: string, place: Omit<Place, "id">): Promise<Place> {
  const res = await authorizedFetch(`${baseUrl}/api/places`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(place),
  });
  if (!res.ok) throw new Error(`Erreur ajout lieu: ${res.status}`);
  return res.json();
}

/** Met à jour un lieu */
export async function updatePlace(baseUrl: string, place: Place): Promise<Place> {
  const res = await authorizedFetch(`${baseUrl}/api/places/${place.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(place),
  });
  if (!res.ok) throw new Error(`Erreur maj lieu: ${res.status}`);
  return res.json();
}

/** Supprime un lieu */
export async function deletePlace(baseUrl: string, id: number): Promise<void> {
  const res = await authorizedFetch(`${baseUrl}/api/places/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Erreur suppression lieu: ${res.status}`);
}

/** Vide le cache manuellement */
export async function clearPlacesCache(): Promise<void> {
  await AsyncStorage.removeItem(CACHE_KEY);
}
