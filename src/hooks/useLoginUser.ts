import { useAuth } from "../context/AuthContext";

export const useLoginUser = () => {
  const { login } = useAuth();

  const loginUser = async (baseUrl: string | null, username: string, password: string) => {
    if (!baseUrl) throw new Error("Connexion au serveur impossible.");

    try {
      const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        // Gestion personnalisée des codes d'erreur
        if (response.status === 401) {
          return Promise.reject(new Error("Nom d'utilisateur ou mot de passe incorrect."));
        }
        if (response.status === 403) {
          return Promise.reject(new Error("Accès refusé."));
        }

        return Promise.reject(new Error(errorData.message || "Une erreur est survenue lors de la connexion."));
      }

      const data = await response.json();
      if (!data.token) throw new Error("Token d'authentification manquant dans la réponse.");

      await login(data.token);
      return data;
    } catch (e: any) {
      if (e.message.includes("Network request failed")) {
        throw new Error("Impossible de joindre le serveur. Vérifiez votre connexion internet.");
      }
      throw e;
    }
  };

  // La fonction registerUser n'est pas utilisée ici, elle est dans useRegisterUser.ts
  // Je la retire pour éviter la duplication et la confusion.
  // Si elle était utilisée, il faudrait la déplacer ou la réimplémenter ici.

  return { loginUser };
};
