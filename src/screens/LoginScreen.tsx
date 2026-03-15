// src/screens/LoginScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Keyboard
} from "react-native";
import { useApiBaseUrl } from "../hooks/useApiBaseUrl";
import { useLoginUser } from "../hooks/useLoginUser";
import { useAuth } from "../context/AuthContext"; // Importer useAuth

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { baseUrl, loading: loadingUrl, error: errorUrl } = useApiBaseUrl();
  const { loginUser } = useLoginUser();
  const { loginAsGuest } = useAuth(); // Récupérer la fonction pour le mode invité

  const handleLogin = async () => {
    if (!baseUrl) {
      Alert.alert("Erreur", errorUrl || "Serveur introuvable");
      return;
    }
    Keyboard.dismiss();
    try {
      setLoading(true);
      await loginUser(baseUrl, username, password);
    } catch (e: any) {
      Alert.alert("Erreur", e.message || "Impossible de se connecter");
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = () => {
    loginAsGuest();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🍺 OrvalMap</Text>

      {loadingUrl && <ActivityIndicator style={{ marginBottom: 20 }} />}
      {errorUrl && <Text style={styles.errorText}>{errorUrl}</Text>}

      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={username}
        onChangeText={setUsername}
      />

      <TextInput
        style={styles.input}
        placeholder="Mot de passe"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity
        style={[styles.button, (!baseUrl || loading) && styles.buttonDisabled]}
        onPress={handleLogin}
        disabled={loading || !baseUrl}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Se connecter</Text>
        )}
      </TouchableOpacity>

      <View style={styles.separatorContainer}>
        <View style={styles.separator} />
        <Text style={styles.separatorText}>OU</Text>
        <View style={styles.separator} />
      </View>

      <TouchableOpacity
        style={[styles.button, styles.guestButton]}
        onPress={handleGuestLogin}
      >
        <Text style={styles.buttonText}>Explorer en tant qu'invité</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 30, backgroundColor: "white" },
  title: { fontSize: 32, fontWeight: "bold", textAlign: "center", marginBottom: 30, color: "#ff8c00" },
  errorText: { color: "red", textAlign: "center", marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#ff8c00",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: "#ccc",
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  guestButton: {
    backgroundColor: "#666",
  },
  separatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  separator: {
    flex: 1,
    height: 1,
    backgroundColor: "#ccc",
  },
  separatorText: {
    marginHorizontal: 10,
    color: "#999",
    fontWeight: "bold",
  },
});
