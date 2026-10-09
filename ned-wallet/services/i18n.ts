import i18n from 'i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';

export const LANGUAGE_STORAGE_KEY = '@app_language';

export interface SupportedLanguage {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  available: boolean;
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧', available: true },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', available: false },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷', available: false },
  { code: 'zh', name: 'Chinese', nativeName: '简体中文', flag: '🇨🇳', available: false },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', available: false },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', available: false },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', available: false },
];

import enTranslation from '../locales/en.json';

export const resources = {
  en: { translation: enTranslation },
};

// i18next set up directly with the resources (English only since 9 Oct 2026)
i18n.init({
  compatibilityJSON: 'v3',
  resources,
  // The whole UI is English (docs/archive/02-design-v1/design-status.md, decision 3); Settings no longer picks a language
  lng: 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

// Loads the language saved in AsyncStorage at start-up
export const initLanguageFromStorage = async () => {
  if (Platform.OS === 'web' && typeof window === 'undefined') return;
  try {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (savedLanguage === 'en') {
      await i18n.changeLanguage(savedLanguage);
      console.log(`🌐 [i18n] Loaded the saved language: ${savedLanguage}`);
    } else {
      console.log('🌐 [i18n] Using the default language: en');
    }
  } catch (error) {
    console.error('Could not read the language from AsyncStorage:', error);
  }
};

// The saved language is not loaded automatically: the UI is English only, and an old 'vi' value is ignored

/**
 * Changes the language and saves it in AsyncStorage
 */
export const changeAppLanguage = async (newLang: string) => {
  try {
    await i18n.changeLanguage(newLang);
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, newLang);
    console.log(`🌐 [i18n] Switched the language to: ${newLang}`);
  } catch (error) {
    console.error('Could not save the language to AsyncStorage:', error);
  }
};

/**
 * Lightweight useTranslation hook that reacts immediately to a language change
 */
export function useTranslation() {
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language || 'en');

  useEffect(() => {
    const handleLanguageChanged = (newLang: string) => {
      setCurrentLanguage(newLang);
    };

    i18n.on('languageChanged', handleLanguageChanged);
    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, []);

  const t = useCallback(
    (key: string, options?: any) => {
      void currentLanguage; // re-create t when the language changes
      const dict = resources.en.translation as any;

      // Direct lookup by dot-notation path (e.g. 'activities.received')
      let val: any = dict;
      const parts = key.split('.');
      for (const part of parts) {
        if (val && typeof val === 'object' && part in val) {
          val = val[part];
        } else {
          val = null;
          break;
        }
      }

      let result = (typeof val === 'string' ? val : null) || (options?.defaultValue ?? key);

      // Interpolate any {{variable}} template string if present in options
      if (options && typeof result === 'string') {
        for (const [k, v] of Object.entries(options)) {
          if (k !== 'defaultValue') {
            result = result.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
          }
        }
      }
      return result;
    },
    [currentLanguage]
  );

  return {
    t,
    i18n,
    currentLanguage,
  };
}

export default i18n;
