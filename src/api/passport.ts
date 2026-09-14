// src/api/passport.ts
import { authenticatedFetch } from './api';
import { Place } from "../types/Place";

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
  places: Place[];
}

export async function fetchPassportData(baseUrl: string): Promise<PassportData> {
  const res = await authenticatedFetch('/api/users/me/passport');
  if (!res.ok) {
    throw new Error("Impossible de récupérer les données du passeport.");
  }
  return res.json();
}

export async function fetchVisitedPlaces(baseUrl: string): Promise<VisitedPlacesData> {
  const res = await authenticatedFetch('/api/users/me/visits');
  if (!res.ok) {
    throw new Error("Impossible de récupérer la liste des lieux visités.");
  }
  return res.json();
}
