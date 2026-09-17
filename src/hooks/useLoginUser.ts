import { HttpError } from "../api/errors";
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
      throw new HttpError(response.status, [400, 401, 403].includes(response.status) ? "Identifiant ou mot de passe incorrect. Vérifiez vos informations et réessayez." : "");
    }

    const data = await response.json();
    if (!data.token) throw new Error("Token manquant dans la réponse");

    await login(data.token);
    return data;
  };

  return { loginUser };
};
