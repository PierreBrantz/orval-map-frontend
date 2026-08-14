// src/context/AuthContext.tsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import { API_BASE_URL } from '../config';
import { fetchVisitedPlaces } from '../api/passport';

interface User {
  sub: string;
  roles: string[];
  username: string;
}

interface AuthContextType {
  user: User | null;
  roles: string[] | null;
  username: string | null;
  isGuest: boolean;
  isLoading: boolean;
  isLoginVisible: boolean;
  visitedPlaceIds: Set<number>; // Ensemble des IDs des lieux visités
  login: (token: string) => void;
  logout: () => void;
  showLogin: () => void;
  hideLogin: () => void;
  addVisitedPlace: (placeId: number) => void;
  removeVisitedPlace: (placeId: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoginVisible, setIsLoginVisible] = useState(false);
  const [visitedPlaceIds, setVisitedPlaceIds] = useState<Set<number>>(new Set());

  const fetchAndSetVisitedPlaces = async () => {
    try {
      const visitsData = await fetchVisitedPlaces(API_BASE_URL);
      // Correction: Utiliser 'places' au lieu de 'bars'
      if (visitsData && Array.isArray(visitsData.places)) {
        const ids = new Set(visitsData.places.map(place => place.id));
        setVisitedPlaceIds(ids);
      } else {
        console.warn("La réponse de l'API des lieux visités n'a pas le format attendu.", visitsData);
      }
    } catch (error) {
      console.error("Failed to fetch visited places on login:", error);
    }
  };

  useEffect(() => {
    const loadUserFromStorage = async () => {
      const token = await AsyncStorage.getItem('jwtToken');
      if (token) {
        const decodedUser: User = jwtDecode(token);
        setUser(decodedUser);
        await fetchAndSetVisitedPlaces(); // Charger les visites après avoir chargé l'utilisateur
      }
      setIsLoading(false);
    };
    loadUserFromStorage();
  }, []);

  const login = async (token: string) => {
    await AsyncStorage.setItem('jwtToken', token);
    const decodedUser: User = jwtDecode(token);
    setUser(decodedUser);
    setIsLoginVisible(false);
    await fetchAndSetVisitedPlaces(); // Recharger les visites après une nouvelle connexion
  };

  const logout = async () => {
    await AsyncStorage.removeItem('jwtToken');
    setUser(null);
    setVisitedPlaceIds(new Set()); // Vider les visites à la déconnexion
  };

  const addVisitedPlace = (placeId: number) => {
    setVisitedPlaceIds(prevIds => new Set(prevIds).add(placeId));
  };

  const removeVisitedPlace = (placeId: number) => {
    setVisitedPlaceIds(prevIds => {
      const newIds = new Set(prevIds);
      newIds.delete(placeId);
      return newIds;
    });
  };

  return (
    <AuthContext.Provider value={{
      user,
      roles: user?.roles || null,
      username: user?.username || null,
      isGuest: !user,
      isLoading,
      isLoginVisible,
      visitedPlaceIds,
      login,
      logout,
      showLogin: () => setIsLoginVisible(true),
      hideLogin: () => setIsLoginVisible(false),
      addVisitedPlace,
      removeVisitedPlace
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
