import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

/**
 * Route trung gian hấp thụ callback Deep Link khi ký thông điệp xác thực SIWS từ ví ngoài
 */
export default function OnSignMessageCallbackScreen() {
  const router = useRouter();

  useEffect(() => {
    // Giữ người dùng ở màn hình Login
    const timer = setTimeout(() => {
      router.replace('/login');
    }, 50);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#AB9FF2" />
      <Text style={styles.text}>Đang xử lý chữ ký xác thực...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  text: {
    marginTop: 16,
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
});
