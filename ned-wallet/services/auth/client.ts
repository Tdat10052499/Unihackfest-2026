// Dynamic client (singleton) — only services/auth imports the Dynamic SDK.
// Docs: https://www.dynamic.xyz/docs/javascript/react-native/expo
import { createDynamicClient, type DynamicClient } from '@dynamic-labs-sdk/client';
import { addWaasSolanaExtension } from '@dynamic-labs-sdk/solana/waas';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { DYNAMIC_NATIVE_LINK, DYNAMIC_UNIVERSAL_LINK } from './constants';

export const DYNAMIC_ENVIRONMENT_ID = process.env.EXPO_PUBLIC_DYNAMIC_ENVIRONMENT_ID || '';

export const IS_WEB = Platform.OS === 'web';

// autoInitialize: false → AuthProvider initialises it itself so it can handle the Google redirect on web.
// Missing env → null, and AuthProvider reports the error instead of crashing the app.
// Web: sign-in by redirect (the browser has window.location) → no nativeLink/openAuthSession needed.
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
            // expo-web-browser (Custom Tabs / ASWebAuthenticationSession) instead of react-native-inappbrowser-reborn
            openAuthSession: async ({ authUrl, redirectUrl }) => {
              const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
              return result.type === 'success' ? { type: 'success', url: result.url } : { type: 'cancel' };
            },
          },
    })
  : null;

// Embedded (WaaS) Solana wallet only
if (dynamicClient) {
  addWaasSolanaExtension(dynamicClient);
}
