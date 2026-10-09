import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Button, DText, Screen } from '@/components/design';
import { colors, glass, radius, space } from '@/constants/design';

/**
 * Catch-all route for Expo Router: absorbs every unmatched URL (including deep-link callbacks)
 * and navigates safely back to Home
 */
export default function NotFoundScreen() {
  const router = useRouter();

  useEffect(() => {
    // Go back to the main screen automatically
    const timer = setTimeout(() => {
      router.replace('/(tabs)');
    }, 200);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false, title: 'Redirecting' }} />
      <Screen glow="settings" scroll={false} contentStyle={styles.container}>
        <View style={styles.iconBox}>
          <ActivityIndicator size="large" color={colors.purple[300]} />
        </View>
        <DText variant="h3" align="center">
          Taking you home…
        </DText>
        <DText variant="body" align="center" style={styles.subtitle}>
          We&apos;re finishing up and sending you back to Home.
        </DText>
        <Button title="Go to Home" icon="home" compact onPress={() => router.replace('/(tabs)')} style={styles.button} />
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', padding: space[6] },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: glass.fill,
    borderWidth: 1,
    borderColor: glass.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: space[5],
  },
  subtitle: { marginTop: space[2], marginBottom: space[6] },
  button: { alignSelf: 'center' },
});
