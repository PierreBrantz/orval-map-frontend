import { useLanguage } from "../context/LanguageContext";
// src/components/UpdateChecker.tsx
import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Linking, Platform } from 'react-native';
import * as Application from 'expo-application';
import { fetchVersionInfo } from '../api/version';

// Fonction pour comparer les versions (ex: "1.2.0" > "1.1.0")
const isVersionOutdated = (currentVersion: string, requiredVersion: string) => {
  const currentParts = currentVersion.split('.').map(Number);
  const requiredParts = requiredVersion.split('.').map(Number);
  for (let i = 0; i < requiredParts.length; i++) {
    const current = currentParts[i] || 0;
    const required = requiredParts[i] || 0;
    if (current < required) return true;
    if (current > required) return false;
  }
  return false;
};

const UpdateChecker = () => {
  const { t } = useLanguage();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<{ latestVersion: string; isForced: boolean } | null>(null);

  useEffect(() => {
    const checkVersion = async () => {
      if (Platform.OS !== 'android') return; // Pour l'instant, uniquement pour Android

      const currentVersion = Application.nativeApplicationVersion;
      if (!currentVersion) return;

      try {
        const versionInfo = await fetchVersionInfo();
        const { latestVersion, minimumVersion } = versionInfo.android;

        const isForced = isVersionOutdated(currentVersion, minimumVersion);
        const isUpdateAvailable = isVersionOutdated(currentVersion, latestVersion);

        if (isForced || isUpdateAvailable) {
          setUpdateInfo({ latestVersion, isForced });
          setIsModalVisible(true);
        }
      } catch (error) {
        console.error("Failed to check for updates:", error);
      }
    };

    checkVersion();
  }, []);

  const handleUpdatePress = () => {
    const packageName = Application.applicationId;
    const playStoreUrl = `market://details?id=${packageName}`;
    Linking.canOpenURL(playStoreUrl).then(supported => {
      if (supported) {
        Linking.openURL(playStoreUrl);
      } else {
        Linking.openURL(`https://play.google.com/store/apps/details?id=${packageName}`);
      }
    });
  };

  if (!isModalVisible || !updateInfo) {
    return null;
  }

  return (
    <Modal visible={isModalVisible} transparent>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>
            {updateInfo.isForced ? t("Mise à jour obligatoire") : t("Nouvelle version disponible")}
          </Text>
          <Text style={styles.description}>
            {updateInfo.isForced
              ? t("Votre version de l'application n'est plus compatible. Veuillez installer la version {version} pour continuer.", { version: updateInfo.latestVersion })
              : t("Une nouvelle version ({version}) d'OrvalMaps est disponible avec des améliorations et de nouvelles fonctionnalités.", { version: updateInfo.latestVersion })}
          </Text>
          <TouchableOpacity style={styles.updateButton} onPress={handleUpdatePress}>
            <Text style={styles.buttonText}>{t("Mettre à jour")}</Text>
          </TouchableOpacity>
          {!updateInfo.isForced && (
            <TouchableOpacity style={styles.laterButton} onPress={() => setIsModalVisible(false)}>
              <Text style={styles.laterButtonText}>{t("Plus tard")}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContent: {
    width: '85%',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 25,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 22,
  },
  updateButton: {
    backgroundColor: '#ff8c00',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  laterButton: {
    marginTop: 15,
  },
  laterButtonText: {
    color: '#666',
    fontSize: 16,
  },
});

export default UpdateChecker;
