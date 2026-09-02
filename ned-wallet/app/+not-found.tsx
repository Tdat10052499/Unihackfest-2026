import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

/**
 * Catch-all route cho Expo Router: Tự động hấp thụ mọi URL không khớp (bao gồm các callback deep link)
 * và điều hướng an toàn về Dashboard/Home
 */
export default function NotFoundScreen() {
  const router = useRouter();

  useEffect(() => {
    // Tự động điều hướng về màn hình chính
    const timer = setTimeout(() => {
      router.replace('/(tabs)');
    }, 200);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false, title: 'Đang chuyển hướng' }} />
      <View style={styles.container}>
        <View style={styles.iconBox}>
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
        <Text style={styles.title}>Đang Điều Hướng...</Text>
        <Text style={styles.subtitle}>Đang xử lý phản hồi và đưa bạn về màn hình chính.</Text>

        <TouchableOpacity
          style={styles.homeBtn}
          onPress={() => router.replace('/(tabs)')}
          activeOpacity={0.8}
        >
          <Ionicons name="home-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.homeBtnText}>Về Trang Chủ</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  homeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  homeBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
