// Receive (PDF trang 19 / Receive.dc.html): QR địa chỉ ví, @username, SĐT đã liên kết (che), địa chỉ ví, cảnh báo mạng, chia sẻ.
import React, { useEffect, useState } from 'react';
import { Image, Platform, Pressable, Share, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import { PublicKey } from '@solana/web3.js';
import { Button, DText, Header, Notice, Screen } from '@/components/design';
import { colors, diagonal, fonts, glass, gradients, light, radius, shadows, space, type } from '@/constants/design';
import { MASCOT_IMAGES } from '@/constants/mascot';
import { useAuth } from '@/services/auth';
import { useUserStore } from '@/stores/useUserStore';
import { fetchReverseRecord } from '@/services/identity/dualPda';
import { identityConnection, shortAddress } from '@/services/identity/resolve';
import { getOwnPhone } from '@/services/identity/ownPhone';
import { maskPhoneDisplay } from '@/services/identity/format';

export default function ReceiveScreen() {
  const router = useRouter();
  const { walletAddress } = useAuth();
  const username = useUserStore((s) => s.username);
  const [phone, setPhone] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (walletAddress) {
      void useUserStore.getState().fetchUserProfile(walletAddress);
      Promise.all([fetchReverseRecord(identityConnection, new PublicKey(walletAddress)), getOwnPhone()])
        .then(([record, own]) => active && setPhone(record?.hasPhone ? own : null))
        .catch(() => active && setPhone(null));
    }
    return () => {
      active = false;
    };
  }, [walletAddress]);

  const handle = username ? `@${username}` : null;
  const back = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));

  async function copy(label: string, value: string) {
    try {
      await Clipboard.setStringAsync(value);
      setCopied(label);
      setTimeout(() => setCopied((c) => (c === label ? null : c)), 1600);
    } catch {
      setCopied(null);
    }
  }

  async function share() {
    if (!walletAddress) return;
    const message = [
      handle ? `Find me on N.E.D: ${handle}` : 'My N.E.D wallet',
      `Solana address: ${walletAddress}`,
      'Only send USDC, SOL or Solana tokens.',
    ].join('\n');
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && !navigator.share) {
        await copy('Details', message);
        return;
      }
      await Share.share({ message });
    } catch {
      await copy('Details', message);
    }
  }

  const rows = [
    handle ? { label: 'Username', value: handle, copyValue: handle } : null,
    phone ? { label: 'Phone number', value: maskPhoneDisplay(phone), copyValue: phone } : null,
    walletAddress
      ? { label: 'Wallet address', value: shortAddress(walletAddress), copyValue: walletAddress }
      : null,
  ].filter((r): r is { label: string; value: string; copyValue: string } => !!r);

  return (
    <Screen
      glow="receive"
      footer={
        <Button
          title={copied === 'Details' ? 'Details copied' : 'Share my details'}
          icon="share"
          onPress={() => void share()}
          disabled={!walletAddress}
        />
      }
    >
      <Header title="Receive" onBack={back} />
      <DText variant="body" align="center" style={styles.lead}>
        People on N.E.D can send you USDC with your @username or phone number. Anyone else can scan this code.
      </DText>

      <View style={styles.qrCard}>
        {walletAddress ? (
          <>
            <QRCode value={walletAddress} size={208} color={light.text} backgroundColor={colors.white} ecl="H" />
            <LinearGradient colors={gradients.purpleIndigo} {...diagonal} style={styles.qrLogo}>
              <Image source={MASCOT_IMAGES.lineArt} style={styles.qrLogoImage} resizeMode="contain" />
            </LinearGradient>
          </>
        ) : (
          <DText variant="caption" tone="onLightSecondary">
            Wallet not ready yet.
          </DText>
        )}
      </View>

      <DText variant="h2" align="center" style={styles.handle}>
        {handle ?? (walletAddress ? shortAddress(walletAddress) : '—')}
      </DText>
      <DText variant="caption" tone="secondary" align="center">
        N.E.D wallet · Solana
      </DText>

      <View style={styles.details}>
        {rows.map((row, i) => (
          <View key={row.label} style={[styles.detailRow, i > 0 && styles.detailBorder]}>
            <View style={styles.detailText}>
              <DText variant="caption" tone="secondary">
                {row.label}
              </DText>
              <DText variant="mono" style={styles.detailValue} numberOfLines={1}>
                {row.value}
              </DText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Copy ${row.label.toLowerCase()}`}
              onPress={() => void copy(row.label, row.copyValue)}
              style={styles.copy}
              hitSlop={6}
            >
              <Feather
                name={copied === row.label ? 'check' : 'copy'}
                size={18}
                color={copied === row.label ? colors.successText : colors.textSecondary}
              />
            </Pressable>
          </View>
        ))}
      </View>

      <Notice tone="warning" style={styles.notice}>
        <DText variant="caption" tone="primary">
          Only receive <DText variant="caption" style={styles.strong}>USDC, SOL or Solana tokens</DText>. Funds sent
          from another network can&apos;t be recovered.
        </DText>
      </Notice>
    </Screen>
  );
}

const styles = StyleSheet.create({
  lead: { marginTop: -space[1], paddingHorizontal: space[2] },
  qrCard: {
    alignSelf: 'center',
    marginTop: space[5],
    width: 244,
    height: 244,
    borderRadius: 26, // thẻ QR của Receive.dc.html
    boxShadow: shadows.qrCard,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrLogo: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 3,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  qrLogoImage: { width: 40, height: 40 },
  handle: { ...type.h1, textAlign: 'center', marginTop: space[5] },
  details: {
    marginTop: space[5],
    borderRadius: radius.xl,
    backgroundColor: glass.fill,
    borderWidth: 1,
    borderColor: glass.border,
    paddingHorizontal: space[4],
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[3] },
  detailBorder: { borderTopWidth: 1, borderColor: glass.divider },
  detailText: { flex: 1, minWidth: 0, gap: 2 },
  detailValue: { fontFamily: fonts.monoBold },
  copy: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  notice: { marginTop: space[4] },
  strong: { fontFamily: fonts.bodySemi, color: colors.text },
});
