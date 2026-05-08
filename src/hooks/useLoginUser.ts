import { useAuth } from "../context/AuthContext";

export const useLoginUser = () => {
  const { login } = useAuth();

  const loginUser = async (baseUrl: string | null, username: string, password: string) => {
    if (!baseUrl) {
      throw new Error("Impossible de se connecter : URL du serveur inconnue.");
    }

    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      // ✅ Tente d'extraire un message d'erreur plus précis du backend
      throw new Error(errorData.message || errorData.error || `Erreur de connexion (${response.status})`);
    }

    const data = await response.json();
    if (!data.token) throw new Error("Token manquant dans la réponse");

    await login(data.token);
    return data;
  };

  return { loginUser };
};
