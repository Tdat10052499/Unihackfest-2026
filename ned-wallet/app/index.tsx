import React from 'react';
import { View, Text, Button, StyleSheet, ActivityIndicator } from 'react-native';
import { usePrivy, useLoginWithOAuth } from '@privy-io/expo';

export default function LoginScreen() {
  const { isReady, user, logout } = usePrivy();
  const oAuth = useLoginWithOAuth();

  const handleLogin = async () => {
    try {
      if (oAuth?.login) {
        await oAuth.login({ provider: 'google' });
      }
    } catch (e) {
      console.log('Login error:', e);
    }
  };

  if (!isReady) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Đang khởi tạo môi trường...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {user ? (
        <View style={styles.card}>
          <Text style={styles.title}>Đăng nhập thành công!</Text>
          <Text>User ID: {user.id.slice(0, 10)}...</Text>
          {(user as any).wallet ? (
            <Text>Ví ngầm: {(user as any).wallet.address.slice(0, 8)}...</Text>
          ) : (
            <Text>Chưa có ví ngầm.</Text>
          )}
          <View style={{ marginTop: 20 }}>
            <Button title="Đăng xuất" onPress={logout} color="red" />
          </View>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.title}>NorthAxis E-Wallet (N.E.D)</Text>
          <Text style={{ marginBottom: 20 }}>Vui lòng đăng nhập để tiếp tục</Text>
          <Button title="Đăng nhập với Privy" onPress={handleLogin} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  card: { padding: 20, backgroundColor: 'white', borderRadius: 10, alignItems: 'center', elevation: 3 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
});
