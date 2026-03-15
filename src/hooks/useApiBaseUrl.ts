// src/hooks/useApiBaseUrl.ts
import { useEffect, useState, useRef } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LOCAL_DEV_IP, DEV_PORT, PROD_BASE } from "../config";

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

  // Effet principal
  useEffect(() => {
    mounted.current = true;
    (async () => {
      setLoading(true);
      setError(null);

      // 1) Try cached value first
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
          const pingUrl = cached.replace(/\/$/, "") + (pingPath.startsWith("/") ? "" : "/") + pingPath;
          try {
            const r = await fetchWithTimeout(pingUrl, TIMEOUT_MS);
            if (r && r.ok) {
              if (mounted.current) {
                setBaseUrl(cached);
                setLoading(false);
                return;
              }
            } else {
              // cached invalid -> continue to full detection
            }
          } catch (e) {
            // ignore and continue to detection
          }
        }
      } catch (e) {
        // reading cache failed -> continue
      }

      // 2) Build candidate list
      const candidates: string[] = [];
      if (overrideCandidates && overrideCandidates.length) {
        candidates.push(...overrideCandidates);
      }
      if (Platform.OS === "android") {
        candidates.push(`http://10.0.2.2:${DEV_PORT}`); // Android emulator (official)
        candidates.push(`http://10.0.3.2:${DEV_PORT}`); // Genymotion
      } else {
        candidates.push(`http://localhost:${DEV_PORT}`); // iOS simulator
      }
      if (LOCAL_DEV_IP) candidates.push(`http://${LOCAL_DEV_IP}:${DEV_PORT}`);
      candidates.push(PROD_BASE);

      // 3) Ping each candidate
      let found: string | null = null;
      for (const c of candidates) {
        try {
          const url = c.replace(/\/$/, "") + (pingPath.startsWith("/") ? "" : "/") + pingPath;
          const res = await fetchWithTimeout(url, TIMEOUT_MS);
          if (res && res.ok) {
            found = c;
            break;
          }
        } catch (e) {
          // ignore
        }
      }

      if (mounted.current) {
        if (found) {
          setBaseUrl(found);
          // cache it
          try {
            await AsyncStorage.setItem(CACHE_KEY, found);
          } catch (e) {
            // ignore cache write error
          }
          setLoading(false);
        } else {
          setError("Aucune URL backend détectée (ping failed)");
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted.current = false;
    };
  }, [overrideCandidates, pingPath]);

  // clear cache helper
  const clearCache = async () => {
    try {
      await AsyncStorage.removeItem(CACHE_KEY);
      setBaseUrl(null);
    } catch (e) {
      // ignore
    }
  };

  // force base url helper (useful from debug UI)
  const forceBaseUrl = async (url: string) => {
    try {
      // test provided url quickly
      const pingUrl = url.replace(/\/$/, "") + "/api/places";
      const r = await fetchWithTimeout(pingUrl, TIMEOUT_MS);
      if (r && r.ok) {
        await AsyncStorage.setItem(CACHE_KEY, url);
        setBaseUrl(url);
        setError(null);
      } else {
        setError("L'URL fournie n'a pas répondu correctement.");
      }
    } catch (e) {
      setError("Erreur lors du test de l'URL fournie.");
    }
  };

  return { baseUrl, loading, error, clearCache, forceBaseUrl };
}
