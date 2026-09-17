import { useLanguage } from "../context/LanguageContext";
// src/screens/ResetPasswordScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  useColorScheme,
  Keyboard
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { API_BASE_URL } from "../config";
import { resetPassword } from "../api/auth";

export default function ResetPasswordScreen({ token, onPasswordResetSuccess }: { token: string, onPasswordResetSuccess: () => void }) {
  const { t, errorMessage } = useLanguage();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null); // State for error messages
  const [success, setSuccess] = useState<string | null>(null); // State for success message

  const colorScheme = useColorScheme();
  const placeholderTextColor = colorScheme === 'dark' ? '#888' : '#bbb';

  const handleReset = async () => {
    setError(null); // Reset error on new attempt
    if (password !== confirmPassword) {
      return setError(t("Les mots de passe ne correspondent pas."));
    }
    if (password.length < 8) {
      return setError(t("Le mot de passe doit contenir au moins 8 caractères."));
    }

    Keyboard.dismiss();
    setLoading(true);

    try {
      await resetPassword(API_BASE_URL, token, password);
      setSuccess(t("Votre mot de passe a été réinitialisé !"));
      // We can call the success callback after a short delay to let the user read the message
      setTimeout(() => {
        onPasswordResetSuccess();
      }, 3000); // 3 seconds delay
    } catch (error: any) {
      console.error("Password Reset Error:", error);
      setError(errorMessage(error, 'Impossible de réinitialiser votre mot de passe. Réessayez ou demandez un nouveau lien.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
      <View style={styles.container}>
        <Text style={styles.title}>{t("Réinitialiser le mot de passe")}</Text>

        {success ? (
          <View style={styles.messageContainer}>
            <MaterialIcons name="check-circle" size={48} color="green" />
            <Text style={styles.successText}>{success}</Text>
          </View>
        ) : (
          <View style={styles.form}>
            {error && <Text style={styles.errorText}>{error}</Text>}

            <View style={styles.inputContainer}>
              <MaterialIcons name="lock-outline" size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t("Nouveau mot de passe")}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                placeholderTextColor={placeholderTextColor}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <MaterialIcons name={showPassword ? "visibility" : "visibility-off"} size={22} color="#999" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <MaterialIcons name="lock-outline" size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t("Confirmer le mot de passe")}
                secureTextEntry={!showPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholderTextColor={placeholderTextColor}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleReset}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t("Réinitialiser")}</Text>}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 30, justifyContent: 'center' },
  title: { fontSize: 32, fontWeight: "bold", textAlign: "center", marginBottom: 40, color: "#333" },
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
  eyeIcon: { padding: 5 },
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
  errorText: {
    lineHeight: 21,
    color: 'red',
    textAlign: 'center',
    marginBottom: 15,
    fontSize: 14,
  },
  successText: {
    color: 'green',
    textAlign: 'center',
    fontSize: 18,
    marginTop: 15,
  },
  messageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  }
});
