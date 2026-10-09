// Add USDC (international client): the test USDC a client needs to lock its contracts. Replaces the old P2P
// "Receive" on Home. Option 1 copies the wallet address and opens Circle's faucet in one press (the page cannot be
// prefilled); option 2 is the address and QR for another Solana wallet. ?fund=<address> counts that contract only and
// offers "Back to lock". Blocked in the Vietnam view (services/regionGuard.ts).
import React, { useCallback, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Feather } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { PublicKey } from '@solana/web3.js';
import { Badge, Button, Card, Header, Screen } from '@/components/design';
import { fonts, palette, radius, space, status } from '@/constants/design';
import { useFunds } from '@/hooks/useFunds';
import { useAuth } from '@/services/auth';
import { getUsdcTokenBalance } from '@/services/solana';
import { formatUsdc } from '@/services/milestone/format';
import {
  ADD_USDC_POLL_LIMIT_MS,
  ADD_USDC_POLL_MS,
  arrivedSince,
  FAUCET_URL,
  LOW_SOL_LAMPORTS,
  stillNeeded,
  usdcNeededToLock,
  usdcUnits,
} from '@/services/addUsdc';
import { requestTestSol } from '@/services/testSol';

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-6)}`;

export default function AddUsdcScreen() {
  const router = useRouter();
  const { fund } = useLocalSearchParams<{ fund?: string }>();
  const { walletAddress, connection } = useAuth();
  const { funds } = useFunds();
  const [balance, setBalance] = useState<number | null>(null);
  const [lamports, setLamports] = useState<number | null>(null);
  const [sol, setSol] = useState<'idle' | 'loading' | 'failed'>('idle');
  const [addressCopied, setAddressCopied] = useState(false);
  const [copied, setCopied] = useState(false);
  // Balance when the faucet was opened, and when; polling stops 5 minutes later
  const [watch, setWatch] = useState<{ start: number | null; at: number } | null>(null);
  const balanceRef = useRef<number | null>(null);

  const loadBalance = useCallback(async () => {
    if (!walletAddress) return;
    try {
      const b = await getUsdcTokenBalance(walletAddress, true);
      balanceRef.current = b;
      setBalance(b);
    } catch {
      // keep the last value
    }
  }, [walletAddress]);

  const loadSol = useCallback(async () => {
    if (!walletAddress) return;
    try {
      setLamports(await connection.getBalance(new PublicKey(walletAddress), 'confirmed'));
    } catch {
      setLamports(null);
    }
  }, [walletAddress, connection]);

  // Read once on focus; while the faucet is open, every 5 s for up to 5 minutes (stops on blur, as Home does)
  useFocusEffect(
    useCallback(() => {
      void loadBalance();
      void loadSol();
      if (!watch) return;
      const timer = setInterval(() => {
        if (Date.now() - watch.at > ADD_USDC_POLL_LIMIT_MS) return clearInterval(timer);
        void loadBalance();
      }, ADD_USDC_POLL_MS);
      return () => clearInterval(timer);
    }, [loadBalance, loadSol, watch])
  );

  // Copy and open in the same press: browsers allow both only inside the user's gesture
  const openFaucet = () => {
    if (!walletAddress) return;
    const copiedNow = Clipboard.setStringAsync(walletAddress);
    void Linking.openURL(FAUCET_URL);
    void copiedNow.then(() => setAddressCopied(true)).catch(() => setAddressCopied(false));
    setWatch({ start: balanceRef.current, at: Date.now() });
  };

  const copyAddress = async () => {
    if (!walletAddress) return;
    try {
      await Clipboard.setStringAsync(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const getSol = async () => {
    if (!walletAddress) return;
    setSol('loading');
    try {
      await requestTestSol(walletAddress);
      setSol('idle');
      void loadSol();
    } catch {
      setSol('failed');
    }
  };

  const arrived = watch ? arrivedSince(watch.start, balance) : null;
  const needed = usdcNeededToLock(funds, fund || undefined);
  const balanceUnits = balance === null ? null : usdcUnits(balance);
  const missing = stillNeeded(needed, balanceUnits);
  const enough = fund && needed > 0n && balanceUnits !== null && missing === 0n;
  const lowSol = lamports !== null && lamports < LOW_SOL_LAMPORTS;
  const back = () => (router.canGoBack() ? router.back() : router.replace('/home'));

  return (
    <Screen
      footer={
        enough ? <Button title="Back to lock" icon="lock" onPress={() => router.replace(`/contracts/${fund}/lock` as Href)} /> : undefined
      }
    >
      <Header title="Add USDC" onBack={back} />
      <Badge label="Devnet · test money" tone="warning" style={s.badge} />

      <Card style={s.card}>
        <Row k="Your balance" v={balance === null ? '—' : `${balance.toFixed(2)} USDC`} />
        <Row k="Needed to lock" v={formatUsdc(needed)} divider />
        <Row k="Still needed" v={formatUsdc(missing)} divider strong={missing > 0n} />
        {arrived !== null ? (
          <View style={s.arrived} accessibilityRole="alert">
            <Feather name="check-circle" size={16} color={status.success.ink} />
            <Text style={s.arrivedText}>{`${arrived.toFixed(2)} test USDC arrived`}</Text>
          </View>
        ) : null}
      </Card>

      <Card style={[s.card, s.primaryCard]}>
        <Text style={s.cardTitle}>Get test USDC from Circle</Text>
        <Button title="Get test USDC" icon="external-link" accessibilityLabel="Get test USDC: copies your address and opens the Circle faucet" onPress={openFaucet} disabled={!walletAddress} style={s.cta} />
        {addressCopied ? (
          <View style={s.arrived}>
            <Feather name="check" size={16} color={status.success.ink} />
            <Text style={s.arrivedText}>Address copied</Text>
          </View>
        ) : null}
        <View style={s.steps}>
          {['Choose USDC', 'Choose Solana Devnet (the page starts on another network)', 'Paste your address and send'].map((step, i) => (
            <View key={step} style={s.step}>
              <View style={s.num}>
                <Text style={s.numText}>{i + 1}</Text>
              </View>
              <Text style={s.stepText}>{step}</Text>
            </View>
          ))}
        </View>
        <Text style={s.note}>Limit: 20 test USDC per address every 2 hours.</Text>
      </Card>

      <Card style={s.card}>
        <Text style={s.cardTitle}>From another Solana wallet</Text>
        <View style={s.qr}>{walletAddress ? <QRCode value={walletAddress} size={168} backgroundColor="#FFFFFF" ecl="M" /> : null}</View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copied ? 'Wallet address copied' : `Copy wallet address ${walletAddress ?? ''}`}
          onPress={() => void copyAddress()}
          style={s.addressRow}
        >
          <Text style={s.address} numberOfLines={1}>
            {walletAddress ? short(walletAddress) : '—'}
          </Text>
          <Text style={[s.copy, copied && s.copied]}>{copied ? 'Copied' : 'Copy'}</Text>
          <Feather name={copied ? 'check' : 'copy'} size={16} color={copied ? status.success.ink : palette.link} />
        </Pressable>
        <Text style={s.note}>Only USDC on Solana devnet.</Text>
      </Card>

      <Card style={s.card}>
        <View style={s.row}>
          <Text style={s.k}>Network fee</Text>
          {lowSol ? (
            <Pressable accessibilityRole="button" onPress={() => void getSol()} disabled={sol === 'loading'} style={s.solButton}>
              <Text style={s.solText}>{sol === 'loading' ? 'Getting test SOL…' : 'Low · Get test SOL'}</Text>
            </Pressable>
          ) : (
            <Text style={s.v}>{lamports === null ? '—' : 'Ready'}</Text>
          )}
        </View>
        {sol === 'failed' ? <Text style={s.note}>Could not get test SOL right now. Try again later.</Text> : null}
      </Card>

      <Text style={s.foot}>
        Test network. Test USDC and SOL have no value.{' '}
        <Text style={s.link} accessibilityRole="link" onPress={() => router.push('/disclosures')}>
          Disclosures
        </Text>
      </Text>
    </Screen>
  );
}

function Row({ k, v, divider, strong }: { k: string; v: string; divider?: boolean; strong?: boolean }) {
  return (
    <View style={[s.row, divider && s.divider]}>
      <Text style={s.k}>{k}</Text>
      <Text style={[s.v, strong && s.vStrong]}>{v}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  badge: { alignSelf: 'center' },
  card: { marginTop: space[3] },
  primaryCard: { backgroundColor: palette.tint },
  cardTitle: { fontFamily: fonts.displaySemi, fontSize: 17, color: palette.ink },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[3], minHeight: 40 },
  divider: { borderTopWidth: 1, borderTopColor: palette.divider },
  k: { fontFamily: fonts.body, fontSize: 14, color: palette.caption },
  v: { fontFamily: fonts.monoBold, fontSize: 14, color: palette.ink },
  vStrong: { color: status.warning.ink },
  arrived: { marginTop: space[2], flexDirection: 'row', alignItems: 'center', gap: space[2] },
  arrivedText: { fontFamily: fonts.bodySemi, fontSize: 14, color: status.success.ink },
  cta: { marginTop: space[3] },
  steps: { marginTop: space[3], gap: space[2] },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3] },
  num: { width: 24, height: 24, borderRadius: radius.pill, backgroundColor: palette.card, alignItems: 'center', justifyContent: 'center' },
  numText: { fontFamily: fonts.bodySemi, fontSize: 12, color: palette.link },
  stepText: { flex: 1, fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: palette.ink2 },
  note: { marginTop: space[3], fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: palette.caption },
  qr: { marginTop: space[3], alignSelf: 'center', padding: space[3], borderRadius: radius.lg, backgroundColor: '#FFFFFF' },
  addressRow: { marginTop: space[3], flexDirection: 'row', alignItems: 'center', gap: space[2], minHeight: 44, paddingHorizontal: space[3], borderRadius: radius.md, backgroundColor: palette.field },
  address: { flex: 1, fontFamily: fonts.mono, fontSize: 14, color: palette.ink },
  copy: { fontFamily: fonts.bodySemi, fontSize: 14, color: palette.link },
  copied: { color: status.success.ink },
  solButton: { minHeight: 36, paddingHorizontal: space[3], borderRadius: radius.pill, backgroundColor: status.warning.bg, justifyContent: 'center' },
  solText: { fontFamily: fonts.bodySemi, fontSize: 13, color: status.warning.ink },
  foot: { marginTop: space[4], marginBottom: space[6], textAlign: 'center', fontFamily: fonts.body, fontSize: 12, color: palette.caption },
  link: { color: palette.link, fontFamily: fonts.bodySemi },
});
