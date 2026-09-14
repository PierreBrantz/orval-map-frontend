import { useLanguage, LanguageProvider } from "./src/context/LanguageContext";
// App.tsx
import React, { useState, useEffect } from "react";
import { ActivityIndicator, View, Modal, Platform, Text, StyleSheet, Alert, TouchableOpacity } from "react-native";
import * as Linking from 'expo-linking';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { AuthProvider, useAuth } from "./src/context/AuthContext";
import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import ForgotPasswordScreen from "./src/screens/ForgotPasswordScreen";
import ResetPasswordScreen from "./src/screens/ResetPasswordScreen";
import MapScreen from "./src/screens/MapScreen";
import PassportScreen from "./src/screens/PassportScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import { checkForUpdate } from './src/services/appVersionService';

const Tab = createBottomTabNavigator();
const prefix = Linking.createURL('/');

function AppTabs() {
  const { t } = useLanguage();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: React.ComponentProps<typeof Ionicons>['name'] = 'settings-outline';
          if (route.name === 'Carte') {
            iconName = focused ? 'map' : 'map-outline';
          } else if (route.name === 'Passeport') {
            iconName = focused ? 'person-circle' : 'person-circle-outline';
          } else if (route.name === 'Paramètres') {
            iconName = focused ? 'settings' : 'settings-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#ff8c00',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Carte" options={{ title: t("Carte") }} component={MapScreen} />
      <Tab.Screen name="Passeport" options={{ title: t("Passeport") }} component={PassportScreen} />
      <Tab.Screen name="Paramètres" options={{ title: t("Paramètres") }} component={SettingsScreen} />
    </Tab.Navigator>
  );
}

function AppContent() {
  const { t } = useLanguage();
  const { isLoading, isLoginVisible, isLoginRequired, showLogin, navigationVersion } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgotPassword'>('login');
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [passwordResetSuccessWeb, setPasswordResetSuccessWeb] = useState(false);
  const [requiredUpdateUrl, setRequiredUpdateUrl] = useState<string | null>(null);

  useEffect(() => {
    setAuthMode('login');
    setResetToken(null);
    setPasswordResetSuccessWeb(false);
  }, [navigationVersion]);

  useEffect(() => {
    if (isLoginRequired) setAuthMode('login');
  }, [isLoginRequired]);

  useEffect(() => {
    const checkVersion = async () => {
      if (Platform.OS !== 'android') return;
      try {
        const result = await checkForUpdate();

        if (result.status === "OPTIONAL_UPDATE") {
          Alert.alert(
            t("Mise à jour disponible"),
            t("Une nouvelle version d'OrvalMaps est disponible."),
            [
              { text: t("Plus tard"), style: "cancel" },
              { text: t("Mettre à jour"), onPress: () => result.playStoreUrl && Linking.openURL(result.playStoreUrl) },
            ]
          );
        }

        if (result.status === "REQUIRED_UPDATE") {
          setRequiredUpdateUrl(result.playStoreUrl ?? '');
        }
      } catch (error) {
        console.error("Impossible de vérifier la version de l'application:", error);
      }
    };
    checkVersion();
  }, []);

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
      const { path, queryParams } = Linking.parse(event.url);
      if (path === 'reset-password' && queryParams?.token) {
        const token = queryParams.token as string;
        setResetToken(token);
        setPasswordResetSuccessWeb(false);
        if (Platform.OS !== 'web') {
          showLogin();
        }
      }
    };
    const subscription = Linking.addEventListener('url', handleDeepLink);
    Linking.getInitialURL().then(url => url && handleDeepLink({ url }));
    return () => subscription.remove();
  }, [showLogin]);

  if (Platform.OS === 'web') {
    if (passwordResetSuccessWeb) {
      return (
        <View style={webStyles.container}>
          <Text style={webStyles.title}>{t("Mot de passe réinitialisé !")}</Text>
          <Text style={webStyles.subtitle}>{t("Vous pouvez maintenant fermer cet onglet et vous connecter sur l'application mobile.")}</Text>
        </View>
      );
    }
    if (resetToken) {
      return (
        <ResetPasswordScreen
          token={resetToken}
          onPasswordResetSuccess={() => {
            setResetToken(null);
            setPasswordResetSuccessWeb(true);
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
    if (resetToken && Platform.OS !== 'web') {
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
    <NavigationContainer key={navigationVersion} linking={linking}>
      <AppTabs />
      <Modal
        visible={requiredUpdateUrl !== null}
        transparent
        animationType="fade"
        onRequestClose={() => undefined}
      >
        <View style={updateStyles.overlay}>
          <View style={updateStyles.content}>
            <Text style={updateStyles.title}>{t("Mise à jour requise")}</Text>
            <Text style={updateStyles.description}>
              {t("Cette version d'OrvalMaps n'est plus supportée. Installez la dernière version pour continuer.")}{" "}</Text>
            <TouchableOpacity
              style={updateStyles.button}
              onPress={() => requiredUpdateUrl && Linking.openURL(requiredUpdateUrl)}
              disabled={!requiredUpdateUrl}
            >
              <Text style={updateStyles.buttonText}>{t("Mettre à jour")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal visible={isLoginVisible && requiredUpdateUrl === null} animationType="slide">
        {renderAuthContent()}
      </Modal>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </LanguageProvider>
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
});

const updateStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  content: {
    width: '100%',
    maxWidth: 420,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    marginBottom: 12,
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  description: {
    marginBottom: 24,
    fontSize: 16,
    lineHeight: 22,
    color: '#666',
    textAlign: 'center',
  },
  button: {
    width: '100%',
    paddingVertical: 13,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#ff8c00',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});
