// src/config.ts

// URL unique et constante pour l'API, pointant vers la production sur Railway.
export const API_BASE_URL = "https://orval-map-backend-production.up.railway.app";
export const PRIVACY_POLICY_URL = `${API_BASE_URL}/privacy.html`;
export const TERMS_OF_USE_URL = `${API_BASE_URL}/terms.html`;

// Compatibilité avec les anciens utilitaires de développement encore présents
// dans le projet. Le code de production utilise toujours API_BASE_URL.
export const LOCAL_DEV_IP = "localhost";
export const DEV_PORT = "8080";
export const DEV_BASE = `http://${LOCAL_DEV_IP}:${DEV_PORT}`;
export const PROD_BASE = API_BASE_URL;
