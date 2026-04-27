import { useAuth } from "../context/AuthContext";

export const useRegisterUser = () => {
  const { login } = useAuth();

  const registerUser = async (baseUrl: string | null, userData: any) => {
    if (!baseUrl) throw new Error("Connexion au serveur impossible.");

    try {
      const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        // Gestion personnalisée des codes d'erreur
        if (response.status === 400) {
          if (errorData.message?.toLowerCase().includes("username")) {
            return Promise.reject(new Error("Ce nom d'utilisateur est déjà pris."));
          }
          if (errorData.message?.toLowerCase().includes("email")) {
            return Promise.reject(new Error("Cette adresse email est déjà utilisée."));
          }
          return Promise.reject(new Error("Les données fournies sont invalides."));
        }

        if (response.status === 409) {
          return Promise.reject(new Error("Cet utilisateur existe déjà."));
        }

        return Promise.reject(new Error(errorData.message || "Une erreur est survenue lors de l'inscription."));
      }

      const data = await response.json();
      if (data.token) {
        await login(data.token);
      }
      return data;
    } catch (e: any) {
      if (e.message.includes("Network request failed")) {
        throw new Error("Impossible de joindre le serveur. Vérifiez votre connexion internet.");
      }
      throw e;
    }
  };

  return { registerUser };
};
