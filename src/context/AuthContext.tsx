import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";

type AuthContextType = {
  token: string | null;
  roles: string[];
  username: string | null;
  isLoading: boolean;
  isGuest: boolean;
  isLoginVisible: boolean; // Nouvel état pour gérer l'affichage de l'écran Login
  showLogin: () => void;
  hideLogin: () => void;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
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
  isGuest: true,
  isLoginVisible: false,
  showLogin: () => {},
  hideLogin: () => {},
  login: async () => {},
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [username, setUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(true); // Par défaut, on est invité
  const [isLoginVisible, setIsLoginVisible] = useState(false); // Par défaut, on cache le login

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem("jwtToken");
        if (stored) {
          const isValid = checkTokenValidity(stored);
          if (isValid) {
            applyToken(stored);
          } else {
            console.log("Token expiré ou invalide au démarrage");
            await AsyncStorage.removeItem("jwtToken");
            setIsGuest(true);
          }
        } else {
          setIsGuest(true); // Pas de token = Invité direct
        }
      } catch (e) {
        console.warn("Erreur lecture token au démarrage", e);
        setIsGuest(true);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const checkTokenValidity = (jwt: string): boolean => {
    try {
      const decoded = jwtDecode<JwtPayload>(jwt);
      if (decoded.exp && decoded.exp * 1000 < Date.now()) {
        return false;
      }
      return true;
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
      setIsGuest(false); // Connecté => plus invité
      setIsLoginVisible(false); // On ferme l'écran de login si ouvert
    } catch (e) {
      console.warn("JWT invalide lors de l'application", e);
      logout();
    }
  };

  const login = async (jwt: string) => {
    await AsyncStorage.setItem("jwtToken", jwt);
    applyToken(jwt);
  };

  const logout = async () => {
    await AsyncStorage.removeItem("jwtToken");
    setToken(null);
    setRoles([]);
    setUsername(null);
    setIsGuest(true); // Retour en mode invité
    setIsLoginVisible(false);
  };

  const showLogin = () => setIsLoginVisible(true);
  const hideLogin = () => setIsLoginVisible(false);

  return (
    <AuthContext.Provider value={{
      token, roles, username, isLoading, isGuest, isLoginVisible,
      login, logout, showLogin, hideLogin
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
