// src/api/passport.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Place } from "../types/Place";

async function authorizedFetch(input: RequestInfo, init: RequestInit = {}) {
  const token = await AsyncStorage.getItem("jwtToken");
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(init.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  return fetch(input, { ...init, headers });
}

export interface PassportData {
  visitedPlaces: number;
  visitedCities: number;
  suggestions: {
    total: number;
    approved: number;
    pending: number;
  };
  nextGoal: {
    name: string;
    current: number;
    target: number;
  };
  badges: {
    name: string;
    unlocked: boolean;
  }[];
}

export interface VisitedPlacesData {
  count: number;
  places: Place[]; // Correction: 'bars' -> 'places'
}

export async function fetchPassportData(baseUrl: string): Promise<PassportData> {
  const res = await authorizedFetch(`${baseUrl}/api/users/me/passport`);
  if (!res.ok) {
    throw new Error("Impossible de récupérer les données du passeport.");
  }
  return res.json();
}

export async function fetchVisitedPlaces(baseUrl: string): Promise<VisitedPlacesData> {
  const res = await authorizedFetch(`${baseUrl}/api/users/me/visits`);
  if (!res.ok) {
    throw new Error("Impossible de récupérer la liste des lieux visités.");
  }
  return res.json();
}
