import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";

type AuthContextType = {
  token: string | null;
  roles: string[];
  username: string | null;
  isLoading: boolean;
  isGuest: boolean; // Ajout du mode invité
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  loginAsGuest: () => void; // Ajout de la fonction pour le mode invité
};

type JwtPayload = {
  sub: string;
  roles?: string[] | { authority: string }[];
  exp?: number;
};

const AuthContext = createContext<AuthContextType>({
  token: null,
  roles: [],
  username: null,
  isLoading: true,
  isGuest: false,
  login: async () => {},
  logout: async () => {},
  loginAsGuest: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [username, setUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false); // État pour le mode invité

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem("jwtToken");
        if (stored) {
          const isValid = checkTokenValidity(stored);
          if (isValid) {
            applyToken(stored);
          } else {
            await AsyncStorage.removeItem("jwtToken");
          }
        }
      } catch (e) {
        console.warn("Erreur lecture token au démarrage", e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const checkTokenValidity = (jwt: string): boolean => {
    try {
      const decoded = jwtDecode<JwtPayload>(jwt);
      return !(decoded.exp && decoded.exp * 1000 < Date.now());
    } catch (e) {
      return false;
    }
  };

  const applyToken = (jwt: string) => {
    try {
      const decoded = jwtDecode<JwtPayload>(jwt);
      let userRoles: string[] = [];
      if (decoded.roles) {
        if (typeof decoded.roles[0] === 'string') {
          userRoles = decoded.roles as string[];
        } else if (typeof decoded.roles[0] === 'object' && 'authority' in decoded.roles[0]) {
          userRoles = (decoded.roles as { authority: string }[]).map(r => r.authority);
        }
      }
      setToken(jwt);
      setRoles(userRoles);
      setUsername(decoded.sub);
      setIsGuest(false); // On n'est plus un invité si on a un token
    } catch (e) {
      console.warn("JWT invalide lors de l'application", e);
      logout();
    }
  };

  const login = async (jwt: string) => {
    await AsyncStorage.setItem("jwtToken", jwt);
    applyToken(jwt);
  };

  // La déconnexion réinitialise tout, y compris le mode invité
  const logout = async () => {
    await AsyncStorage.removeItem("jwtToken");
    setToken(null);
    setRoles([]);
    setUsername(null);
    setIsGuest(false);
  };

  // Active le mode invité
  const loginAsGuest = () => {
    setIsGuest(true);
  };

  return (
    <AuthContext.Provider value={{ token, roles, username, isLoading, isGuest, login, logout, loginAsGuest }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
