// App.tsx
import React, { useState, useEffect } from "react";
import { ActivityIndicator, View, Modal, Platform, Text, TouchableOpacity, StyleSheet } from "react-native";
import * as Linking from 'expo-linking';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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
  const [passwordResetSuccessWeb, setPasswordResetSuccessWeb] = useState(false); // Nouveau state pour le succès sur le web

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
        setPasswordResetSuccessWeb(false); // Réinitialiser l'état de succès si un nouveau token arrive
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

  // Logique spécifique pour le web pour afficher directement la page
  if (Platform.OS === 'web') {
    if (passwordResetSuccessWeb) {
      return (
        <View style={webStyles.container}>
          <Text style={webStyles.title}>Mot de passe réinitialisé !</Text>
          <Text style={webStyles.subtitle}>Vous pouvez maintenant fermer cet onglet ou vous connecter.</Text>
          <TouchableOpacity
            onPress={() => {
              setPasswordResetSuccessWeb(false);
              window.location.href = '/'; // Rediriger vers la page d'accueil (qui affichera la carte et la modale de login)
            }}
            style={webStyles.button}
          >
            <Text style={webStyles.buttonText}>Aller à la page de connexion</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (resetToken) {
      return (
        <ResetPasswordScreen
          token={resetToken}
          onPasswordResetSuccess={() => {
            setResetToken(null);
            setPasswordResetSuccessWeb(true); // Afficher la page de succès web
          }}
        />
      );
    }
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

const webStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f8f8',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#ff8c00',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
