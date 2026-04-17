// src/hooks/useApiBaseUrl.ts
import { useEffect, useState, useRef } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LOCAL_DEV_IP, DEV_PORT, PROD_BASE, DEV_BASE } from "../config";

const CACHE_KEY = "orval_api_baseurl_cache_v1";
const TIMEOUT_MS = 1500;

async function fetchWithTimeout(url: string, timeout = TIMEOUT_MS) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return res;
  } finally {
    clearTimeout(id);
  }
}

type UseApiResult = {
  baseUrl: string | null;
  loading: boolean;
  error: string | null;
  clearCache: () => Promise<void>;
  forceBaseUrl: (url: string) => Promise<void>;
};

export function useApiBaseUrl({
  overrideCandidates,
  pingPath = "/api/places",
}: {
  overrideCandidates?: string[];
  pingPath?: string;
} = {}): UseApiResult {
  const [baseUrl, setBaseUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    (async () => {
      setLoading(true);
      setError(null);

      // 🚀 MODE PRODUCTION (Release APK)
      // Si on n'est PAS en mode __DEV__, on utilise TOUJOURS la PROD sans scanner le réseau local.
      if (!__DEV__) {
        console.log("🚀 PRODUCTION : Utilisation de " + PROD_BASE);
        setBaseUrl(PROD_BASE);
        setLoading(false);
        return;
      }

      // 🛠️ MODE DÉVELOPPEMENT (Local)
      console.log("🛠️ DÉVELOPPEMENT : Tentative de connexion locale à " + DEV_BASE);

      try {
        const pingUrl = DEV_BASE.replace(/\/$/, "") + (pingPath.startsWith("/") ? "" : "/") + pingPath;
        const res = await fetchWithTimeout(pingUrl, 2000);
        if (res && res.ok) {
          setBaseUrl(DEV_BASE);
          setLoading(false);
          return;
        }
      } catch (e) {
        console.warn("❌ Échec de connexion locale à " + DEV_BASE);
      }

      // Fallback sur d'autres IPs locales possibles si DEV_BASE échoue
      const candidates: string[] = [];
      if (Platform.OS === "android") {
        candidates.push(`http://10.0.2.2:${DEV_PORT}`);
      } else {
        candidates.push(`http://localhost:${DEV_PORT}`);
      }
      if (LOCAL_DEV_IP) candidates.push(`http://${LOCAL_DEV_IP}:${DEV_PORT}`);

      let found: string | null = null;
      for (const c of candidates) {
        try {
          const url = c.replace(/\/$/, "") + (pingPath.startsWith("/") ? "" : "/") + pingPath;
          const res = await fetchWithTimeout(url, TIMEOUT_MS);
          if (res && res.ok) {
            found = c;
            break;
          }
        } catch (e) {}
      }

      if (mounted.current) {
        // En mode DEV, si on ne trouve rien localement, on peut quand même tenter la PROD
        setBaseUrl(found || PROD_BASE);
        setLoading(false);
      }
    })();

    return () => { mounted.current = false; };
  }, [overrideCandidates, pingPath]);

  const clearCache = async () => {
    try {
      await AsyncStorage.removeItem(CACHE_KEY);
      setBaseUrl(null);
    } catch (e) {}
  };

  const forceBaseUrl = async (url: string) => {
    try {
      const pingUrl = url.replace(/\/$/, "") + "/api/places";
      const r = await fetchWithTimeout(pingUrl, TIMEOUT_MS);
      if (r && r.ok) {
        await AsyncStorage.setItem(CACHE_KEY, url);
        setBaseUrl(url);
        setError(null);
      } else {
        setError("L'URL fournie n'a pas répondu.");
      }
    } catch (e) {
      setError("Erreur lors du test de l'URL.");
    }
  };

  return { baseUrl, loading, error, clearCache, forceBaseUrl };
}
