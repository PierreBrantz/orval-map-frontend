import { useLanguage } from "../context/LanguageContext";
// src/components/Map.web.tsx
import React from "react";
import { StyleSheet, Text, View } from "react-native";

// Ce composant ignore les props de la carte et affiche un message
export default function Map() {
  const { t } = useLanguage();
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{t("La carte est uniquement disponible sur l'application mobile.")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: '#f0f0f0',
  },
  text: {
    fontSize: 16,
    color: '#666',
  }
});
