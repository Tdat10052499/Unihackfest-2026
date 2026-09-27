// Dynamic client (singleton) — chỉ services/auth được import SDK Dynamic.
// Tài liệu: https://www.dynamic.xyz/docs/javascript/react-native/expo
import { createDynamicClient, type DynamicClient } from '@dynamic-labs-sdk/client';
import { addWaasSolanaExtension } from '@dynamic-labs-sdk/solana/waas';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { DYNAMIC_NATIVE_LINK, DYNAMIC_UNIVERSAL_LINK } from './constants';

export const DYNAMIC_ENVIRONMENT_ID = process.env.EXPO_PUBLIC_DYNAMIC_ENVIRONMENT_ID || '';

export const IS_WEB = Platform.OS === 'web';

// autoInitialize: false → AuthProvider tự khởi tạo để còn xử lý redirect Google trên web.
// Thiếu env → null, AuthProvider báo lỗi thay vì làm crash cả app.
// Web: đăng nhập bằng redirect (trình duyệt tự có window.location) → không cần nativeLink/openAuthSession.
export const dynamicClient: DynamicClient | null = DYNAMIC_ENVIRONMENT_ID
  ? createDynamicClient({
      autoInitialize: false,
      environmentId: DYNAMIC_ENVIRONMENT_ID,
      metadata: IS_WEB
        ? { name: 'N.E.D Wallet' }
        : {
            name: 'N.E.D Wallet',
            nativeLink: DYNAMIC_NATIVE_LINK,
            universalLink: DYNAMIC_UNIVERSAL_LINK,
          },
      coreConfig: IS_WEB
        ? undefined
        : {
            // Dùng expo-web-browser (Custom Tabs / ASWebAuthenticationSession) thay cho react-native-inappbrowser-reborn
            openAuthSession: async ({ authUrl, redirectUrl }) => {
              const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
              return result.type === 'success' ? { type: 'success', url: result.url } : { type: 'cancel' };
            },
          },
    })
  : null;

// Chỉ ví nhúng (WaaS) Solana
if (dynamicClient) {
  addWaasSolanaExtension(dynamicClient);
}
