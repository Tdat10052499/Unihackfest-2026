// D30 step 3 of 5 · About your business (boards OnbBusiness, OnbBusinessError). Behind FEATURES.accountRoles. Business
// details are self-declared and stay on this device; the registration number never leaves it.
// ?edit=1 (Settings → Business, R5): edits the saved details of the profile, then goes back.
import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { BUSINESS_COPY, COUNTRY_COPY, ROLE_COPY } from '@ned/core/account/copy.ts';
import { countryName, searchCountries } from '@ned/core/account/countries.ts';
import { canRegisterBusinessIn, validateBusiness, type BusinessField } from '@ned/core/account/rules.ts';
import { TEAM_SIZES, type BusinessDetails, type TeamSize } from '@ned/core/account/types.ts';
import { useAuth } from '../../services/auth';
import { draftFromProfile, isBusinessDraft, signupSteps } from '../../services/accountOnboarding';
import { useAccountStore } from '../../stores/useAccountStore';
import { useSignupDraft } from '../../stores/useSignupDraft';
import { FEATURES } from '../../constants/features';
import { OnbScreen, PrimaryButton, StepHeader } from '../../components/onboarding/ui';
import { Chip, CodeChip, CountryRows, EditHeader, FootCaption, StepTitle, TintNotice, accountStyles } from '../../components/onboarding/account';
import { Field, Sheet } from '@/components/design';
import { elevation, fonts, palette, radius, space, status } from '../../constants/design';

interface Form {
  name: string;
  registeredIn: string;
  size: TeamSize | null;
  industry: number | null;
  website: string;
  title: string;
  registrationNo: string;
}

const optional = (v: string) => (v.trim() ? v.trim() : undefined);

function toBusiness(f: Form): BusinessDetails {
  return {
    name: f.name.trim(),
    registeredIn: f.registeredIn,
    size: (f.size ?? '') as TeamSize,
    industry: f.industry ?? -1,
    website: optional(f.website),
    title: optional(f.title),
    registrationNo: optional(f.registrationNo),
  };
}

export default function BusinessScreen() {
  const { isReady, isAuthenticated, walletAddress } = useAuth();
  const edit = Boolean(useLocalSearchParams<{ edit?: string }>().edit);
  const signupDraft = useSignupDraft((st) => st.draft);
  const setDraft = useSignupDraft((st) => st.setDraft);
  const saved = useAccountStore((st) => st.getProfile(walletAddress));
  // Edit mode works on the saved profile; sign-up on the in-memory draft
  const draft = edit && saved ? draftFromProfile(saved) : signupDraft;
  const b = draft.business;
  const [form, setForm] = useState<Form>(() => ({
    name: b?.name ?? '',
    // A business is usually registered where its person lives; Vietnam is never prefilled (it cannot be a client)
    registeredIn: b?.registeredIn ?? (draft.country && canRegisterBusinessIn(draft.country) ? draft.country : ''),
    size: b?.size ?? null,
    industry: b?.industry ?? null,
    website: b?.website ?? '',
    title: b?.title ?? '',
    registrationNo: b?.registrationNo ?? '',
  }));
  const [tried, setTried] = useState(false);
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState('');
  const countries = useMemo(() => searchCountries(query), [query]);

  useEffect(() => {
    if (isReady && !isAuthenticated) router.replace('/welcome');
  }, [isReady, isAuthenticated]);

  if (!FEATURES.accountRoles) return <Redirect href="/setup" />;
  if (edit && !saved) return <Redirect href="/settings" />;
  if (!isBusinessDraft(draft) || !draft.country) return <Redirect href={edit ? '/settings' : '/role'} />;

  const errors = validateBusiness(toBusiness(form));
  const errorOf = (f: BusinessField) => (tried ? errors.find((e) => e.field === f)?.message || undefined : undefined);
  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));
  const blocked = tried && errors.length > 0;

  const next = () => {
    setTried(true);
    if (errors.length) return;
    if (edit && saved && walletAddress) {
      useAccountStore.getState().setProfile(walletAddress, { ...saved, business: toBusiness(form), updatedAt: Date.now() });
      router.back();
      return;
    }
    setDraft({ ...draft, business: toBusiness(form) });
    router.push('/agreement');
  };

  const regError = errorOf('registeredIn');
  const regName = form.registeredIn ? countryName(form.registeredIn) : undefined;

  return (
    <OnbScreen glow={false}>
      <KeyboardAvoidingView style={accountStyles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {edit ? <EditHeader onBack={() => router.back()} /> : <StepHeader step={3} total={signupSteps(draft)} onBack={() => router.replace('/country')} />}
        <ScrollView style={accountStyles.flex} contentContainerStyle={accountStyles.scroll} keyboardShouldPersistTaps="handled">
          <StepTitle title={BUSINESS_COPY.title} sub={BUSINESS_COPY.sub} />
          <TintNotice text={BUSINESS_COPY.selfDeclared} icon="shield-off" style={styles.notice} />

          <Text style={accountStyles.label}>{BUSINESS_COPY.name.label}</Text>
          <Field
            on="ground"
            accessibilityLabel={BUSINESS_COPY.name.label}
            value={form.name}
            onChangeText={(name) => set({ name })}
            placeholder={BUSINESS_COPY.name.placeholder}
            autoComplete="organization"
            maxLength={80}
            error={errorOf('name')}
            containerStyle={styles.fieldTight}
          />

          <Text style={accountStyles.label} nativeID="biz-reg-label">
            {BUSINESS_COPY.registeredIn.label}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabelledBy="biz-reg-label"
            accessibilityHint={regError}
            onPress={() => setPicking(true)}
            style={[styles.select, regError ? styles.selectError : elevation.s1]}
          >
            {regName ? <CodeChip code={form.registeredIn} /> : null}
            <Text style={[styles.selectText, !regName && styles.placeholder]} numberOfLines={1}>
              {regName ?? BUSINESS_COPY.registeredIn.placeholder}
            </Text>
            <Feather name="chevron-right" size={18} color={palette.caption} />
          </Pressable>
          {regError ? <Text style={styles.error}>{regError}</Text> : null}

          <Text style={accountStyles.label}>{BUSINESS_COPY.size.label}</Text>
          <View accessibilityRole="radiogroup" accessibilityLabel={BUSINESS_COPY.size.label} style={styles.sizeRow}>
            {TEAM_SIZES.map((t) => (
              // One row of five equal chips (board OnbBusiness)
              <Chip key={t.id} label={t.label} on={form.size === t.id} onPress={() => set({ size: t.id })} style={styles.sizeChip} />
            ))}
          </View>
          {errorOf('size') ? <Text style={styles.error}>{errorOf('size')}</Text> : null}

          <Text style={accountStyles.label}>{BUSINESS_COPY.industry.label}</Text>
          <View accessibilityRole="radiogroup" accessibilityLabel={BUSINESS_COPY.industry.label} style={styles.wrap}>
            {BUSINESS_COPY.industry.options.map((label, i) => (
              <Chip key={label} label={label} on={form.industry === i} onPress={() => set({ industry: i })} />
            ))}
          </View>
          {errorOf('industry') ? <Text style={styles.error}>{errorOf('industry')}</Text> : null}

          <OptionalLabel text={BUSINESS_COPY.website.label} />
          <Field
            on="ground"
            value={form.website}
            onChangeText={(website) => set({ website })}
            placeholder={BUSINESS_COPY.website.placeholder}
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
            error={errorOf('website')}
            accessibilityLabel={BUSINESS_COPY.website.label}
            containerStyle={styles.fieldTight}
          />

          <OptionalLabel text={BUSINESS_COPY.role.label} />
          <Field
            on="ground"
            value={form.title}
            onChangeText={(title) => set({ title })}
            placeholder={BUSINESS_COPY.role.placeholder}
            maxLength={60}
            accessibilityLabel={BUSINESS_COPY.role.label}
            containerStyle={styles.fieldTight}
          />

          <OptionalLabel text={BUSINESS_COPY.regNo.label} />
          <Field
            on="ground"
            value={form.registrationNo}
            onChangeText={(registrationNo) => set({ registrationNo })}
            maxLength={40}
            autoCapitalize="characters"
            autoCorrect={false}
            accessibilityLabel={BUSINESS_COPY.regNo.label}
            containerStyle={styles.fieldTight}
          />
          <View style={styles.device}>
            <Feather name="smartphone" size={16} color={palette.caption} />
            <Text style={styles.deviceText}>{BUSINESS_COPY.regNo.help}</Text>
          </View>
        </ScrollView>
        <View style={accountStyles.footer}>
          <PrimaryButton title={ROLE_COPY.common.continue} onPress={next} disabled={blocked} />
          {blocked ? <FootCaption text={BUSINESS_COPY.fixErrors} /> : null}
        </View>
      </KeyboardAvoidingView>

      <Sheet visible={picking} onClose={() => setPicking(false)} title={BUSINESS_COPY.registeredIn.label}>
        <View style={[styles.sheetSearch]}>
          <Feather name="search" size={18} color={palette.caption} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={COUNTRY_COPY.search}
            placeholderTextColor={palette.muted}
            accessibilityLabel={COUNTRY_COPY.search}
            autoCorrect={false}
            style={styles.sheetInput}
          />
        </View>
        <ScrollView style={styles.sheetList} keyboardShouldPersistTaps="handled">
          <CountryRows
            countries={countries}
            selected={form.registeredIn || null}
            onPick={(code) => {
              set({ registeredIn: code });
              setPicking(false);
              setQuery('');
            }}
          />
        </ScrollView>
      </Sheet>
    </OnbScreen>
  );
}

/** "Label (optional)": the deck label with "(optional)" in the caption colour */
function OptionalLabel({ text }: { text: string }) {
  const at = text.lastIndexOf(' (optional)');
  return (
    <Text style={accountStyles.label}>
      {at > 0 ? text.slice(0, at) : text}
      {at > 0 ? <Text style={accountStyles.optional}>{text.slice(at)}</Text> : null}
    </Text>
  );
}

const styles = StyleSheet.create({
  notice: { marginTop: 18 },
  fieldTight: { marginTop: space[2] },
  select: { marginTop: space[2], height: 52, paddingHorizontal: space[4], flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: radius.lg, backgroundColor: palette.card },
  selectError: { backgroundColor: status.error.bg },
  selectText: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 16, color: palette.ink },
  placeholder: { color: palette.muted, fontFamily: fonts.body },
  error: { marginTop: 6, fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: status.error.ink },
  sizeRow: { marginTop: space[2], flexDirection: 'row', gap: 6 },
  sizeChip: { flex: 1, minWidth: 0, paddingHorizontal: space[1] },
  wrap: { marginTop: space[2], flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  device: { marginTop: 6, flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  deviceText: { flex: 1, fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: palette.caption },
  sheetSearch: { height: 48, paddingHorizontal: space[4], flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: radius.lg, backgroundColor: palette.field },
  sheetInput: { flex: 1, minWidth: 0, height: 46, fontFamily: fonts.body, fontSize: 16, color: palette.ink },
  sheetList: { marginTop: space[3], maxHeight: 360 },
});
