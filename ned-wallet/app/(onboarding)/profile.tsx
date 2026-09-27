// Onboarding — Create profile (OnbProfile, bước 1/2). Phương án C:
// - Username công khai [a-z0-9_] 3–20, kiểm tra trùng khi gõ (NameRecord), gợi ý 3 tên còn trống.
// - SĐT TUỲ CHỌN (mặc định tắt): chỉ phone_key = scrypt(E.164) lên chain; số dạng rõ chỉ lưu trên máy.
// - create_profile (+ link_phone) trong MỘT giao dịch, ký bằng ví người dùng (tự trả phí + rent).
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { PublicKey } from '@solana/web3.js';
import { useAuth } from '../../services/auth';
import {
  fetchNameRecord,
  fetchNameRecords,
  fetchPhoneRecord,
  fetchReverseRecord,
  getPhoneKey,
  isValidUsername,
  normalizeVietnamPhone,
} from '../../services/identity';
import { saveOwnPhone } from '../../services/identity/ownPhone';
import {
  buildOnboardingTx,
  describeTxError,
  formatSol,
  getSetupCost,
  syncProfileToUserStore,
  type SetupCost,
} from '../../services/onboarding';
import { NoticeCard, OnbScreen, PrimaryButton, StepHeader, onbText } from '../../components/onboarding/ui';
import { onbColors, onbFonts } from '../../components/onboarding/theme';

const DEBOUNCE_MS = 400;

type UsernameState = 'empty' | 'invalid' | 'checking' | 'available' | 'taken' | 'error';
type PhoneState = 'empty' | 'invalid' | 'checking' | 'ok' | 'taken' | 'error';

/** Chữ thường, bỏ khoảng trắng và ký tự không hợp lệ, tối đa 20 */
function normalizeUsername(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
}

function suggestionCandidates(base: string): string[] {
  const root = base.slice(0, 16) || 'ned';
  const year = String(new Date().getFullYear()).slice(2);
  return [`${root}_ned`, `${root}${year}`, `the${root}`.slice(0, 20), `${root}_vn`, `${root}99`, `${root}_${Math.floor(10 + Math.random() * 89)}`]
    .filter((c, i, all) => isValidUsername(c) && c !== base && all.indexOf(c) === i);
}

export default function ProfileScreen() {
  const { isReady, isAuthenticated, walletAddress, connection, signAndSendTransaction } = useAuth();

  const [username, setUsername] = useState('');
  const [usernameState, setUsernameState] = useState<UsernameState>('empty');
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const [phoneOn, setPhoneOn] = useState(false);
  const [phone, setPhone] = useState('');
  const [phoneState, setPhoneState] = useState<PhoneState>('empty');
  const phoneRef = useRef<{ e164: string; phoneKey: Uint8Array } | null>(null);

  const [cost, setCost] = useState<SetupCost | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (isReady && !isAuthenticated) router.replace('/welcome');
  }, [isReady, isAuthenticated]);

  // Đã có hồ sơ (vd. quay lại bằng nút back) → sang chọn mode
  useEffect(() => {
    if (!walletAddress) return;
    fetchReverseRecord(connection, new PublicKey(walletAddress))
      .then((reverse) => reverse && router.replace('/mode'))
      .catch(() => {});
  }, [walletAddress, connection]);

  useEffect(() => {
    getSetupCost(connection).then(setCost).catch((err) => console.warn('[profile] cost failed:', err));
  }, [connection]);

  // Kiểm tra username (debounce 400ms, đọc NameRecord)
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (!username) return setUsernameState('empty');
      if (!isValidUsername(username)) return setUsernameState('invalid');
      setUsernameState('checking');
      try {
        const owner = await fetchNameRecord(connection, username);
        if (cancelled) return;
        if (!owner) {
          setSuggestions([]);
          return setUsernameState('available');
        }
        setUsernameState('taken');
        const candidates = suggestionCandidates(username);
        const records = await fetchNameRecords(connection, candidates);
        if (!cancelled) setSuggestions(candidates.filter((_, i) => !records[i]).slice(0, 3));
      } catch (err) {
        console.warn('[profile] username check failed:', err);
        if (!cancelled) setUsernameState('error');
      }
    }, username ? DEBOUNCE_MS : 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [username, connection]);

  // Kiểm tra SĐT: chuẩn hoá E.164 → scrypt → PhoneRecord
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      phoneRef.current = null;
      if (!phoneOn || !phone.trim()) return setPhoneState('empty');
      const e164 = normalizeVietnamPhone(phone);
      if (!e164) return setPhoneState('invalid');
      setPhoneState('checking');
      try {
        const key = await getPhoneKey(e164);
        const record = await fetchPhoneRecord(connection, key.phoneKey);
        if (cancelled) return;
        if (record && record.wallet.toBase58() !== walletAddress) return setPhoneState('taken');
        phoneRef.current = key;
        setPhoneState('ok');
      } catch (err) {
        console.warn('[profile] phone check failed:', err);
        if (!cancelled) setPhoneState('error');
      }
    }, phone ? DEBOUNCE_MS : 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [phone, phoneOn, connection, walletAddress]);

  const canCreate =
    usernameState === 'available' && (!phoneOn || phoneState === 'ok') && Boolean(walletAddress) && !submitting;

  const create = async () => {
    if (!walletAddress || !canCreate) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const phoneKey = phoneOn ? phoneRef.current : null;
      const tx = buildOnboardingTx(walletAddress, username, phoneKey?.phoneKey);
      const signature = await signAndSendTransaction(tx);
      await connection.confirmTransaction(signature, 'confirmed');
      console.log(`✅ [onboarding] create_profile @${username}${phoneKey ? ' + link_phone' : ''}: ${signature}`);
      if (phoneKey) await saveOwnPhone(phoneKey.e164);
      syncProfileToUserStore(walletAddress, username);
      router.replace('/mode');
    } catch (err) {
      console.warn('[onboarding] create_profile failed:', err);
      setSubmitError(describeTxError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const userHint = {
    empty: { text: '3–20 characters: letters, numbers or _', color: onbColors.textSubtle },
    invalid: { text: 'Use 3–20 characters: letters, numbers or _', color: onbColors.warning },
    checking: { text: `Checking @${username}…`, color: onbColors.textSubtle },
    available: { text: `@${username} is available`, color: onbColors.successText },
    taken: {
      text: suggestions.length ? `@${username} is taken. Try one of these:` : `@${username} is taken.`,
      color: onbColors.danger,
    },
    error: { text: 'Could not check this username. Check your connection.', color: onbColors.warning },
  }[usernameState];

  const phoneHint = {
    empty: { text: "We never text you. It's only used so friends can find you.", color: onbColors.textSubtle },
    invalid: { text: 'Enter a Vietnamese mobile number, e.g. 90 123 4567', color: onbColors.warning },
    checking: { text: 'Checking this number…', color: onbColors.textSubtle },
    ok: { text: 'Looks good', color: onbColors.successText },
    taken: {
      text: "This number is already linked to another N.E.D account. If it's yours, use your @username.",
      color: onbColors.danger,
    },
    error: { text: 'Could not check this number. Check your connection.', color: onbColors.warning },
  }[phoneState];

  const setupCost = cost ? cost.profile + (phoneOn ? cost.phone : 0) : null;

  return (
    <OnbScreen glow={false}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <StepHeader step={1} total={2} onBack={() => router.replace('/setup')} />
        <ScrollView style={styles.flex} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={onbText.h1} accessibilityRole="header">
            Create your profile
          </Text>
          <Text style={[onbText.lead, styles.lead]}>Friends can send you money with your username or phone number.</Text>

          <Text style={[onbText.label, styles.label]} nativeID="onb-user-label">
            Username
          </Text>
          <View style={[styles.field, fieldBorder(usernameState === 'available', usernameState === 'taken')]}>
            <Text style={styles.prefix}>@</Text>
            <TextInput
              accessibilityLabelledBy="onb-user-label"
              value={username}
              onChangeText={(t) => setUsername(normalizeUsername(t))}
              placeholder="yourname"
              placeholderTextColor="rgba(255,255,255,0.35)"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              maxLength={20}
              style={styles.input}
            />
            {usernameState === 'checking' ? <ActivityIndicator size="small" color={onbColors.purple300} /> : null}
            {usernameState === 'available' ? <Feather name="check" size={18} color={onbColors.successText} /> : null}
          </View>
          <Text style={[styles.hint, { color: userHint.color }]} accessibilityLiveRegion="polite">
            {userHint.text}
          </Text>
          {usernameState === 'taken' && suggestions.length ? (
            <View style={styles.suggestions}>
              {suggestions.map((s) => (
                <Pressable key={s} accessibilityRole="button" onPress={() => setUsername(s)} style={styles.chip}>
                  <Text style={styles.chipText}>@{s}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          <View style={styles.toggleRow}>
            <View style={styles.flex}>
              <Text style={onbText.label}>Let friends find me by phone</Text>
              <Text style={[onbText.small, styles.toggleSub]}>Optional. You can add it later.</Text>
            </View>
            <Switch
              accessibilityLabel="Let friends find me by phone"
              value={phoneOn}
              onValueChange={setPhoneOn}
              trackColor={{ false: 'rgba(255,255,255,0.15)', true: onbColors.purple400 }}
              thumbColor="#FFFFFF"
            />
          </View>

          {phoneOn ? (
            <>
              <View style={[styles.field, fieldBorder(phoneState === 'ok', phoneState === 'taken')]}>
                <Text style={styles.country}>VN +84</Text>
                <TextInput
                  accessibilityLabel="Phone number"
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="90 123 4567"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  style={styles.input}
                />
                {phoneState === 'checking' ? <ActivityIndicator size="small" color={onbColors.purple300} /> : null}
                {phoneState === 'ok' ? <Feather name="check" size={18} color={onbColors.successText} /> : null}
              </View>
              <Text style={[styles.hint, { color: phoneHint.color }]} accessibilityLiveRegion="polite">
                {phoneHint.text}
              </Text>
              <NoticeCard tone="warning" style={styles.notice}>
                <Text style={onbText.small}>
                  • Your number is never stored in plain text — only a one-way code goes on Solana.{'\n'}• It is not
                  verified with an SMS code yet, so senders will see “Unverified number”.{'\n'}• Anyone who knows your
                  number can find your @username.
                </Text>
              </NoticeCard>
            </>
          ) : null}

          <NoticeCard tone="info" style={styles.notice}>
            <Text style={onbText.small}>
              Your username is saved on Solana, so anyone who knows it can find your wallet.
            </Text>
          </NoticeCard>

          {submitError ? (
            <NoticeCard tone="danger" style={styles.notice}>
              <Text style={onbText.small}>{submitError}</Text>
              {/SOL/.test(submitError) ? (
                <Text style={styles.link} onPress={() => router.replace('/fund')}>
                  Top up test SOL
                </Text>
              ) : null}
            </NoticeCard>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <PrimaryButton title="Create profile" onPress={create} disabled={!canCreate} loading={submitting} />
          <Text style={[onbText.caption, styles.cost]}>
            {setupCost === null
              ? 'Calculating one-time setup cost…'
              : `One-time setup ≈ ${formatSol(setupCost)} SOL (devnet) + network fee`}
          </Text>
        </View>
      </KeyboardAvoidingView>
    </OnbScreen>
  );
}

function fieldBorder(ok: boolean, bad: boolean) {
  return { borderColor: bad ? 'rgba(248,113,113,0.7)' : ok ? 'rgba(74,222,128,0.5)' : onbColors.border };
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingTop: 22, paddingBottom: 16 },
  lead: { marginTop: 8 },
  label: { marginTop: 26 },
  field: {
    marginTop: 8,
    height: 54,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: onbColors.surface,
  },
  prefix: { fontFamily: onbFonts.mono, fontSize: 16, color: onbColors.textSubtle },
  country: {
    fontFamily: onbFonts.body,
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    paddingRight: 10,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.12)',
  },
  input: { flex: 1, minWidth: 0, height: 50, color: onbColors.text, fontFamily: onbFonts.mono, fontSize: 16 },
  hint: { marginTop: 6, fontFamily: onbFonts.body, fontSize: 12, lineHeight: 17 },
  suggestions: { marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    height: 34,
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderRadius: 9999,
    backgroundColor: 'rgba(155,79,222,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(155,79,222,0.4)',
  },
  chipText: { fontFamily: onbFonts.mono, fontSize: 12, color: '#E4D0FA' },
  toggleRow: { marginTop: 24, flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleSub: { marginTop: 2, color: onbColors.textSubtle },
  notice: { marginTop: 16 },
  link: { marginTop: 6, fontFamily: onbFonts.bodySemi, fontSize: 12, color: onbColors.lavender, textDecorationLine: 'underline' },
  footer: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 28 },
  cost: { marginTop: 10 },
});
