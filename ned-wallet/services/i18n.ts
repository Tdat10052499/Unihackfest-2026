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
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳', available: true },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧', available: true },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', available: false },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷', available: false },
  { code: 'zh', name: 'Chinese', nativeName: '简体中文', flag: '🇨🇳', available: false },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', available: false },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', available: false },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', available: false },
];

import viTranslation from '../locales/vi.json';
import enTranslation from '../locales/en.json';

export const resources = {
  vi: { translation: viTranslation },
  en: { translation: enTranslation },
};

// Khởi tạo cấu hình i18next trực tiếp với tài nguyên
i18n.init({
  compatibilityJSON: 'v3',
  resources,
  lng: 'vi',
  fallbackLng: 'vi',
  interpolation: {
    escapeValue: false,
  },
});

// Tải ngôn ngữ đã lưu từ AsyncStorage khi ứng dụng khởi động
export const initLanguageFromStorage = async () => {
  if (Platform.OS === 'web' && typeof window === 'undefined') return;
  try {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (savedLanguage && (savedLanguage === 'vi' || savedLanguage === 'en')) {
      await i18n.changeLanguage(savedLanguage);
      console.log(`🌐 [i18n] Đã nạp ngôn ngữ từ bộ nhớ: ${savedLanguage}`);
    } else {
      console.log('🌐 [i18n] Sử dụng ngôn ngữ mặc định: vi');
    }
  } catch (error) {
    console.error('Lỗi khi đọc ngôn ngữ từ AsyncStorage:', error);
  }
};

// Tự động nạp khi module khởi động (trên client / native)
if (Platform.OS !== 'web' || typeof window !== 'undefined') {
  initLanguageFromStorage();
}

/**
 * Hàm thay đổi ngôn ngữ đồng thời lưu vào AsyncStorage
 */
export const changeAppLanguage = async (newLang: string) => {
  try {
    await i18n.changeLanguage(newLang);
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, newLang);
    console.log(`🌐 [i18n] Đã chuyển ngôn ngữ sang: ${newLang}`);
  } catch (error) {
    console.error('Lỗi khi lưu ngôn ngữ vào AsyncStorage:', error);
  }
};

/**
 * React Hook useTranslation siêu nhẹ, phản hồi tức thì khi đổi ngôn ngữ
 */
export function useTranslation() {
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language || 'vi');

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
      const activeLang = (currentLanguage?.startsWith('en') ? 'en' : 'vi') as 'vi' | 'en';
      const dict = (resources[activeLang]?.translation as any) || (resources.vi?.translation as any);

      // Tra cứu trực tiếp theo đường dẫn dot-notation (vd: 'miniapps.bannerTitle')
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
