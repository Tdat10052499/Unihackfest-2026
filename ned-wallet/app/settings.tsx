// Settings (Settings / SettingsIntl boards, build-plan B3): profile card with the generated avatar, "I live in
// Vietnam" switch (the money view, decision D18), display currency, consent (view or withdraw), Disclosures,
// version with the Devnet badge, Sign out. Only controls that work are shown: the board's Notifications switch waits
// for real notification settings (B5).
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { PublicKey } from '@solana/web3.js';
import { Avatar } from '@/components/Avatar';
import { Badge, Button, PressableScale, Screen, Sheet, Toggle } from '@/components/design';
import { WalletNav } from '@/components/wallet/WalletNav';
import { elevation, fonts, palette, radius, space, status } from '@/constants/design';
import { useRegion } from '@/hooks/useRegion';
import { useAuth } from '@/services/auth';
import { maskPhoneDisplay } from '@/services/identity/format';
import { fetchReverseRecord } from '@/services/identity/dualPda';
import { getOwnPhone } from '@/services/identity/ownPhone';
import { identityConnection, shortAddress } from '@/services/identity/resolve';
import { executeHardReset } from '@/services/storage';
import { useConsentStore } from '@/stores/useConsentStore';
import { YourAccount } from '@/components/settings/YourAccount';
import { FEATURES } from '@/constants/features';
import { useUserStore } from '@/stores/useUserStore';

export default function SettingsScreen() {
  const router = useRouter();
  const { logout, walletAddress } = useAuth();
  const { username, fetchUserProfile, loadFromStorage } = useUserStore();
  const { region, setRegion } = useRegion();
  const vn = (region ?? 'vn') === 'vn';
  const consent = useConsentStore((s) => s.getConsent(walletAddress));
  const withdraw = useConsentStore((s) => s.withdraw);
  const [phone, setPhone] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [copied, setCopied] = useState(false);
  const [sheet, setSheet] = useState<'consent' | 'signOut' | null>(null);
  const [leaving, setLeaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadFromStorage();
      if (walletAddress) fetchUserProfile(walletAddress);
    }, [walletAddress, loadFromStorage, fetchUserProfile])
  );

  useEffect(() => {
    let active = true;
    if (walletAddress)
      Promise.all([fetchReverseRecord(identityConnection, new PublicKey(walletAddress)), getOwnPhone()])
        .then(([record, own]) => active && setPhone(record?.hasPhone ? own : null))
        .catch(() => active && setPhone(null));
    return () => {
      active = false;
    };
  }, [walletAddress]);

  const handle = username ? `@${username}` : walletAddress ? shortAddress(walletAddress) : 'No profile yet';
  const version = Constants.expoConfig?.version ?? '1.0.0';

  // The full address goes to the clipboard; the row shows the start and the end
  const copyAddress = async () => {
    if (!walletAddress) return;
    await Clipboard.setStringAsync(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleVietnam = (next: boolean) => {
    setRegion(next ? 'vn' : 'intl');
    setToast(next ? 'Vietnam view on. Amounts now show in VND (estimate).' : 'Vietnam view off. You now see USDC.');
  };

  const signOut = async () => {
    setLeaving(true);
    try {
      await executeHardReset(logout);
    } finally {
      setLeaving(false);
      setSheet(null);
      router.replace('/welcome');
    }
  };

  const withdrawConsent = async () => {
    if (!walletAddress) return;
    // Without consent N.E.D cannot run the account: withdraw, then sign out (the consent screen asks again next time)
    withdraw(walletAddress);
    await signOut();
  };

  return (
    <View style={styles.page}>
      <Screen contentStyle={styles.content} edges={['top', 'left', 'right']}>
        <Text style={styles.title} accessibilityRole="header">
          Settings
        </Text>

        {toast ? (
          <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.toast, elevation.sAccent]}>
            <Text style={styles.toastText}>{toast}</Text>
          </View>
        ) : null}

        <View style={styles.profile}>
          {walletAddress ? <Avatar seed={walletAddress} size={56} decorative /> : null}
          <View style={styles.flex}>
            <Text style={styles.handle} numberOfLines={1}>
              {handle}
            </Text>
            {phone ? (
              <View style={styles.phoneRow}>
                <Text style={styles.caption}>{maskPhoneDisplay(phone)}</Text>
                <View style={styles.unverified}>
                  <Text style={styles.unverifiedText}>UNVERIFIED NUMBER</Text>
                </View>
              </View>
            ) : null}
            <Text style={styles.small}>Signed in with Google</Text>
          </View>
        </View>

        {walletAddress ? (
          <View style={[styles.card, styles.walletCard]}>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={copied ? 'Wallet address copied' : `Copy wallet address ${walletAddress}`}
              onPress={() => void copyAddress()}
              style={styles.row}
            >
              <View style={styles.flex}>
                <Text style={styles.rowTitle}>Wallet address</Text>
                <Text style={styles.address} numberOfLines={1}>
                  {`${walletAddress.slice(0, 6)}…${walletAddress.slice(-6)}`}
                </Text>
              </View>
              <Text style={[styles.copyLabel, copied && styles.copiedLabel]} accessibilityLiveRegion="polite">
                {copied ? 'Copied' : 'Copy'}
              </Text>
              <Feather name={copied ? 'check' : 'copy'} size={18} color={copied ? status.success.ink : palette.link} />
            </PressableScale>
          </View>
        ) : null}

        {FEATURES.accountRoles ? (
          // D30: roles, country (with a confirm, closes D17), business, agreement; consent lives in the agreement
          <YourAccount onWithdraw={withdrawConsent} leaving={leaving} />
        ) : (
          <>
            <Text style={styles.section} accessibilityRole="header">
              Where you live
            </Text>
            <View style={[styles.card, styles.padded]}>
              <View style={styles.switchRow}>
                <View style={styles.flex}>
                  <Text style={styles.rowTitle}>I live in Vietnam</Text>
                  <Text style={styles.caption}>
                    {vn
                      ? 'Amounts in VND (estimate). Earnings go to your bank through a payout partner. No crypto balance is shown.'
                      : 'Off: you see USDC, add test USDC to lock contracts, and earnings go to your N.E.D account.'}
                  </Text>
                </View>
                <Toggle accessibilityLabel="I live in Vietnam" value={vn} onValueChange={toggleVietnam} disabled={!walletAddress} />
              </View>
            </View>
          </>
        )}

        <Text style={styles.section} accessibilityRole="header">
          Preferences
        </Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.flex}>
              <Text style={styles.rowTitle}>Display currency</Text>
              <Text style={styles.caption}>Follows where you live</Text>
            </View>
            <Text style={styles.value}>{vn ? 'VND estimate' : 'USDC'}</Text>
          </View>
          {region === 'intl' ? (
            // International view only: sending moved off Home (Milestone Lock); the Vietnam view never sends (V1)
            <LinkRow title="Move USDC out" onPress={() => router.push('/send')} divider />
          ) : null}
        </View>

        <Text style={styles.section} accessibilityRole="header">
          Help
        </Text>
        <View style={styles.card}>
          <LinkRow title="Before you submit" value="Guide" onPress={() => router.push('/help')} />
        </View>

        <Text style={styles.section} accessibilityRole="header">
          Privacy & legal
        </Text>
        <View style={styles.card}>
          {FEATURES.accountRoles ? null : (
            <LinkRow title="Consent: view or withdraw" value={consent ? 'Given' : 'Not given'} valueColor={consent ? status.success.ink : status.warning.ink} onPress={() => setSheet('consent')} />
          )}
          <LinkRow title="Terms of use" onPress={() => router.push('/terms')} divider={!FEATURES.accountRoles} />
          <LinkRow title="Privacy Policy" onPress={() => router.push('/privacy')} divider />
          <LinkRow title="Disclosures" onPress={() => router.push('/disclosures')} divider />
          <View style={[styles.row, styles.divider]}>
            <Text style={[styles.rowTitle, styles.flex]}>Version {version}</Text>
            <Badge label="Devnet · test money" tone="warning" />
          </View>
        </View>

        <Button title="Sign out" variant="destructiveSoft" onPress={() => setSheet('signOut')} style={styles.signOut} />
        <Text style={styles.footnote}>Sign in again with the same Google account to get back to your contracts.</Text>
      </Screen>

      <WalletNav active="Settings" />

      <Sheet visible={sheet === 'consent'} onClose={() => setSheet(null)} title="Your consent">
        <Text style={styles.sheetText}>
          {consent
            ? `Given on ${new Date(consent.acceptedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}. N.E.D processes your Google account name, email and wallet address to run your account; your login is handled by Dynamic in the United States and blockchain data is read through Helius. Your @username, wallet address, device key and contract data are on Solana and cannot be deleted.`
            : 'No consent is recorded on this device.'}
        </Text>
        <Text style={[styles.sheetText, styles.sheetGap]}>
          Withdrawing signs you out. Your contracts stay on Solana; you are asked for consent again when you sign in. A record of when you gave and withdrew consent stays on this device.
        </Text>
        {consent ? <Button title="Withdraw consent" variant="destructiveSoft" loading={leaving} onPress={() => void withdrawConsent()} style={styles.sheetButton} /> : null}
        <Button title="Close" variant="secondary" onPress={() => setSheet(null)} style={styles.sheetButtonSmall} />
      </Sheet>

      <Sheet visible={sheet === 'signOut'} onClose={() => setSheet(null)} title="Sign out?">
        <Text style={styles.sheetText}>
          Sign in again with the same Google account to get back to your contracts. Contract links you opened on this device
          are removed; open them again to read a brief here.
        </Text>
        <Button title="Sign out" variant="destructiveSoft" loading={leaving} onPress={() => void signOut()} style={styles.sheetButton} />
        <Button title="Cancel" variant="secondary" onPress={() => setSheet(null)} style={styles.sheetButtonSmall} />
      </Sheet>
    </View>
  );
}

function LinkRow({ title, value, valueColor, onPress, divider }: { title: string; value?: string; valueColor?: string; onPress(): void; divider?: boolean }) {
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={value ? `${title}, ${value}` : title} onPress={onPress} style={[styles.row, divider && styles.divider]}>
      <Text style={[styles.rowTitle, styles.flex]}>{title}</Text>
      {value ? <Text style={[styles.valueSmall, valueColor ? { color: valueColor } : null]}>{value}</Text> : null}
      <Feather name="chevron-right" size={18} color={palette.muted} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.ground },
  content: { paddingHorizontal: space[4], paddingBottom: 120 },
  flex: { flex: 1, minWidth: 0 },
  title: { paddingHorizontal: space[1], paddingTop: space[1], paddingBottom: space[3], fontFamily: fonts.display, fontSize: 28, color: palette.ink },
  toast: { marginBottom: space[3], paddingVertical: space[3], paddingHorizontal: 14, borderRadius: 14, backgroundColor: palette.card },
  toastText: { fontFamily: fonts.body, fontSize: 13, color: palette.ink },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: radius.xl, backgroundColor: palette.card },
  handle: { fontFamily: fonts.monoBold, fontSize: 16, color: palette.ink },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  unverified: { height: 18, paddingHorizontal: 6, borderRadius: 5, backgroundColor: status.warning.bg, justifyContent: 'center' },
  unverifiedText: { fontFamily: fonts.bodySemi, fontWeight: '700', fontSize: 10, color: status.warning.ink },
  small: { marginTop: 2, fontFamily: fonts.body, fontSize: 11, color: palette.caption },
  section: { paddingTop: 18, paddingHorizontal: 6, paddingBottom: space[2], fontFamily: fonts.bodySemi, fontSize: 13, color: palette.caption },
  card: { borderRadius: radius.xl, backgroundColor: palette.card },
  walletCard: { marginTop: space[3] },
  address: { marginTop: 2, fontFamily: fonts.mono, fontSize: 13, color: palette.caption },
  copyLabel: { fontFamily: fonts.bodySemi, fontSize: 14, color: palette.link },
  copiedLabel: { color: status.success.ink },
  padded: { padding: 14 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 54, paddingHorizontal: 14, paddingVertical: space[2] },
  divider: { borderTopWidth: 1, borderTopColor: palette.divider },
  rowTitle: { fontFamily: fonts.bodyMedium, fontSize: 15, color: palette.ink },
  caption: { marginTop: 2, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: palette.caption },
  value: { fontFamily: fonts.bodySemi, fontSize: 14, color: palette.ink2 },
  valueSmall: { fontFamily: fonts.bodySemi, fontSize: 12, color: palette.caption },
  signOut: { marginTop: space[6] },
  footnote: { marginTop: space[2], textAlign: 'center', fontFamily: fonts.body, fontSize: 11, color: palette.caption },
  sheetText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: palette.ink2 },
  sheetGap: { marginTop: space[3] },
  sheetButton: { marginTop: space[5] },
  sheetButtonSmall: { marginTop: space[2] },
});
