// src/api/auth.ts

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
