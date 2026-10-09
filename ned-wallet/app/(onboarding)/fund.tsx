// Onboarding — Fund wallet (T1.6, không có trong thiết kế): không có gas sponsorship nên ví cần SOL devnet
// để trả rent hồ sơ (Name + Reverse [+ Phone]) + ATA USDC + phí. Tự kiểm tra số dư mỗi 3s, đủ → Profile.
// A4 / V2: runs after consent. In the Vietnam view (and before a region is chosen, which defaults to it) the step is
// silent: it asks the faucet by itself and shows "Preparing your account…", never a SOL amount. The international
// view keeps the amounts, labelled as test SOL for network fees.
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { Feather } from '@expo/vector-icons';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { requestTestSol, testSolBusy } from '../../services/testSol';
import { useAuth } from '../../services/auth';
import { formatSol, getSetupCost } from '../../services/onboarding';
import { NoticeCard, OnbScreen, PrimaryButton, onbText } from '../../components/onboarding/ui';
import { Badge, Card } from '../../components/design';
import { colors, fonts, glass, radius, sizes, space, type } from '../../constants/design';
import { useRegion } from '../../hooks/useRegion';

const POLL_MS = 3000;
const FAUCET_URL = 'https://faucet.solana.com';

export default function FundScreen() {
  const { isReady, isAuthenticated, walletAddress, connection } = useAuth();
  const [required, setRequired] = useState<number | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [airdrop, setAirdrop] = useState<'idle' | 'loading' | 'sent' | 'failed'>('idle');
  const [airdropError, setAirdropError] = useState('');
  const { region } = useRegion();
  // A4: no SOL amount in the Vietnam view; a wallet with no region yet counts as the Vietnam view
  const silent = region !== 'intl';
  const [manual, setManual] = useState(false);

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
      await requestTestSol(walletAddress, LAMPORTS_PER_SOL);
      setAirdrop('sent');
      refresh();
    } catch (err) {
      setAirdrop('failed');
      setAirdropError(
        testSolBusy(err)
          ? 'The in-app faucet is busy (daily limit reached). Use the Solana faucet below instead.'
          : 'Could not get test SOL right now. Use the Solana faucet below instead.'
      );
    }
  };

  // Silent mode: ask the faucet once, by itself
  const asked = React.useRef(false);
  useEffect(() => {
    if (!silent || !walletAddress || asked.current || enough) return;
    asked.current = true;
    void getTestSol();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [silent, walletAddress, enough]);

  if (silent) {
    return (
      <OnbScreen>
        <ScrollView contentContainerStyle={[styles.scroll, styles.silent]}>
          <ActivityIndicator size="large" color={colors.purple[200]} accessibilityLabel="Preparing your account" />
          <Text style={[onbText.h1, styles.title, styles.center]} accessibilityRole="header">
            Preparing your account…
          </Text>
          <Text style={[onbText.lead, styles.lead, styles.center]}>This takes a few seconds. We continue by ourselves.</Text>
          {airdrop === 'failed' ? (
            <>
              <NoticeCard tone="warning" style={styles.notice}>
                <Text style={onbText.small}>We could not prepare your account by ourselves. Try again in a minute.</Text>
              </NoticeCard>
              <PrimaryButton title="Try again" onPress={getTestSol} disabled={!walletAddress} />
              <Pressable accessibilityRole="button" onPress={() => setManual(!manual)} style={styles.faucet}>
                <Text style={styles.faucetText}>{manual ? 'Hide the manual way' : 'Do it by hand instead'}</Text>
              </Pressable>
              {manual ? (
                <Card style={styles.card}>
                  <Text style={styles.cardLabel}>Paste this address on faucet.solana.com (choose Devnet)</Text>
                  <Text style={styles.address} selectable>
                    {walletAddress ?? '…'}
                  </Text>
                  <Pressable accessibilityRole="button" onPress={copyAddress} style={styles.copy}>
                    <Feather name={copied ? 'check' : 'copy'} size={14} color={colors.purple[200]} />
                    <Text style={styles.copyText}>{copied ? 'Copied' : 'Copy address'}</Text>
                  </Pressable>
                  <Pressable accessibilityRole="link" onPress={() => Linking.openURL(FAUCET_URL)} style={styles.faucet}>
                    <Text style={styles.faucetText}>Open faucet.solana.com</Text>
                    <Feather name="external-link" size={13} color={colors.purple[200]} />
                  </Pressable>
                </Card>
              ) : null}
            </>
          ) : null}
          <Text style={[onbText.caption, styles.waiting, styles.center]}>Network fees use test SOL on devnet. It has no value.</Text>
        </ScrollView>
      </OnbScreen>
    );
  }

  return (
    <OnbScreen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Badge icon="droplet" tone="warning" label="Devnet test SOL — no real money" />
        <Text style={[onbText.h1, styles.title]} accessibilityRole="header">
          Add test SOL to get started
        </Text>
        <Text style={[onbText.lead, styles.lead]}>
          Your profile lives on Solana. Creating it stores a little data on-chain, covered by devnet SOL (test money
          with no value). This is a one-time step.
        </Text>

        <Card style={styles.amounts}>
          <View style={styles.amount}>
            <Text style={styles.amountLabel}>Needed</Text>
            <Text style={styles.amountValue}>{required === null ? '…' : `≈ ${formatSol(required)} SOL`}</Text>
          </View>
          <View style={styles.amountDivider} />
          <View style={styles.amount}>
            <Text style={styles.amountLabel}>Test SOL for network fees on devnet. It has no value.</Text>
            <Text style={[styles.amountValue, enough && { color: colors.successText }]}>
              {balance === null ? '…' : `${formatSol(balance)} SOL`}
            </Text>
          </View>
        </Card>

        <Card style={styles.card}>
          <View style={styles.qr}>{walletAddress ? <QRCode value={walletAddress} size={148} /> : null}</View>
          <Text style={styles.cardLabel}>Your wallet address (Solana devnet)</Text>
          <Text style={styles.address} selectable>
            {walletAddress ?? '…'}
          </Text>
          <Pressable accessibilityRole="button" onPress={copyAddress} style={styles.copy}>
            <Feather name={copied ? 'check' : 'copy'} size={14} color={colors.purple[200]} />
            <Text style={styles.copyText}>{copied ? 'Copied' : 'Copy address'}</Text>
          </Pressable>
        </Card>

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
          <Feather name="external-link" size={13} color={colors.purple[200]} />
        </Pressable>
        <Text style={[onbText.caption, styles.waiting]}>Checking your balance every few seconds…</Text>
      </ScrollView>
    </OnbScreen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: space[6], paddingTop: space[6], paddingBottom: space[8] },
  title: { marginTop: space[4] },
  lead: { marginTop: space[2] },
  amounts: { marginTop: space[5], flexDirection: 'row' },
  amount: { flex: 1, gap: space[1] },
  amountDivider: { width: 1, backgroundColor: glass.border, marginHorizontal: space[3] },
  amountLabel: type.caption,
  amountValue: { ...type.mono, fontFamily: fonts.monoBold },
  card: { marginTop: space[4], alignItems: 'center' },
  qr: { padding: space[3], borderRadius: radius.md, backgroundColor: colors.white },
  cardLabel: { ...type.caption, marginTop: space[4], fontFamily: fonts.bodySemi },
  address: { ...type.mono, marginTop: space[2], fontSize: 13, textAlign: 'center' },
  copy: {
    marginTop: space[3],
    minHeight: sizes.touch,
    paddingHorizontal: space[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    borderRadius: radius.pill,
    backgroundColor: glass.iconTint,
    borderWidth: 1,
    borderColor: glass.accentBorder,
  },
  copyText: { ...type.body, fontFamily: fonts.bodySemi, color: colors.purple[100] },
  notice: { marginTop: space[4], marginBottom: space[3] },
  faucet: {
    marginTop: space[3],
    minHeight: sizes.touch,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
  },
  faucetText: { ...type.body, fontFamily: fonts.bodyMedium, color: colors.purple[200], textAlign: 'center' },
  waiting: { marginTop: space[1] },
  silent: { alignItems: 'stretch', paddingTop: space[10] },
  center: { textAlign: 'center' },
});
