// Onboarding — Create profile (OnbProfile board, step 2 of 3; generated avatar from the wallet address). Phương án C:
// - Username công khai [a-z0-9_] 3–20, kiểm tra trùng khi gõ (NameRecord), gợi ý 3 tên còn trống.
// - SĐT TUỲ CHỌN (để trống = không liên kết): chỉ phone_key = scrypt(E.164) lên chain; số dạng rõ chỉ lưu trên máy.
// - create_profile (+ link_phone) trong MỘT giao dịch, ký bằng ví người dùng (tự trả phí + rent).
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { FEATURES } from '../../constants/features';
import { useAccountStore } from '../../stores/useAccountStore';
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
import { sendAndConfirm } from '../../services/chain/send';
import {
  buildOnboardingTx,
  describeTxError,
  FEE_PER_TX,
  getSetupCost,
  syncProfileToUserStore,
  type SetupCost,
} from '../../services/onboarding';
import { NoticeCard, OnbScreen, PrimaryButton, StepHeader, onbText } from '../../components/onboarding/ui';
import { Avatar } from '../../components/Avatar';
import { colors, elevation, fonts, palette, radius, space, status, type } from '../../constants/design';

const DEBOUNCE_MS = 400;

type UsernameState = 'empty' | 'invalid' | 'checking' | 'available' | 'taken' | 'error';
/** C3: hidden in the demo onboarding (phone linking is not in the demo script) */
const SHOW_PHONE_FIELD = false;

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
  const { isReady, isAuthenticated, walletAddress, connection, signTransaction } = useAuth();

  const [username, setUsername] = useState('');
  const [usernameState, setUsernameState] = useState<UsernameState>('empty');
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // The phone field is optional (OnbProfile board): empty = no phone link
  const [phone, setPhone] = useState('');
  const phoneOn = phone.trim().length > 0;
  const [phoneState, setPhoneState] = useState<PhoneState>('empty');
  const phoneRef = useRef<{ e164: string; phoneKey: Uint8Array } | null>(null);

  const [cost, setCost] = useState<SetupCost | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  // D30: the last step, 4 of 4 (5 of 5 for a business)
  const accountSteps = useAccountStore((st) => (st.getProfile(walletAddress)?.client?.kind === 'business' ? 5 : 4));

  useEffect(() => {
    if (isReady && !isAuthenticated) router.replace('/welcome');
  }, [isReady, isAuthenticated]);

  // Đã có hồ sơ (vd. quay lại bằng nút back) → sang chọn mode
  useEffect(() => {
    if (!walletAddress) return;
    fetchReverseRecord(connection, new PublicKey(walletAddress))
      .then((reverse) => reverse && router.replace(FEATURES.accountRoles ? '/setup' : '/residence'))
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
      // Rent of Name + Reverse (+ Phone); the fee is added by sendAndConfirm
      const rent = cost ? cost.profile - FEE_PER_TX + (phoneKey ? cost.phone : 0) : 0;
      const { signature } = await sendAndConfirm(tx, { walletAddress, signTransaction }, { rent, connection });
      console.log(`✅ [onboarding] create_profile @${username}${phoneKey ? ' + link_phone' : ''}: ${signature}`);
      if (phoneKey) await saveOwnPhone(phoneKey.e164);
      syncProfileToUserStore(walletAddress, username);
      // D30: country and region were set on the agreement step, so the profile is the last step
      router.replace(FEATURES.accountRoles ? '/home' : '/residence');
    } catch (err) {
      console.warn('[onboarding] create_profile failed:', err);
      setSubmitError(describeTxError(err, 'profile'));
    } finally {
      setSubmitting(false);
    }
  };

  const userHint = {
    empty: { text: '3–20 characters: letters, numbers or _', color: colors.textTertiary },
    invalid: { text: 'Use 3–20 characters: letters, numbers or _', color: colors.warningText },
    checking: { text: `Checking @${username}…`, color: colors.textTertiary },
    available: { text: `@${username} is available`, color: colors.successText },
    taken: {
      text: suggestions.length ? `@${username} is taken. Try one of these:` : `@${username} is taken.`,
      color: colors.errorText,
    },
    error: { text: 'Could not check this username. Check your connection.', color: colors.warningText },
  }[usernameState];

  const phoneHint = {
    empty: { text: "Optional. Shown as an unverified number: we don't send a code to check it.", color: colors.textTertiary },
    invalid: { text: 'Enter a 9–10 digit Vietnamese number', color: colors.warningText },
    checking: { text: 'Checking this number…', color: colors.textTertiary },
    ok: { text: "Unverified number · we don't send a code to check it", color: colors.successText },
    taken: {
      text: "This number is already linked to another N.E.D account. If it's yours, use your @username.",
      color: colors.errorText,
    },
    error: { text: 'Could not check this number. Check your connection.', color: colors.warningText },
  }[phoneState];


  return (
    <OnbScreen glow={false}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {FEATURES.accountRoles ? (
          <StepHeader step={accountSteps} total={accountSteps} onBack={() => router.replace('/agreement')} />
        ) : (
          <StepHeader step={2} total={3} onBack={() => router.replace('/consent')} />
        )}
        <ScrollView style={styles.flex} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={onbText.h1} accessibilityRole="header">
            Create your profile
          </Text>
          <Text style={[onbText.lead, styles.lead]}>Clients find you by your @username to send you a contract.</Text>

          {walletAddress ? (
            <View style={styles.avatarCard}>
              <Avatar seed={walletAddress} size={64} decorative />
              <View style={styles.flex}>
                <Text style={styles.avatarTitle}>Your avatar</Text>
                <Text style={[onbText.small, styles.avatarSub]}>
                  Made from your wallet address. It stays the same on every device. No photo needed.
                </Text>
              </View>
            </View>
          ) : null}

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
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              maxLength={20}
              style={styles.input}
            />
            {usernameState === 'checking' ? <ActivityIndicator size="small" color={colors.purple[300]} /> : null}
            {usernameState === 'available' ? <Feather name="check" size={18} color={colors.successText} /> : null}
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

          {/* C3 (compliance fix list): the optional phone field is hidden in the demo; its on-chain hash could be reversed */}
          {SHOW_PHONE_FIELD ? (
            <>
          <Text style={[onbText.label, styles.label]} nativeID="onb-phone-label">
            Phone number <Text style={styles.optional}>(optional)</Text>
          </Text>
          <>
              <View style={[styles.field, fieldBorder(phoneState === 'ok', phoneState === 'taken')]}>
                <Text style={styles.country}>VN +84</Text>
                <TextInput
                  accessibilityLabelledBy="onb-phone-label"
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="90 123 4567"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  style={styles.input}
                />
                {phoneState === 'checking' ? <ActivityIndicator size="small" color={colors.purple[300]} /> : null}
                {phoneState === 'ok' ? <Feather name="check" size={18} color={colors.successText} /> : null}
              </View>
              <Text style={[styles.hint, { color: phoneHint.color }]} accessibilityLiveRegion="polite">
                {phoneHint.text}
              </Text>
          </>
            </>
          ) : null}

          <NoticeCard tone="info" style={styles.notice}>
            <Text style={onbText.small}>
              Your @username and wallet address are public on Solana.
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
            {/* A4: no SOL amount (this step comes before the region choice, which defaults to the Vietnam view) */}
            One-time setup on devnet, covered by test SOL. It has no value.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </OnbScreen>
  );
}

/** OnbProfile field: white with S1; a green halo when valid, a red fill when taken (no outlines) */
function fieldBorder(ok: boolean, bad: boolean) {
  if (bad) return { backgroundColor: status.error.bg };
  if (ok) return { backgroundColor: palette.card, boxShadow: '0 0 0 3px rgba(22,163,74,0.16)' };
  return { backgroundColor: palette.card, ...elevation.s1 };
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingHorizontal: space[6], paddingTop: space[6], paddingBottom: space[4] },
  lead: { marginTop: space[2] },
  label: { marginTop: space[5], fontFamily: fonts.bodySemi, fontSize: 13, color: palette.ink2 },
  field: {
    marginTop: space[2],
    height: 54,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    borderRadius: 14,
  },
  avatarCard: { marginTop: space[5], flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: radius.xl, backgroundColor: palette.card },
  avatarTitle: { fontFamily: fonts.display, fontSize: 16, color: palette.ink },
  avatarSub: { marginTop: 2 },
  optional: { fontFamily: fonts.bodyMedium, color: palette.caption },
  prefix: { ...type.mono, fontSize: 16, color: colors.textTertiary },
  country: {
    ...type.body,
    fontSize: 15,
    color: colors.text,
    paddingRight: space[2],
  },
  input: { flex: 1, minWidth: 0, height: 50, color: colors.text, fontFamily: fonts.mono, fontSize: 16 },
  hint: { ...type.caption, marginTop: space[2] },
  suggestions: { marginTop: space[2], flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  chip: {
    height: 34,
    paddingHorizontal: space[3],
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: palette.tint,
  },
  chipText: { ...type.mono, fontSize: 12, color: palette.link },
  notice: { marginTop: space[4] },
  link: { ...type.caption, marginTop: space[2], fontFamily: fonts.bodySemi, color: palette.link, textDecorationLine: 'underline' },
  footer: { paddingHorizontal: space[6], paddingTop: space[3], paddingBottom: space[8] },
  cost: { marginTop: space[3] },
});
