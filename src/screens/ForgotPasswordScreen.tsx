import { useLanguage } from "../context/LanguageContext";
// src/screens/ForgotPasswordScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  useColorScheme,
  Keyboard
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { API_BASE_URL } from "../config";
import { requestPasswordReset } from "../api/auth";

export default function ForgotPasswordScreen({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const colorScheme = useColorScheme();
  const placeholderTextColor = colorScheme === 'dark' ? '#888' : '#bbb';

  const handlePasswordReset = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      return Alert.alert(t("Erreur"), t("Veuillez entrer votre adresse e-mail."));
    }

    Keyboard.dismiss();
    setLoading(true);

    try {
      await requestPasswordReset(API_BASE_URL, cleanEmail);
      Alert.alert(
        t("Vérifiez vos e-mails"),
        t("Si un compte est associé à cette adresse, un e-mail de réinitialisation a été envoyé.")
      );
      onSwitchToLogin();
    } catch (error: any) {
      console.error("Password Reset Error:", error);
      Alert.alert(
        t("Vérifiez vos e-mails"),
        t("Si un compte est associé à cette adresse, un e-mail de réinitialisation a été envoyé.")
      );
      onSwitchToLogin();
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.closeButton} onPress={onSwitchToLogin}>
          <MaterialIcons name="arrow-back" size={28} color="#999" />
        </TouchableOpacity>

        <Text style={styles.title}>{t("Mot de passe oublié")}</Text>
        <Text style={styles.subtitle}>
          {t("Entrez votre adresse e-mail pour recevoir un lien de réinitialisation.")}{" "}</Text>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <MaterialIcons name="email" size={20} color="#999" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={t("Votre adresse e-mail")}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholderTextColor={placeholderTextColor}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handlePasswordReset}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t("Envoyer")}</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 30, justifyContent: 'center' },
  closeButton: { position: "absolute", top: 20, left: 20, padding: 10 },
  title: { fontSize: 32, fontWeight: "bold", textAlign: "center", marginBottom: 15, color: "#333" },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 40 },
  form: { width: '100%' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 15,
    marginBottom: 20,
    paddingHorizontal: 15,
    height: 55,
    borderWidth: 1,
    borderColor: '#eee'
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: '#333' },
  button: {
    backgroundColor: "#ff8c00",
    padding: 18,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 20,
    elevation: 3,
    shadowColor: '#ff8c00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8
  },
  buttonDisabled: { backgroundColor: "#ccc", shadowOpacity: 0 },
  buttonText: { color: "white", fontWeight: "bold", fontSize: 18 },
});
