import LanguageSelector from "../components/LanguageSelector";
import { useLanguage } from "../context/LanguageContext";
// src/screens/SettingsScreen.tsx
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert, Platform, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { useAuth } from '../context/AuthContext';
import { deleteCurrentAccount } from '../api/auth';
import { PRIVACY_POLICY_URL, TERMS_OF_USE_URL } from '../config';

export default function SettingsScreen() {
  const { t, errorMessage } = useLanguage();
  const { isGuest, logout, finishAccountDeletion } = useAuth();
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [password, setPassword] = useState('');
  const [accountDeleted, setAccountDeleted] = useState(false);
  const deletionInProgress = useRef(false);

  useEffect(() => {
    if (isGuest) {
      setPassword('');
      setIsPasswordVisible(false);
    }
  }, [isGuest]);

  const closePassword = () => {
    if (deletionInProgress.current || accountDeleted) return;
    setPassword('');
    setIsPasswordVisible(false);
  };

  const handleDeleteAccount = async () => {
    if (deletionInProgress.current) return;
    if (!accountDeleted && !password.trim()) {
      Alert.alert(t('Erreur'), t('Veuillez saisir votre mot de passe.'));
      return;
    }
    deletionInProgress.current = true;
    setIsDeletingAccount(true);
    let deleted = accountDeleted;
    try {
      if (!deleted) {
        await deleteCurrentAccount(password);
        deleted = true;
        setAccountDeleted(true);
        setPassword('');
      }
      // If local cleanup fails, retry it without sending DELETE a second time.
      await finishAccountDeletion();
      Alert.alert(t('Compte supprimé'), t('Votre compte a été supprimé avec succès.'));
    } catch (error) {
      setPassword('');
      Alert.alert(t('Erreur'), deleted
        ? t('Votre compte est supprimé. Réessayez pour terminer le nettoyage local.')
        : errorMessage(error, 'Impossible de supprimer le compte pour le moment.'));
    } finally {
      deletionInProgress.current = false;
      setIsDeletingAccount(false);
    }
  };

  const handleContact = async () => {
    const email = 'contact@orvalmaps.com';
    const contactUrl = `mailto:${email}?subject=${encodeURIComponent('OrvalMaps - Contact')}`;

    try {
      const supported = await Linking.canOpenURL(contactUrl);
      if (!supported) {
        Alert.alert(
          t("Application mail indisponible"),
          t("Aucune application de messagerie n'est configurée. Vous pouvez nous écrire à {email}.", { email })
        );
        return;
      }

      await Linking.openURL(contactUrl);
    } catch {
      Alert.alert(t("Erreur"), t("Impossible d'ouvrir la messagerie. Vous pouvez nous écrire à {email}.", { email }));
    }
  };

  const handleSupport = () => openExternalUrl('https://buymeacoffee.com/orvalmaps');

  const openExternalUrl = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(t("Erreur"), t("Impossible d’ouvrir ce lien. Vérifiez qu’un navigateur est installé et réessayez."));
    }
  };

  const confirmAccountDeletion = () => {
    Alert.alert(
      t("Supprimer définitivement le compte ?"),
      t("Votre compte et les données qui lui sont associées seront supprimés. Cette action est irréversible."),
      [
        { text: t("Annuler"), style: "cancel" },
        {
          text: t("Supprimer"),
          style: "destructive",
          onPress: () => {
            setPassword('');
            setAccountDeleted(false);
            setIsPasswordVisible(true);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{t("Paramètres")}</Text>
        <LanguageSelector />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("Support")}</Text>
          <TouchableOpacity style={styles.optionButton} onPress={handleContact}>
            <Ionicons name="mail-outline" size={24} color="#ff8c00" />
            <Text style={styles.optionButtonText}>{t("Me Contacter")}</Text>
          </TouchableOpacity>
          {Platform.OS !== 'ios' && (
            <TouchableOpacity style={styles.optionButton} onPress={handleSupport}>
              <Ionicons name="cafe-outline" size={24} color="#ff8c00" />
              <Text style={styles.optionButtonText}>{t("Offrir un Orval")}</Text>
            </TouchableOpacity>
          )}
        </View>

        {!isGuest && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("Compte")}</Text>
            <TouchableOpacity style={styles.optionButton} onPress={logout} disabled={isDeletingAccount}>
              <Ionicons name="log-out-outline" size={24} color="#ff8c00" />
              <Text style={styles.optionButtonText}>{t("Déconnexion")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.optionButton, styles.lastOptionButton]}
              onPress={confirmAccountDeletion}
              disabled={isDeletingAccount}
            >
              {isDeletingAccount
                ? <ActivityIndicator color="#c62828" />
                : <Ionicons name="trash-outline" size={24} color="#c62828" />}
              <Text style={[styles.optionButtonText, styles.destructiveText]}>{t("Supprimer mon compte")}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/*
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Règlement des Badges</Text>
          // ... contenu du règlement ...
        </View>
        */}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("Informations")}</Text>
          <TouchableOpacity style={styles.optionButton} onPress={() => openExternalUrl(PRIVACY_POLICY_URL)}>
            <Ionicons name="shield-checkmark-outline" size={24} color="#ff8c00" />
            <Text style={styles.optionButtonText}>{t("Politique de confidentialité")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.optionButton} onPress={() => openExternalUrl(TERMS_OF_USE_URL)}>
            <Ionicons name="document-text-outline" size={24} color="#ff8c00" />
            <Text style={styles.optionButtonText}>{t("Conditions d'utilisation")}</Text>
          </TouchableOpacity>
          <Text style={[styles.infoText, styles.infoTextFirst]}>{t("Version de l'application :")}{" "}{Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '—'}</Text>
          <Text style={styles.infoText}>{t("Développé par Pierre Brantz")}</Text>
        </View>

      </ScrollView>
      <Modal visible={isPasswordVisible} transparent animationType="fade" onRequestClose={closePassword}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
            <View style={styles.modalContent}>
              <Text style={styles.sectionTitle}>{t('Supprimer mon compte')}</Text>
              <Text style={styles.infoText}>{t('Votre compte et les données qui lui sont associées seront supprimés. Cette action est irréversible.')}</Text>
              {!accountDeleted && <TextInput
                style={styles.passwordInput}
                placeholder={t('Mot de passe actuel')}
                accessibilityLabel={t('Mot de passe actuel')}
                placeholderTextColor="#777"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="password"
                value={password}
                onChangeText={setPassword}
                editable={!isDeletingAccount}
                onSubmitEditing={handleDeleteAccount}
              />}
              <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount} disabled={isDeletingAccount} accessibilityRole="button">
                {isDeletingAccount ? <ActivityIndicator color="white" /> : <Text style={styles.deleteButtonText}>{accountDeleted ? t('Réessayer') : t('Supprimer définitivement le compte ?')}</Text>}
              </TouchableOpacity>
              {!accountDeleted && <TouchableOpacity style={styles.cancelButton} onPress={closePassword} disabled={isDeletingAccount} accessibilityRole="button">
                <Text>{t('Annuler')}</Text>
              </TouchableOpacity>}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalScroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: 'white', borderRadius: 12, padding: 24, width: '100%', maxWidth: 440, alignSelf: 'center' },
  passwordInput: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginVertical: 16, color: '#333', fontSize: 16 },
  deleteButton: { backgroundColor: '#c62828', padding: 14, borderRadius: 8, alignItems: 'center' },
  deleteButtonText: { color: 'white', fontWeight: 'bold', textAlign: 'center' },
  cancelButton: { padding: 14, alignItems: 'center' },
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
  lastOptionButton: {
    borderBottomWidth: 0,
  },
  destructiveText: {
    color: '#c62828',
  },
  infoTextFirst: {
    marginTop: 15,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  }
});
