import { useAuth } from "../context/AuthContext";

export const useLoginUser = () => {
  const { login } = useAuth();

  const loginUser = async (baseUrl: string | null, username: string, password: string) => {
    if (!baseUrl) throw new Error("URL du serveur inconnue.");

    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Erreur connexion (${response.status})`);
    }

    const data = await response.json();
    if (!data.token) throw new Error("Token manquant dans la réponse");

    await login(data.token);
    return data;
  };

  /** 🚀 Nouvel appel pour créer un compte */
  const registerUser = async (baseUrl: string | null, username: string, password: string) => {
    if (!baseUrl) throw new Error("URL du serveur inconnue.");

    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Erreur inscription (${response.status})`);
    }

    // Après l'inscription, on connecte automatiquement l'utilisateur
    const data = await response.json();
    if (data.token) {
      await login(data.token);
    }
    return data;
  };

  return { loginUser, registerUser };
};
