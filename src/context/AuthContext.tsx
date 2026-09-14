// src/context/AuthContext.tsx
import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import { setUnauthorizedHandler } from '../api/api';
import { fetchVisitedPlaces } from '../api/passport';
import { API_BASE_URL } from '../config';

interface User {
  sub: string;
  roles: string[];
  username: string;
  exp: number;
}

interface AuthContextType {
  user: User | null;
  roles: string[] | null;
  username: string | null;
  isGuest: boolean;
  isLoading: boolean;
  isLoginVisible: boolean;
  isLoginRequired: boolean;
  visitedPlaceIds: Set<number>;
  login: (token: string) => void;
  logout: () => void;
  finishAccountDeletion: () => Promise<void>;
  navigationVersion: number;
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
  const [isLoginRequired, setIsLoginRequired] = useState(false);
  const [visitedPlaceIds, setVisitedPlaceIds] = useState<Set<number>>(new Set());
  const [navigationVersion, setNavigationVersion] = useState(0);
  const sessionVersion = useRef(0);

  const finishAccountDeletion = async () => {
    // These are the only persisted account-related keys. Keep the device's language preference.
    await AsyncStorage.multiRemove(['jwtToken', 'orval_places_cache_v1', 'orval_places_cache_v2']);
    sessionVersion.current++;
    setUser(null);
    setVisitedPlaceIds(new Set());
    setIsLoginRequired(true);
    setIsLoginVisible(true);
    setNavigationVersion(version => version + 1);
  };

  const logout = async () => {
    await AsyncStorage.removeItem('jwtToken');
    sessionVersion.current++;
    setUser(null);
    setVisitedPlaceIds(new Set());
  };

  const requireLogin = async () => {
    await logout();
    setIsLoginRequired(true);
    setIsLoginVisible(true);
  };

  useEffect(() => {
    // Configurer le gestionnaire pour les erreurs 401
    setUnauthorizedHandler(requireLogin);

    const loadUserFromStorage = async () => {
      const token = await AsyncStorage.getItem('jwtToken');
      if (token) {
        try {
          const decodedUser: User = jwtDecode(token);
          // Vérifier si le token est expiré
          if (decodedUser.exp * 1000 < Date.now()) {
            await requireLogin();
          } else {
            setUser(decodedUser);
            await fetchAndSetVisitedPlaces();
          }
        } catch (e) {
          await requireLogin();
        }
      }
      setIsLoading(false);
    };
    loadUserFromStorage();
  }, []);

  const fetchAndSetVisitedPlaces = async () => {
    const version = sessionVersion.current;
    try {
      const visitsData = await fetchVisitedPlaces(API_BASE_URL);
      if (version === sessionVersion.current && visitsData && Array.isArray(visitsData.places)) {
        const ids = new Set(visitsData.places.map(place => place.id));
        setVisitedPlaceIds(ids);
      }
    } catch (error) {
      // L'erreur 401 sera déjà gérée par l'intercepteur, pas besoin de faire plus ici
    }
  };

  const login = async (token: string) => {
    const decodedUser: User = jwtDecode(token);
    if (!decodedUser.exp || decodedUser.exp * 1000 <= Date.now()) {
      throw new Error('Le jeton de connexion est invalide ou expiré.');
    }

    await AsyncStorage.setItem('jwtToken', token);
    setUser(decodedUser);
    setIsLoginRequired(false);
    setIsLoginVisible(false);
    await fetchAndSetVisitedPlaces();
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
      isLoginRequired,
      visitedPlaceIds,
      login,
      logout,
      finishAccountDeletion,
      navigationVersion,
      showLogin: () => {
        setIsLoginRequired(false);
        setIsLoginVisible(true);
      },
      hideLogin: () => {
        if (!isLoginRequired) setIsLoginVisible(false);
      },
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
