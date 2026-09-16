import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

const SESSION_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24 hours

export default function WelcomeScreen() {
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const lastActiveStr = await AsyncStorage.getItem('ned_last_active_time');
      if (lastActiveStr) {
        const lastActiveTime = parseInt(lastActiveStr, 10);
        if (Date.now() - lastActiveTime < SESSION_TIMEOUT_MS) {
          // Session valid, auto login
          console.log("🕒 [Session] Valid session found, auto navigating to home");
          router.replace('/(tabs)');
          return;
        }
      }
      // If we reach here, session is expired or doesn't exist
      setIsChecking(false);
    } catch (e) {
      console.error("Failed to check session", e);
      setIsChecking(false);
    }
  };

  const handleStart = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      await AsyncStorage.setItem('ned_last_active_time', Date.now().toString());
    } catch (e) {
      // ignore
    }
    router.replace('/(auth)');
  };

  if (isChecking) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D32F2F" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.titleContainer}>
          <Text style={styles.titleText}>Welcome to</Text>
          <Text style={styles.titleText}>NorthAxis E-Wallet</Text>
          
          <View style={styles.logoRow}>
            <Text style={[styles.logoLetter, { color: '#8B5CF6' }]}>N</Text>
            <Text style={styles.logoDot}>.</Text>
            <Text style={[styles.logoLetter, { color: '#D32F2F', marginTop: 16 }]}>E</Text>
            <Text style={[styles.logoDot, { marginTop: 16 }]}>.</Text>
            <Text style={[styles.logoLetter, { color: '#06B6D4' }]}>D</Text>
            <Text style={styles.logoDot}>.</Text>
          </View>
        </View>

        <Image 
          source={require('../assets/images/mascot-welcome.png')} 
          style={styles.mascotImage}
          resizeMode="contain"
        />

        <View style={styles.pagination}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
      </View>

      <TouchableOpacity 
        style={styles.startBtnWrapper} 
        activeOpacity={0.85}
        onPress={handleStart}
      >
        <View style={styles.startBtnShadow} />
        <View style={styles.startBtnBody}>
          <Text style={styles.startBtnText}>BẮT ĐẦU</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FDF8F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#FDF8F5',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 80,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  titleText: {
    fontSize: 20,
    fontFamily: 'Inter-Black',
    color: '#000',
    textAlign: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  logoLetter: {
    fontSize: 48,
    fontFamily: 'Outfit-Bold',
    fontWeight: '900',
  },
  logoDot: {
    fontSize: 48,
    fontFamily: 'Outfit-Bold',
    fontWeight: '900',
    color: '#000',
    marginHorizontal: 8,
  },
  mascotImage: {
    width: 320,
    height: 300,
    marginBottom: 40,
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#000',
    backgroundColor: 'transparent',
  },
  dotActive: {
    width: 24,
    backgroundColor: '#000',
  },
  startBtnWrapper: {
    position: 'relative',
    width: '100%',
    height: 60,
  },
  startBtnShadow: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: -4,
    bottom: -4,
    backgroundColor: '#000',
    borderRadius: 12,
  },
  startBtnBody: {
    width: '100%',
    height: '100%',
    backgroundColor: '#D32F2F',
    borderWidth: 3,
    borderColor: '#000',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  startBtnText: {
    fontSize: 18,
    fontFamily: 'Inter-Black',
    color: '#FFF',
    letterSpacing: 1,
  },
});
