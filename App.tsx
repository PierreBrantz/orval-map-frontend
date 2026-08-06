// App.tsx
import React, { useState, useEffect } from "react";
import { ActivityIndicator, View, Modal, Platform } from "react-native";
import * as Linking from 'expo-linking';
import { SafeAreaProvider } from 'react-native-safe-area-context'; // Importer le Provider
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import ForgotPasswordScreen from "./src/screens/ForgotPasswordScreen";
import ResetPasswordScreen from "./src/screens/ResetPasswordScreen";
import MapScreen from "./src/screens/MapScreen";

const prefix = Linking.createURL('/');

function AppContent() {
  const { isLoading, isLoginVisible, showLogin } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgotPassword'>('login');
  const [resetToken, setResetToken] = useState<string | null>(null);

  const linking = {
    prefixes: [prefix],
    config: {
      screens: {
        'reset-password': 'resetPassword',
      },
    },
  };

  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      console.log("Deep link event received:", event.url);
      const { path, queryParams } = Linking.parse(event.url);

      if (path === 'reset-password' && queryParams?.token) {
        const token = queryParams.token as string;
        console.log("Reset token found:", token);
        setResetToken(token);
        if (Platform.OS !== 'web') {
          showLogin();
        }
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);

    Linking.getInitialURL().then(url => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [showLogin]);

  if (Platform.OS === 'web' && resetToken) {
    return (
      <ResetPasswordScreen
        token={resetToken}
        onPasswordResetSuccess={() => {
          setResetToken(null);
          alert("Mot de passe réinitialisé ! Vous pouvez fermer cet onglet.");
        }}
      />
    );
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#ff8c00" />
      </View>
    );
  }

  const renderAuthContent = () => {
    if (resetToken) {
      return (
        <ResetPasswordScreen
          token={resetToken}
          onPasswordResetSuccess={() => {
            setResetToken(null);
            setAuthMode('login');
          }}
        />
      );
    }

    switch (authMode) {
      case 'register':
        return <RegisterScreen onSwitchToLogin={() => setAuthMode('login')} />;
      case 'forgotPassword':
        return <ForgotPasswordScreen onSwitchToLogin={() => setAuthMode('login')} />;
      case 'login':
      default:
        return (
          <LoginScreen
            onSwitchToRegister={() => setAuthMode('register')}
            onForgotPassword={() => setAuthMode('forgotPassword')}
          />
        );
    }
  };

  return (
    <>
      <MapScreen />

      {Platform.OS !== 'web' && (
        <Modal visible={isLoginVisible} animationType="slide">
          {renderAuthContent()}
        </Modal>
      )}
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
