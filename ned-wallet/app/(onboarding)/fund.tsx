// Onboarding — Fund wallet (T1.6, không có trong thiết kế): không có gas sponsorship nên ví cần SOL devnet
// để trả rent hồ sơ (Name + Reverse [+ Phone]) + ATA USDC + phí. Tự kiểm tra số dư mỗi 3s, đủ → Profile.
import React, { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { Feather } from '@expo/vector-icons';
import { Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { useAuth } from '../../services/auth';
import { formatSol, getSetupCost } from '../../services/onboarding';
import { NoticeCard, OnbScreen, PrimaryButton, onbText } from '../../components/onboarding/ui';
import { onbColors, onbFonts } from '../../components/onboarding/theme';

const POLL_MS = 3000;
const FAUCET_URL = 'https://faucet.solana.com';
// RPC công khai cho requestAirdrop (RPC Helius/Dynamic có thể không hỗ trợ airdrop)
const PUBLIC_DEVNET_RPC = 'https://api.devnet.solana.com';

export default function FundScreen() {
  const { isReady, isAuthenticated, walletAddress, connection } = useAuth();
  const [required, setRequired] = useState<number | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [airdrop, setAirdrop] = useState<'idle' | 'loading' | 'sent' | 'failed'>('idle');
  const [airdropError, setAirdropError] = useState('');

  useEffect(() => {
    if (isReady && !isAuthenticated) router.replace('/welcome');
  }, [isReady, isAuthenticated]);

  // Số SOL cần: rent thật (getMinimumBalanceForRentExemption) + phí + biên an toàn
  useEffect(() => {
    let cancelled = false;
    getSetupCost(connection)
      .then((cost) => !cancelled && setRequired(cost.required))
      .catch((err) => console.warn('[fund] cost failed:', err));
    return () => {
      cancelled = true;
    };
  }, [connection]);

  const refresh = useCallback(async () => {
    if (!walletAddress) return;
    try {
      setBalance(await connection.getBalance(new PublicKey(walletAddress), 'confirmed'));
    } catch (err) {
      console.warn('[fund] balance failed:', err);
    }
  }, [walletAddress, connection]);

  // Poll số dư mỗi 3s
  useEffect(() => {
    const first = setTimeout(refresh, 0);
    const timer = setInterval(refresh, POLL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [refresh]);

  const enough = required !== null && balance !== null && balance >= required;
  useEffect(() => {
    if (enough) router.replace('/profile');
  }, [enough]);

  const copyAddress = async () => {
    if (!walletAddress) return;
    await Clipboard.setStringAsync(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getTestSol = async () => {
    if (!walletAddress) return;
    setAirdrop('loading');
    setAirdropError('');
    try {
      const faucet = new Connection(PUBLIC_DEVNET_RPC, 'confirmed');
      const signature = await faucet.requestAirdrop(new PublicKey(walletAddress), LAMPORTS_PER_SOL);
      await faucet.confirmTransaction(signature, 'confirmed');
      setAirdrop('sent');
      refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setAirdrop('failed');
      setAirdropError(
        /429|limit|dry/i.test(message)
          ? 'The in-app faucet is busy (daily limit reached). Use the Solana faucet below instead.'
          : 'Could not get test SOL right now. Use the Solana faucet below instead.'
      );
    }
  };

  return (
    <OnbScreen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.badge}>
          <Feather name="droplet" size={12} color={onbColors.warning} />
          <Text style={styles.badgeText}>Devnet test SOL — no real money</Text>
        </View>
        <Text style={[onbText.h1, styles.title]} accessibilityRole="header">
          Add test SOL to get started
        </Text>
        <Text style={[onbText.lead, styles.lead]}>
          Your profile lives on Solana. Creating it stores a little data on-chain, paid with devnet SOL (free test
          money). This is a one-time step.
        </Text>

        <View style={styles.amounts}>
          <View style={styles.amount}>
            <Text style={styles.amountLabel}>Needed</Text>
            <Text style={styles.amountValue}>{required === null ? '…' : `≈ ${formatSol(required)} SOL`}</Text>
          </View>
          <View style={styles.amountDivider} />
          <View style={styles.amount}>
            <Text style={styles.amountLabel}>Your balance</Text>
            <Text style={[styles.amountValue, enough && { color: onbColors.successText }]}>
              {balance === null ? '…' : `${formatSol(balance)} SOL`}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.qr}>{walletAddress ? <QRCode value={walletAddress} size={148} /> : null}</View>
          <Text style={styles.cardLabel}>Your wallet address (Solana devnet)</Text>
          <Text style={styles.address} selectable>
            {walletAddress ?? '…'}
          </Text>
          <Pressable accessibilityRole="button" onPress={copyAddress} style={styles.copy}>
            <Feather name={copied ? 'check' : 'copy'} size={14} color={onbColors.lavender} />
            <Text style={styles.copyText}>{copied ? 'Copied' : 'Copy address'}</Text>
          </Pressable>
        </View>

        {airdrop === 'sent' ? (
          <NoticeCard tone="info" style={styles.notice}>
            <Text style={onbText.small}>1 test SOL is on its way. We will continue automatically.</Text>
          </NoticeCard>
        ) : null}
        {airdrop === 'failed' ? (
          <NoticeCard tone="warning" style={styles.notice}>
            <Text style={onbText.small}>{airdropError}</Text>
          </NoticeCard>
        ) : null}

        <PrimaryButton title="Get test SOL" onPress={getTestSol} loading={airdrop === 'loading'} disabled={!walletAddress} />
        <Pressable accessibilityRole="link" onPress={() => Linking.openURL(FAUCET_URL)} style={styles.faucet}>
          <Text style={styles.faucetText}>Or open faucet.solana.com (choose Devnet, paste your address)</Text>
          <Feather name="external-link" size={13} color={onbColors.lavender} />
        </Pressable>
        <Text style={[onbText.caption, styles.waiting]}>Checking your balance every few seconds…</Text>
      </ScrollView>
    </OnbScreen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 28 },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.35)',
  },
  badgeText: { fontFamily: onbFonts.bodySemi, fontSize: 11, color: onbColors.warning },
  title: { marginTop: 14 },
  lead: { marginTop: 8 },
  amounts: {
    marginTop: 20,
    flexDirection: 'row',
    padding: 14,
    borderRadius: 16,
    backgroundColor: onbColors.surface,
    borderWidth: 1,
    borderColor: onbColors.border,
  },
  amount: { flex: 1, gap: 4 },
  amountDivider: { width: 1, backgroundColor: onbColors.border, marginHorizontal: 12 },
  amountLabel: { fontFamily: onbFonts.body, fontSize: 12, color: onbColors.textSubtle },
  amountValue: { fontFamily: onbFonts.monoBold, fontSize: 15, color: onbColors.text },
  card: {
    marginTop: 16,
    padding: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: onbColors.border,
    alignItems: 'center',
  },
  qr: { padding: 10, borderRadius: 12, backgroundColor: '#FFFFFF' },
  cardLabel: { marginTop: 14, fontFamily: onbFonts.bodySemi, fontSize: 12, color: onbColors.textSubtle },
  address: { marginTop: 6, fontFamily: onbFonts.mono, fontSize: 13, color: onbColors.text, textAlign: 'center' },
  copy: {
    marginTop: 10,
    minHeight: 44,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 9999,
    backgroundColor: 'rgba(155,79,222,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(155,79,222,0.4)',
  },
  copyText: { fontFamily: onbFonts.bodySemi, fontSize: 13, color: '#E4D0FA' },
  notice: { marginTop: 16 },
  faucet: {
    marginTop: 12,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  faucetText: { fontFamily: onbFonts.bodyMedium, fontSize: 13, color: onbColors.lavender, textAlign: 'center' },
  waiting: { marginTop: 4 },
});
