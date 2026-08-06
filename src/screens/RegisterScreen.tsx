// src/screens/RegisterScreen.tsx
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
  ScrollView,
  Linking,
  useColorScheme
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { API_BASE_URL } from "../config"; // Importer la constante
import { useRegisterUser } from "../hooks/useRegisterUser";
import { useAuth } from "../context/AuthContext";

export default function RegisterScreen({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { registerUser } = useRegisterUser();
  const { hideLogin } = useAuth();

  const colorScheme = useColorScheme();
  const placeholderTextColor = colorScheme === 'dark' ? '#888' : '#bbb';

  const validatePassword = (pwd: string) => {
    const hasNumber = /\d/.test(pwd);
    return pwd.length >= 8 && hasNumber;
  };

  const handleRegister = async () => {
    const cleanUsername = username.trim();
    const cleanEmail = email.trim();

    if (!cleanUsername || !cleanEmail || !password) {
      return Alert.alert("Erreur", "Tous les champs sont obligatoires.");
    }
    if (!validatePassword(password)) {
      return Alert.alert("Mot de passe trop faible", "Votre mot de passe doit contenir au moins 8 caractères et au moins un chiffre.");
    }

    Keyboard.dismiss();
    setLoading(true);
    try {
      // Utiliser directement la constante API_BASE_URL
      await registerUser(API_BASE_URL, { username: cleanUsername, email: cleanEmail, password });
      Alert.alert("Bienvenue !", "Votre compte a été créé avec succès.");
    } catch (e: any) {
      Alert.alert("Erreur", e.message || "Impossible de créer le compte");
    } finally {
      setLoading(false);
    }
  };

  const openTerms = () => Linking.openURL(`${API_BASE_URL.replace(/\/$/, "")}/terms.html`);
  const openPrivacy = () => Linking.openURL(`${API_BASE_URL.replace(/\/$/, "")}/privacy.html`);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.closeButton} onPress={hideLogin}>
          <MaterialIcons name="close" size={28} color="#999" />
        </TouchableOpacity>

        <Text style={styles.title}>Créer un compte 🍺</Text>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <MaterialIcons name="person-outline" size={20} color="#999" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Nom d'utilisateur"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              placeholderTextColor={placeholderTextColor}
            />
          </View>

          <View style={styles.inputContainer}>
            <MaterialIcons name="email" size={20} color="#999" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
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

          <Text style={styles.hintText}>Minimum 8 caractères et au moins 1 chiffre.</Text>

          <Text style={styles.ageDisclaimerText}>
            En créant un compte, vous confirmez avoir l'âge légal pour consommer de l'alcool dans votre pays.
          </Text>

          <View style={styles.legalLinksContainer}>
            <TouchableOpacity onPress={openTerms}>
              <Text style={styles.legalLinkText}>Conditions d'utilisation</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={openPrivacy}>
              <Text style={styles.legalLinkText}>Politique de confidentialité</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>S'inscrire</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.switchButton} onPress={onSwitchToLogin}>
            <Text style={styles.switchText}>Déjà un compte ? <Text style={styles.switchTextBold}>Se connecter</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 30, justifyContent: 'center' },
  closeButton: { position: "absolute", top: 20, right: 20, padding: 10, zIndex: 10 },
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
  hintText: { fontSize: 12, color: '#bbb', marginBottom: 20, marginLeft: 5 },
  ageDisclaimerText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    marginHorizontal: 10,
  },
  legalLinksContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: -10,
    marginBottom: 20,
  },
  legalLinkText: {
    color: '#ff8c00',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  button: {
    backgroundColor: "#ff8c00",
    padding: 18,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 10,
    elevation: 3,
    shadowColor: '#ff8c00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8
  },
  buttonDisabled: { backgroundColor: "#ccc", shadowOpacity: 0 },
  buttonText: { color: "white", fontWeight: "bold", fontSize: 18 },
  switchButton: { marginTop: 30, marginBottom: 20, alignItems: 'center' },
  switchText: { color: "#999", fontSize: 15 },
  switchTextBold: { color: "#ff8c00", fontWeight: 'bold' }
});
