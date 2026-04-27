// src/hooks/useApiBaseUrl.ts
import { useEffect, useState, useRef } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LOCAL_DEV_IP, DEV_PORT, PROD_BASE, DEV_BASE } from "../config";

const CACHE_KEY = "orval_api_baseurl_cache_v1";
const TIMEOUT_MS = 2500; // Augmenté pour laisser le temps à Railway de "se réveiller"

async function fetchWithTimeout(url: string, timeout = TIMEOUT_MS) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

type UseApiResult = {
  baseUrl: string | null;
  loading: boolean;
  error: string | null;
  clearCache: () => Promise<void>;
};

export function useApiBaseUrl(): UseApiResult {
  const [baseUrl, setBaseUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    (async () => {
      setLoading(true);

      // 1. Priorité absolue à la PROD si on n'est pas en mode développement Expo
      if (!__DEV__) {
        setBaseUrl(PROD_BASE);
        setLoading(false);
        return;
      }

      // 2. En mode DEV, on tente d'abord le local
      try {
        const res = await fetchWithTimeout(`${DEV_BASE}/api/places`, 1500);
        if (res.ok) {
          setBaseUrl(DEV_BASE);
          setLoading(false);
          return;
        }
      } catch (e) {
        // Échec local, c'est normal si le PC est éteint
      }

      // 3. Fallback sur Railway si le local ne répond pas
      setBaseUrl(PROD_BASE);
      setLoading(false);
    })();

    return () => { mounted.current = false; };
  }, []);

  const clearCache = async () => {
    await AsyncStorage.removeItem(CACHE_KEY);
    setBaseUrl(null);
  };

  return { baseUrl, loading, error, clearCache };
}
