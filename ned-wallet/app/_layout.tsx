import '../polyfill';
import '../services/coreInit';
import '../services/i18n';
import '../services/webAlert';
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../services/auth';
import { resolveOnboarding } from '../services/onboarding';
import { GlobalNotificationManager } from '../components/GlobalNotificationManager';
import { useFonts } from 'expo-font';
import { colors } from '../constants/design';
import { Ionicons, Feather } from '@expo/vector-icons';
import { SpaceGrotesk_500Medium, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { SpaceMono_400Regular, SpaceMono_700Bold } from '@expo-google-fonts/space-mono';

// Route xem được khi chưa đăng nhập (segment đầu tiên của expo-router)
// (onboarding): welcome công khai; setup/fund/profile/mode tự chuyển về welcome nếu chưa đăng nhập
const PUBLIC_SEGMENTS = new Set(['', 'index', '(onboarding)', '+not-found']);

/** Chưa đăng nhập mà mở màn cần đăng nhập → chuyển về màn đăng nhập */
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
 * Đã đăng nhập nhưng chưa xong onboarding (chưa có ReverseRecord hoặc chưa chọn khu vực) mà mở thẳng một màn
 * trong app (deep link) → về /setup; setup tự chọn bước tiếp theo. Kiểm tra một lần cho mỗi ví; lỗi RPC thì không chặn.
 */
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
  // Chờ font chữ + font icon nạp xong rồi mới vẽ app (tránh chữ hệ thống và icon trống lúc đầu); lỗi nạp font thì vẫn vẽ
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
                    <Stack screenOptions={{ headerShown: false }}>
                      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                      <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
                      <Stack.Screen name="home" options={{ headerShown: false }} />
                      <Stack.Screen name="history" options={{ headerShown: false }} />
                      <Stack.Screen name="settings" options={{ headerShown: false }} />
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