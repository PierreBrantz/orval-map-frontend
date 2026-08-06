import { useAuth } from "../context/AuthContext";

export const useLoginUser = () => {
  const { login } = useAuth();

  // The first parameter can be a username or an email.
  // We send it as 'login' which is a common convention for a field that can be either.
  const loginUser = async (baseUrl: string | null, loginIdentifier: string, password: string) => {
    if (!baseUrl) {
      throw new Error("Impossible de se connecter : URL du serveur inconnue.");
    }

    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: loginIdentifier, password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      // Try to extract a more specific error message from the backend
      throw new Error(errorData.message || errorData.error || `Identifiants invalides ou jeton manquant`);
    }

    const data = await response.json();
    if (!data.token) throw new Error("Token manquant dans la réponse");

    await login(data.token);
    return data;
  };

  return { loginUser };
};
