// src/screens/SettingsScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext'; // Pour le bouton de déconnexion

export default function SettingsScreen() {
  const { logout } = useAuth();

  const handleContact = () => {
    Linking.openURL('mailto:contact@orvalmaps.com?subject=OrvalMaps - Contact');
  };

  const handleSupport = () => {
    const supportUrl = 'https://buymeacoffee.com/orvalmaps';
    Linking.canOpenURL(supportUrl).then(supported => {
      if (supported) {
        Linking.openURL(supportUrl);
      } else {
        Alert.alert("Erreur", "Impossible d'ouvrir le lien.");
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Paramètres</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <TouchableOpacity style={styles.optionButton} onPress={handleContact}>
            <Ionicons name="mail-outline" size={24} color="#ff8c00" />
            <Text style={styles.optionButtonText}>Me Contacter</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.optionButton} onPress={handleSupport}>
            <Ionicons name="cafe-outline" size={24} color="#ff8c00" />
            <Text style={styles.optionButtonText}>Offrir un Orval</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Compte</Text>
          <TouchableOpacity style={styles.optionButton} onPress={logout}>
            <Ionicons name="log-out-outline" size={24} color="#ff8c00" />
            <Text style={styles.optionButtonText}>Déconnexion</Text>
          </TouchableOpacity>
        </View>

        {/*
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Règlement des Badges</Text>
          // ... contenu du règlement ...
        </View>
        */}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations</Text>
          <Text style={styles.infoText}>Version de l'application : 1.0.0</Text>
          <Text style={styles.infoText}>Développé par Pierre Brantz</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 30,
  },
  section: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  optionButtonText: {
    marginLeft: 15,
    fontSize: 16,
    color: '#333',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  }
});
