// src/api/auth.ts

import { authenticatedFetch } from "./api";

export async function deleteCurrentAccount(password: string): Promise<void> {
  if (!password.trim()) throw new Error('Veuillez saisir votre mot de passe.');
  const response = await authenticatedFetch("/api/account", {
    method: "DELETE",
    body: JSON.stringify({ password }),
  });

  if (!response.ok) {
    switch (response.status) {
      case 400: throw new Error('Veuillez saisir votre mot de passe.');
      case 401: throw new Error('SESSION_EXPIRED');
      case 403: throw new Error('Le mot de passe est incorrect.');
      default: throw new Error('Impossible de supprimer le compte pour le moment.');
    }
  }
}

export async function requestPasswordReset(baseUrl: string, email: string): Promise<void> {
  if (!baseUrl) {
    throw new Error("L'URL du serveur est introuvable.");
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    // console.error("Password reset request failed with status:", response.status);
    throw new Error("Une erreur est survenue lors de la demande de réinitialisation.");
  }
}

export async function resetPassword(baseUrl: string, token: string, newPassword: string): Promise<void> {
  if (!baseUrl) {
    throw new Error("L'URL du serveur est introuvable.");
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, newPassword }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    // console.error("Password reset failed with status:", response.status, errorData);
    throw new Error(errorData.message || errorData.error || "Impossible de réinitialiser le mot de passe. Le lien est peut-être invalide ou expiré.");
  }
}
