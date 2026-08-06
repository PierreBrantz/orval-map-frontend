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
  Keyboard,
  SafeAreaView,
  useColorScheme
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { API_BASE_URL } from "../config";
import { useLoginUser } from "../hooks/useLoginUser";
import { useAuth } from "../context/AuthContext";

export default function LoginScreen({ onSwitchToRegister, onForgotPassword }: { onSwitchToRegister: () => void, onForgotPassword: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { loginUser } = useLoginUser();
  const { hideLogin } = useAuth();

  const colorScheme = useColorScheme();
  const placeholderTextColor = colorScheme === 'dark' ? '#888' : '#bbb';

  const handleLogin = async () => {
    const cleanUsername = username.trim();
    if (!cleanUsername || !password) {
      return Alert.alert("Erreur", "Veuillez remplir tous les champs");
    }

    Keyboard.dismiss();
    setLoading(true);
    try {
      await loginUser(API_BASE_URL, cleanUsername, password);
    } catch (e: any) {
      Alert.alert("Erreur", e.message || "Impossible de se connecter");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.closeButton} onPress={hideLogin}>
          <MaterialIcons name="close" size={28} color="#999" />
        </TouchableOpacity>

        <Text style={styles.title}>Connexion 🍺</Text>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <MaterialIcons name="person-outline" size={20} color="#999" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email ou Nom d'utilisateur"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              placeholderTextColor={placeholderTextColor}
            />
          </View>

          <View style={styles.inputContainer}>
            <MaterialIcons name="lock-outline" size={20} color="#999" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Mot de passe"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              placeholderTextColor={placeholderTextColor}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
              <MaterialIcons name={showPassword ? "visibility" : "visibility-off"} size={22} color="#999" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.forgotPasswordButton} onPress={onForgotPassword}>
            <Text style={styles.forgotPasswordText}>Mot de passe oublié ?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Se connecter</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.switchButton} onPress={onSwitchToRegister}>
            <Text style={styles.switchText}>Pas de compte ? <Text style={styles.switchTextBold}>S'inscrire</Text></Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 30, justifyContent: 'center' },
  closeButton: { position: "absolute", top: 20, right: 20, padding: 10 },
  title: { fontSize: 32, fontWeight: "bold", textAlign: "center", marginBottom: 40, color: "#333" },
  form: { width: '100%' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 15,
    marginBottom: 15,
    paddingHorizontal: 15,
    height: 55,
    borderWidth: 1,
    borderColor: '#eee'
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: '#333' },
  eyeIcon: { padding: 5 },
  forgotPasswordButton: {
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: '#ff8c00',
    fontSize: 14,
  },
  button: {
    backgroundColor: "#ff8c00",
    padding: 18,
    borderRadius: 15,
    alignItems: "center",
    elevation: 3,
    shadowColor: '#ff8c00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8
  },
  buttonDisabled: { backgroundColor: "#ccc", shadowOpacity: 0 },
  buttonText: { color: "white", fontWeight: "bold", fontSize: 18 },
  switchButton: { marginTop: 30, alignItems: 'center' },
  switchText: { color: "#999", fontSize: 15 },
  switchTextBold: { color: "#ff8c00", fontWeight: 'bold' }
});
