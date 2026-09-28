// Settings (PDF trang 34 / Settings.dc.html). Chỉ hiện mục đã có tính năng thật; mục chưa làm (App lock,
// Notifications, Language, đổi chế độ ví) không hiện để không hứa điều app chưa làm được.
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { PublicKey } from '@solana/web3.js';
import {
  Badge,
  Button,
  Card,
  DText,
  IconButton,
  ListGroup,
  ListRow,
  Screen,
  SectionLabel,
} from '@/components/design';
import { colors, diagonal, fonts, gradients, radius, space, type } from '@/constants/design';
import { MASCOT_IMAGES } from '@/constants/mascot';
import { WalletNav } from '@/components/wallet/WalletNav';
import { PhoneManagementModal } from '@/components/PhoneManagementModal';
import { useAuth } from '@/services/auth';
import { executeHardReset } from '@/services/storage';
import { getOwnPhone } from '@/services/identity/ownPhone';
import { fetchReverseRecord } from '@/services/identity/dualPda';
import { identityConnection, shortAddress } from '@/services/identity/resolve';
import { maskPhoneDisplay } from '@/services/identity/format';
import { resetDemoLedger } from '@/services/demoLedger';
import { useUserStore } from '@/stores/useUserStore';
import { useWalletModeStore } from '@/stores/useWalletModeStore';

const MODE_COPY = {
  simple: { name: 'Simple', desc: 'Your money in dollars. Crypto you receive becomes Cash.', icon: 'dollar-sign' },
  crypto: { name: 'Crypto', desc: 'See and hold every Solana token you own.', icon: 'sliders' },
} as const;

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout, walletAddress } = useAuth();
  const { username, avatarUrl, setAvatarUrl, fetchUserProfile, loadFromStorage } = useUserStore();
  const mode = useWalletModeStore((s) => (walletAddress ? s.modes[walletAddress] : undefined));
  const [phone, setPhone] = useState<string | null>(null);
  const [phoneLinked, setPhoneLinked] = useState<boolean | null>(null);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [picking, setPicking] = useState(false);
  const [copied, setCopied] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadFromStorage();
      if (walletAddress) fetchUserProfile(walletAddress);
    }, [walletAddress, loadFromStorage, fetchUserProfile]),
  );

  useEffect(() => {
    let active = true;
    if (walletAddress)
      Promise.all([fetchReverseRecord(identityConnection, new PublicKey(walletAddress)), getOwnPhone()])
        .then(([record, own]) => {
          if (!active) return;
          setPhoneLinked(record?.hasPhone ?? false);
          setPhone(record?.hasPhone ? own : null);
        })
        .catch(() => {
          if (active) {
            setPhoneLinked(null);
            setPhone(null);
          }
        });
    return () => {
      active = false;
    };
  }, [walletAddress, showPhoneModal]);

  const handle = username ? `@${username}` : walletAddress ? shortAddress(walletAddress) : 'No profile yet';
  const identityLine = [username ? `@${username}` : null, phone ? maskPhoneDisplay(phone) : null]
    .filter(Boolean)
    .join(' · ');
  const modeCopy = mode ? MODE_COPY[mode] : null;
  const version = Constants.expoConfig?.version ?? '1.0.0';

  async function pickAvatar() {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Photo access needed', 'Allow photo access to change your picture.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });
      const asset = result.canceled ? null : result.assets?.[0];
      if (!asset) return;
      if (!asset.base64) {
        Alert.alert('Could not load photo', 'Please try another picture.');
        return;
      }
      setPicking(true);
      setAvatarUrl(`data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`);
    } catch (err) {
      Alert.alert('Could not update picture', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setPicking(false);
    }
  }

  async function copyAddress() {
    if (!walletAddress) return;
    try {
      await Clipboard.setStringAsync(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  function signOut() {
    Alert.alert('Sign out?', 'Your wallet stays safe. Sign in again with Google anytime.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          try {
            await executeHardReset(logout);
          } finally {
            router.replace('/welcome');
          }
        },
      },
    ]);
  }

  const phoneSubtitle =
    phoneLinked === null
      ? 'Checking your profile…'
      : phoneLinked
        ? phone
          ? `${maskPhoneDisplay(phone)} · tap to unlink`
          : 'Linked on-chain · tap to unlink'
        : 'Let friends pay you by phone number';

  return (
    <View style={styles.page}>
      <Screen contentStyle={styles.content} edges={['top', 'left', 'right']}>
        <DText variant="h1" accessibilityRole="header" style={styles.title}>
          Settings
        </DText>

        <Card style={styles.profile}>
          <View style={styles.profileRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Change profile picture"
              onPress={() => void pickAvatar()}
              disabled={picking}
            >
              <LinearGradient colors={gradients.purpleIndigo} {...diagonal} style={styles.avatar}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                ) : (
                  <Image source={MASCOT_IMAGES.lineArt} style={styles.avatarArt} resizeMode="contain" />
                )}
                {picking ? (
                  <View style={styles.avatarBusy}>
                    <ActivityIndicator color={colors.text} />
                  </View>
                ) : null}
              </LinearGradient>
            </Pressable>
            <View style={styles.profileText}>
              <DText variant="h3" style={styles.profileName} numberOfLines={1}>
                {username || handle}
              </DText>
              {identityLine ? (
                <DText variant="caption" tone="secondary" numberOfLines={1}>
                  {identityLine}
                </DText>
              ) : null}
              {user ? <Badge label="Signed in with Google" icon="refresh-cw" style={styles.googleBadge} /> : null}
            </View>
            <IconButton
              icon="grid"
              accessibilityLabel="Show my QR code"
              color={colors.text}
              onPress={() => router.push('/receive' as Href)}
            />
          </View>
        </Card>

        {modeCopy ? (
          <>
            <SectionLabel>Wallet mode</SectionLabel>
            <Card variant="accent">
              <View style={styles.modeRow}>
                <View style={styles.modeIcon}>
                  <Feather name={modeCopy.icon} size={18} color={colors.text} />
                </View>
                <View style={styles.profileText}>
                  <View style={styles.modeTitleRow}>
                    <DText variant="h3" style={styles.modeName}>
                      {modeCopy.name}
                    </DText>
                    <Badge label="ON" tone="accent" />
                  </View>
                  <DText variant="caption" tone="secondary">
                    {modeCopy.desc}
                  </DText>
                </View>
              </View>
            </Card>
          </>
        ) : null}

        <SectionLabel>Account</SectionLabel>
        <ListGroup>
          <ListRow
            icon="phone"
            title={phoneLinked ? 'Phone number' : 'Link phone number'}
            subtitle={phoneSubtitle}
            onPress={walletAddress && phoneLinked !== null ? () => setShowPhoneModal(true) : undefined}
            chevron={phoneLinked !== null}
          />
          <ListRow
            icon="credit-card"
            title="Wallet address"
            subtitle={copied ? 'Copied' : 'Tap to copy'}
            value={walletAddress ? shortAddress(walletAddress) : '—'}
            onPress={walletAddress ? () => void copyAddress() : undefined}
            chevron={false}
            right={<Feather name={copied ? 'check' : 'copy'} size={16} color={copied ? colors.successText : colors.textTertiary} />}
          />
        </ListGroup>

        <SectionLabel>Preferences</SectionLabel>
        <ListGroup>
          <ListRow icon="dollar-sign" title="Display currency" value="USD ($)" />
        </ListGroup>

        <SectionLabel>Security</SectionLabel>
        <ListGroup>
          <ListRow
            icon="shield"
            iconTone="success"
            title="Wallet protection"
            subtitle="MPC wallet by Dynamic. No recovery phrase to lose."
          />
          <ListRow
            icon="key"
            title="New phone?"
            subtitle="Sign in with the same Google account to get your wallet back."
          />
        </ListGroup>

        <SectionLabel>Help & about</SectionLabel>
        <ListGroup>
          <ListRow
            icon="info"
            title={`Version ${version}`}
            subtitle="Demo build on Solana Devnet"
            right={<Badge label="DEVNET" tone="warning" />}
          />
        </ListGroup>

        <Button title="Sign out" icon="log-out" variant="destructive" onPress={signOut} style={styles.signOut} />
        <DText variant="caption" align="center" style={styles.signOutNote}>
          Your wallet stays safe. Sign in again with Google anytime.
        </DText>

        {__DEV__ && walletAddress ? (
          <Button
            title="Reset demo data"
            variant="ghost"
            onPress={() =>
              Alert.alert('Reset demo data?', 'This clears demo swaps and xStock positions.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Reset', style: 'destructive', onPress: () => void resetDemoLedger(walletAddress) },
              ])
            }
          />
        ) : null}
      </Screen>

      {walletAddress && user ? (
        <PhoneManagementModal
          visible={showPhoneModal}
          onClose={() => setShowPhoneModal(false)}
          userId={user.id}
          walletAddress={walletAddress}
          currentPhone={phone}
          onPhoneUpdated={(next) => {
            setPhone(next);
            setPhoneLinked(!!next);
          }}
        />
      ) : null}
      <WalletNav active="Settings" />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: space[4], paddingBottom: 120 },
  title: { paddingHorizontal: space[1], paddingTop: space[2], paddingBottom: space[4], fontFamily: fonts.display },
  profile: { marginTop: 0 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  avatarImage: { width: 56, height: 56 },
  avatarArt: { width: 56, height: 57, marginBottom: -5 },
  avatarBusy: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  profileText: { flex: 1, minWidth: 0, gap: 2 },
  profileName: { fontFamily: fonts.display },
  googleBadge: { marginTop: space[1] },
  modeRow: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  modeIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.purple[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeTitleRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  modeName: { ...type.h3, fontFamily: fonts.display },
  signOut: { marginTop: space[6] },
  signOutNote: { marginTop: space[2], marginBottom: space[2] },
});

