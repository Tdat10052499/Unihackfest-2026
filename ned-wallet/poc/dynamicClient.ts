// Dynamic client cho PoC T0.4 — chỉ màn app/poc-dynamic.tsx dùng.
// Tài liệu: https://www.dynamic.xyz/docs/javascript/react-native/expo
import { createDynamicClient, type DynamicClient } from '@dynamic-labs-sdk/client';
import { addWaasSolanaExtension } from '@dynamic-labs-sdk/solana/waas';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { DYNAMIC_NATIVE_LINK, DYNAMIC_UNIVERSAL_LINK } from './dynamicConstants';

export const DYNAMIC_ENVIRONMENT_ID = process.env.EXPO_PUBLIC_DYNAMIC_ENVIRONMENT_ID || '';

const IS_WEB = Platform.OS === 'web';

// autoInitialize: false → Dynamic chỉ khởi tạo khi mở màn PoC, không ảnh hưởng luồng Privy cũ.
// Thiếu env → null, màn PoC tự báo lỗi thay vì làm crash cả app.
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
            // Dùng expo-web-browser (Custom Tabs) thay cho react-native-inappbrowser-reborn mặc định
            openAuthSession: async ({ authUrl, redirectUrl }) => {
              const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
              return result.type === 'success' ? { type: 'success', url: result.url } : { type: 'cancel' };
            },
          },
    })
  : null;

// Chỉ ví nhúng (WaaS) Solana — không cần Wallet Standard cho PoC
if (dynamicClient) {
  addWaasSolanaExtension(dynamicClient);
}
