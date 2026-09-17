import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { Language, languages } from '../i18n/translations';

export default function LanguageSelector() {
  const { language, setLanguage, t } = useLanguage();
  const [saving, setSaving] = useState(false);
  const select = async (next: Language) => {
    setSaving(true);
    try { await setLanguage(next); }
    catch { Alert.alert(t('Langue'), t('Impossible de mémoriser la langue. Réessayez dans un instant.')); }
    finally { setSaving(false); }
  };
  return (
    <View style={styles.section}>
      <Text style={styles.title}>{t('Langue')}</Text>
      {saving && <ActivityIndicator color="#ff8c00" />}
      {languages.map(item => (
        <TouchableOpacity key={item.code} style={styles.option} disabled={saving}
          accessibilityRole="radio" accessibilityState={{ checked: language === item.code, disabled: saving }}
          onPress={() => select(item.code)}>
          <Text style={styles.label}>{item.name}</Text>
          <Ionicons name={language === item.code ? 'radio-button-on' : 'radio-button-off'} size={24} color="#ff8c00" />
        </TouchableOpacity>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  section: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 20, elevation: 2 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  option: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  label: { flex: 1, fontSize: 16, color: '#333' },
});
