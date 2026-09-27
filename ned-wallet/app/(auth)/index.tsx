// Màn đăng nhập — chỉ "Continue with Google" qua Dynamic (UI mới làm ở Phase 4).
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MASCOT_IMAGES } from '../../constants/mascot';
import { useTranslation } from '@/services/i18n';
import { useAuth } from '@/services/auth';
// TODO(T1.3): người mới / quay lại = có Reverse PDA [b"reverse", wallet] — hiện tra hồ sơ cục bộ
import { getUserProfileFromDB } from '@/services/profile';

export default function AuthGatewayScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { status, user, walletAddress, error, login } = useAuth();
  const [isStarting, setIsStarting] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Đăng nhập xong + ví sẵn sàng → người quay lại vào Home, người mới vào onboarding
  useEffect(() => {
    if (status !== 'ready' || !walletAddress) return;
    let cancelled = false;
    (async () => {
      const profile =
        (await getUserProfileFromDB(walletAddress)) ?? (user ? await getUserProfileFromDB(user.id) : null);
      if (cancelled) return;
      router.replace(profile?.username ? '/home' : '/(onboarding)/phone');
    })();
    return () => {
      cancelled = true;
    };
  }, [status, walletAddress, user, router]);

  const handleGoogleLogin = async () => {
    setLoginError('');
    setIsStarting(true);
    try {
      await login();
    } catch (err) {
      setLoginError(
        err instanceof Error
          ? err.message
          : t('auth.googleAuthFailed', { defaultValue: 'Could not sign in with Google. Please try again.' })
      );
    } finally {
      setIsStarting(false);
    }
  };

  const isBusy = isStarting || status === 'initializing' || status === 'setting-up' || status === 'ready';
  const shownError = loginError || (status === 'error' || status === 'unconfigured' ? error : '');

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FDF8F5" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.brandHeader}>
          <View style={styles.logoBadge}>
            <Image source={MASCOT_IMAGES.waving} style={styles.mascotImage} resizeMode="contain" />
          </View>
          <Text style={styles.brandTitle}>N.E.D WALLET</Text>
          <Text style={styles.brandSubtitle}>
            {t('auth.walletSlogan', { defaultValue: 'Your smart & secure Solana wallet' })}
          </Text>
        </View>

        <View style={styles.ticketWrapper}>
          <View style={styles.ticketShadow} />
          <View style={styles.ticketBody}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>{t('auth.welcomeTitle', { defaultValue: 'Welcome' })}</Text>
              <Text style={styles.formSubtitle}>
                {status === 'setting-up'
                  ? t('auth.settingUpWallet', { defaultValue: 'Setting up your wallet…' })
                  : t('auth.googleOnlySubtitle', { defaultValue: 'Sign in with Google to get your wallet — no seed phrase.' })}
              </Text>
            </View>

            {shownError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{shownError}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.socialBtnWrapper, isBusy && styles.primaryBtnDisabled]}
              onPress={handleGoogleLogin}
              disabled={isBusy}
              activeOpacity={0.85}
            >
              <View style={styles.socialBtnShadow} />
              <View style={styles.socialBtnBody}>
                {isBusy ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <View style={styles.socialBtnInner}>
                    <View style={styles.socialBtnIconContainer}>
                      <Ionicons name="logo-google" size={20} color="#EA4335" />
                    </View>
                    <Text style={styles.socialBtnText}>
                      {t('auth.continueWithGoogle', { defaultValue: 'Continue with Google' })}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footerSection}>
          <Text style={styles.footerTermsText}>
            {t('auth.poweredByDynamic', { defaultValue: 'Embedded wallet secured by Dynamic (MPC).' })}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#FDF8F5',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#FFD54F',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  mascotImage: {
    width: '80%',
    height: '80%',
  },
  brandTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Black',
    color: '#000',
    marginTop: 12,
  },
  brandSubtitle: {
    fontSize: 12,
    color: '#555',
    marginTop: 4,
    textAlign: 'center',
  },
  ticketWrapper: {
    width: '100%',
    position: 'relative',
    marginBottom: 40,
  },
  ticketShadow: {
    position: 'absolute',
    top: 5,
    left: 5,
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
    borderRadius: 24,
  },
  ticketBody: {
    backgroundColor: '#FFF',
    borderWidth: 3,
    borderColor: '#000',
    borderRadius: 24,
    padding: 24,
    zIndex: 2, // Trên shadow
  },
  formHeader: {
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Black',
    color: '#000',
  },
  formSubtitle: {
    fontSize: 13,
    color: '#555',
    marginTop: 6,
    fontWeight: '500',
  },
  primaryBtnDisabled: {
    opacity: 0.7,
  },
  socialBtnWrapper: {
    width: '100%',
    height: 52,
    position: 'relative',
    marginBottom: 16,
  },
  socialBtnShadow: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: -3,
    bottom: -3,
    backgroundColor: '#000',
    borderRadius: 12,
  },
  socialBtnBody: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 12,
    justifyContent: 'center',
  },
  socialBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  socialBtnIconContainer: {
    width: 24,
    alignItems: 'flex-start',
  },
  socialBtnText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontFamily: 'Inter-Black',
    color: '#000',
    marginRight: 24, // Để cân bằng với icon bên trái
  },
  footerSection: {
    marginTop: 24,
    alignItems: 'center',
    marginBottom: 4, // Tránh sát viền
  },
  footerTermsText: {
    fontSize: 11,
    color: '#777',
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 20,
    fontWeight: '600',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 8,
  },
  errorBannerText: {
    fontSize: 12,
    fontFamily: 'Inter-Black',
    color: '#DC2626',
    flex: 1,
  },
});
