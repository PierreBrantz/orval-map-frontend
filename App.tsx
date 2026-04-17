// App.tsx
import React, { useState } from "react";
import { ActivityIndicator, View, Modal } from "react-native";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import MapScreen from "./src/screens/MapScreen";

function AppContent() {
  const { isLoading, isLoginVisible } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#ff8c00" />
      </View>
    );
  }

  return (
    <>
      <MapScreen />

      <Modal visible={isLoginVisible} animationType="slide">
        {authMode === 'login' ? (
          <LoginScreen onSwitchToRegister={() => setAuthMode('register')} />
        ) : (
          <RegisterScreen onSwitchToLogin={() => setAuthMode('login')} />
        )}
      </Modal>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
