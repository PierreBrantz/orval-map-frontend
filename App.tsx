// App.tsx
import React from "react";
import { ActivityIndicator, View } from "react-native";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import LoginScreen from "./src/screens/LoginScreen";
import MapScreen from "./src/screens/MapScreen";

function AppContent() {
  const { token, isLoading, isGuest } = useAuth();

  // 1. Affiche un écran de chargement pendant la vérification du token
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#ff8c00" />
      </View>
    );
  }

  // 2. Affiche la carte si connecté OU invité, sinon l'écran de connexion
  return (token || isGuest) ? <MapScreen /> : <LoginScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
