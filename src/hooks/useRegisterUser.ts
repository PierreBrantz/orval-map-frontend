import { useAuth } from "../context/AuthContext";

export const useRegisterUser = () => {
  const { login } = useAuth();

  const registerUser = async (baseUrl: string | null, userData: any) => {
    if (!baseUrl) throw new Error("URL du serveur inconnue.");

    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Erreur lors de l'inscription (${response.status})`);
    }

    const data = await response.json();
    if (data.token) {
      await login(data.token);
    }
    return data;
  };

  return { registerUser };
};
