import i18n from 'i18next';
import { useState, useEffect, useCallback } from 'react';

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
