import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, View } from 'react-native';
import { Language, languages, translate, translations, TranslationKey } from '../i18n/translations';

export const LANGUAGE_STORAGE_KEY = 'orvalmaps.language';
interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => Promise<void>;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  translateText: (text: string) => string;
  errorMessage: (error: unknown, fallback: TranslationKey) => string;
}
const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, updateLanguage] = useState<Language>('fr');
  const [ready, setReady] = useState(false);
  const writes = useRef(Promise.resolve());
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(LANGUAGE_STORAGE_KEY).then(saved => {
      if (active && languages.some(item => item.code === saved)) updateLanguage(saved as Language);
    }).catch(error => console.warn('Unable to load language preference', error))
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  const setLanguage = useCallback((next: Language) => {
    // Serialize writes so a quick second selection is always the persisted one.
    const write = writes.current.catch(() => undefined).then(async () => {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, next);
      updateLanguage(next);
    });
    writes.current = write;
    return write;
  }, []);
  const t = useCallback((key: TranslationKey, params?: Record<string, string | number>) => translate(language, key, params), [language]);
  const translateText = useCallback((value: string) => translate(language, value), [language]);
  const errorMessage = useCallback((error: unknown, fallback: TranslationKey) => {
    const message = error instanceof Error ? error.message : '';
    return translate(language, Object.prototype.hasOwnProperty.call(translations, message) ? message : fallback);
  }, [language]);
  if (!ready) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator color="#ff8c00" /></View>;
  return <LanguageContext.Provider value={{ language, setLanguage, t, translateText, errorMessage }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}
