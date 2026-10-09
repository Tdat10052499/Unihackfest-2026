import '../polyfill';
import '../services/coreInit';
import '../services/i18n';
import '../services/webAlert';
import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack, router, usePathname, useRouter, useSegments, type Href } from 'expo-router';
import { AuthProvider, useAuth } from '../services/auth';
import { resolveOnboarding } from '../services/onboarding';
import { ensureDeviceRegistered } from '../services/milestone/keySync';
import { EMBEDDED, isAppPath, postToParent, ROOT_PATHS } from '../services/embedded';
import { REGION_STORAGE_KEY, useRegionStore } from '../stores/useRegionStore';
import { blockedForRegion } from '../services/regionGuard';
import { takeInvite } from '../services/milestone/invite';
import { importKeyFromFragment } from '../services/milestone/keys';
import { contractKeyStorage } from '../services/milestone/keyStore';
import { GlobalNotificationManager } from '../components/GlobalNotificationManager';
import { useFonts } from 'expo-font';
import { colors } from '../constants/design';
import { Ionicons, Feather } from '@expo/vector-icons';
import { SpaceGrotesk_500Medium, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { SpaceMono_400Regular, SpaceMono_700Bold } from '@expo-google-fonts/space-mono';

// Routes that can be viewed before sign-in (first expo-router segment)
// (onboarding): welcome is public; the other screens (setup, consent, fund, profile, residence; D30: role, country, business, agreement) go back to welcome when signed out
// 'c': the invite link route decides itself (it keeps the #k= fragment for after sign-in)
// terms, privacy, disclosures: readable before sign-in and before consent (P3; the Workspace footers link here)
const PUBLIC_SEGMENTS = new Set(['', 'index', '(onboarding)', '+not-found', 'c', 'terms', 'privacy', 'disclosures']);

/** Signed out and opening a screen that needs sign-in → go to the sign-in screen */
function AuthGate() {
  const { isReady, isAuthenticated } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const first = segments[0] ?? '';

  useEffect(() => {
    if (isReady && !isAuthenticated && !PUBLIC_SEGMENTS.has(first)) {
      router.replace('/welcome');
    }
  }, [isReady, isAuthenticated, first, router]);

  return null;
}

/**
 * Signed in but onboarding not finished (no ReverseRecord or no region yet) and a screen inside the app opened
 * directly (deep link) → /setup, which picks the next step. Checked once per wallet; an RPC error does not block.
 */
/** An invite opened before sign-in (app/c/[fund]) is imported once the wallet exists, then opens that contract */
/**
 * Wallet extension (W6, D23): inside the Workspace's same-origin iframe, report the route to the parent (for Back and
 * "Open in full view"), follow navigation requests from the parent, pass Escape up (it closes the panel), and pick up a
 * money view chosen in the Workspace. Messages are checked for origin and source; nothing secret is ever posted.
 */
function EmbeddedBridge() {
  const pathname = usePathname();
  useEffect(() => {
    postToParent({ type: 'ned-route', path: pathname, root: ROOT_PATHS.has(pathname) });
  }, [pathname]);
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== window.parent) return;
      const data = e.data as { type?: string; path?: unknown };
      if (data?.type === 'ned-navigate' && isAppPath(data.path)) router.push(data.path as Href);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') postToParent({ type: 'ned-escape' });
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === REGION_STORAGE_KEY) void useRegionStore.persist.rehydrate();
    };
    window.addEventListener('message', onMessage);
    window.addEventListener('keydown', onKey);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('message', onMessage);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  return null;
}

/** Key sync (D22): registers this device's key for the signed-in wallet, once per session, silently */
/** V1: in the Vietnam view (or before a region is chosen), /send, /receive, /history and /scan-qr go to Home */
function RegionGuard() {
  const pathname = usePathname();
  const { isAuthenticated, walletAddress } = useAuth();
  const region = useRegionStore((s) => (walletAddress ? s.regions[walletAddress] ?? null : null));
  const [hydrated, setHydrated] = useState(() => useRegionStore.persist.hasHydrated());
  useEffect(() => useRegionStore.persist.onFinishHydration(() => setHydrated(true)), []);
  useEffect(() => {
    if (!isAuthenticated || !hydrated) return;
    if (blockedForRegion(pathname, region)) router.replace('/home');
  }, [pathname, region, isAuthenticated, hydrated]);
  return null;
}

function DeviceKeyGate() {
  const { isReady, isAuthenticated, walletAddress, signTransaction } = useAuth();
  useEffect(() => {
    if (!isReady || !isAuthenticated || !walletAddress) return;
    void ensureDeviceRegistered({ walletAddress, signTransaction });
  }, [isReady, isAuthenticated, walletAddress, signTransaction]);
  return null;
}

function PendingInviteGate() {
  const { isReady, isAuthenticated, walletAddress } = useAuth();
  useEffect(() => {
    if (!isReady || !isAuthenticated || !walletAddress) return;
    let cancelled = false;
    void (async () => {
      const pending = await takeInvite();
      if (!pending || cancelled) return;
      await importKeyFromFragment(contractKeyStorage, walletAddress, pending.fund, pending.fragment);
      router.push(`/contracts/${pending.fund}` as Href);
    })();
    return () => {
      cancelled = true;
    };
  }, [isReady, isAuthenticated, walletAddress]);
  return null;
}

function OnboardingGate() {
  const { isReady, isAuthenticated, walletAddress, connection } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const first = segments[0] ?? '';
  const completeFor = useRef<string | null>(null);

  useEffect(() => {
    if (!isReady || !isAuthenticated || !walletAddress || PUBLIC_SEGMENTS.has(first)) return;
    if (completeFor.current === walletAddress) return;
    let cancelled = false;
    resolveOnboarding(connection, walletAddress)
      .then((state) => {
        if (cancelled) return;
        if (state.step === 'home') completeFor.current = walletAddress;
        else router.replace('/setup');
      })
      .catch((err) => console.warn('[OnboardingGate] check failed, not blocking:', err));
    return () => {
      cancelled = true;
    };
  }, [isReady, isAuthenticated, walletAddress, connection, first, router]);

  return null;
}

export default function RootLayout() {
  // Wait for the text and icon fonts before drawing the app (avoids system fonts and empty icons at first); a font error still draws
  const [fontsLoaded, fontError] = useFonts({
    ...Ionicons.font,
    ...Feather.font,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    SpaceMono_400Regular,
    SpaceMono_700Bold,
  });

  const initialMetrics = Platform.OS === 'web' 
    ? {
        frame: { x: 0, y: 0, width: 0, height: 0 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }
    : undefined;

  if (!fontsLoaded && !fontError) return <View style={styles.boot} />;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider style={styles.root} initialMetrics={initialMetrics}>
        <View style={styles.root}>
          <AuthProvider>
                  <View style={styles.root}>
                    <AuthGate />
                    <OnboardingGate />
                    <RegionGuard />
                    <PendingInviteGate />
                    <DeviceKeyGate />
                    {EMBEDDED ? <EmbeddedBridge /> : null}
                    <Stack screenOptions={{ headerShown: false }}>
                      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                      <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
                      <Stack.Screen name="home" options={{ headerShown: false }} />
                      <Stack.Screen name="history" options={{ headerShown: false }} />
                      <Stack.Screen name="records" options={{ headerShown: false }} />
                      <Stack.Screen name="contracts/index" options={{ headerShown: false }} />
                      <Stack.Screen name="contracts/new" options={{ headerShown: false }} />
                      <Stack.Screen name="disclosures" options={{ headerShown: false }} />
                      <Stack.Screen name="settings" options={{ headerShown: false }} />
                      <Stack.Screen name="terms" options={{ headerShown: false }} />
                      <Stack.Screen name="privacy" options={{ headerShown: false }} />
                      <Stack.Screen name="help" options={{ headerShown: false }} />
                      <Stack.Screen name="send" options={{ headerShown: false }} />
                      <Stack.Screen name="receive" options={{ headerShown: false }} />
                      <Stack.Screen name="notification-detail" options={{ headerShown: false }} />
                      <Stack.Screen name="scan-qr" options={{ headerShown: false, animation: 'fade' }} />
                      <Stack.Screen name="+not-found" options={{ headerShown: false }} />
                    </Stack>
                    <GlobalNotificationManager />
                  </View>
          </AuthProvider>
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  boot: { flex: 1, backgroundColor: colors.background },
});