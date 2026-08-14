// App.tsx
import React, { useState, useEffect } from "react";
import { ActivityIndicator, View, Modal, Platform, Text, StyleSheet } from "react-native";
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
import UpdateChecker from "./src/components/UpdateChecker"; // Importer le composant

const Tab = createBottomTabNavigator();
const prefix = Linking.createURL('/');

function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
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
      <Tab.Screen name="Carte" component={MapScreen} />
      <Tab.Screen name="Passeport" component={PassportScreen} />
      <Tab.Screen name="Paramètres" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

function AppContent() {
  const { isLoading, isLoginVisible, showLogin } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgotPassword'>('login');
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [passwordResetSuccessWeb, setPasswordResetSuccessWeb] = useState(false);

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
          <Text style={webStyles.title}>Mot de passe réinitialisé !</Text>
          <Text style={webStyles.subtitle}>Vous pouvez maintenant fermer cet onglet et vous connecter sur l'application mobile.</Text>
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
    <NavigationContainer linking={linking}>
      <AppTabs />
      <Modal visible={isLoginVisible} animationType="slide">
        {renderAuthContent()}
      </Modal>
      <UpdateChecker />
    </NavigationContainer>
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
});
