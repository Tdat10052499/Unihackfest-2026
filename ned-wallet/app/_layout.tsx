import '../polyfill';
import '../services/i18n';
import '../services/webAlert';
import React, { useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../services/auth';
import { MwaProvider } from '../contexts/MwaProvider';
import { GlobalNotificationManager } from '../components/GlobalNotificationManager';
import { useFonts } from 'expo-font';
import { Ionicons, Feather } from '@expo/vector-icons';
import { SpaceGrotesk_500Medium, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { SpaceMono_400Regular, SpaceMono_700Bold } from '@expo-google-fonts/space-mono';

// Route xem được khi chưa đăng nhập (segment đầu tiên của expo-router)
// (onboarding): welcome công khai; setup/fund/profile/mode tự chuyển về welcome nếu chưa đăng nhập
const PUBLIC_SEGMENTS = new Set(['', 'index', '(onboarding)', 'login', 'poc-dynamic', '+not-found']);

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

export default function RootLayout() {
  const [loaded] = useFonts({
    ...Ionicons.font,
    ...Feather.font,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    SpaceMono_400Regular,
    SpaceMono_700Bold,
  });

  const initialMetrics = Platform.OS === 'web' 
    ? {
        frame: { x: 0, y: 0, width: 0, height: 0 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }
    : undefined;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider style={styles.root} initialMetrics={initialMetrics}>
        <View style={styles.root}>
          <AuthProvider>
            <MwaProvider>
                  <View style={styles.root}>
                    <AuthGate />
                    <Stack screenOptions={{ headerShown: false }}>
                      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                      <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
                      <Stack.Screen name="home" options={{ headerShown: false }} />
                      <Stack.Screen name="history" options={{ headerShown: false }} />
                      <Stack.Screen name="settings" options={{ headerShown: false }} />
                      <Stack.Screen name="login" options={{ headerShown: false }} />
                      <Stack.Screen name="send" options={{ headerShown: false }} />
                      <Stack.Screen name="receive" options={{ headerShown: false }} />
                      <Stack.Screen name="notification-detail" options={{ headerShown: false }} />
                      <Stack.Screen name="scan-qr" options={{ headerShown: false, animation: 'fade' }} />
                      <Stack.Screen name="+not-found" options={{ headerShown: false }} />
                    </Stack>
                    <GlobalNotificationManager />
                  </View>
            </MwaProvider>
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
});