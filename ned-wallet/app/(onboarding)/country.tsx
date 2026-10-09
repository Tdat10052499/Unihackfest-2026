// D30 step 2 · Where do you live now? (board OnbCountry). Behind FEATURES.accountRoles. Residence is self-declared:
// no geolocation, no IP lookup. Vietnam with a client role opens "Join as a freelancer?".
// ?edit=1 (Settings → Where you live, R5): the same list for a saved profile; a change asks to confirm
// (SheetChangeCountry) or is refused while client work is open (SheetCountryBlocked). This closes D17.
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { COUNTRY_COPY, ROLE_COPY, SETTINGS_COPY } from '@ned/core/account/copy.ts';
import { countryName, searchCountries } from '@ned/core/account/countries.ts';
import { regionFromCountry } from '@ned/core/account/rules.ts';
import { useAuth } from '../../services/auth';
import { countryChoice, draftAsVietnamFreelancer, roleChoiceOf, routeAfterCountry, signupSteps } from '../../services/accountOnboarding';
import { countryChange, profileWithCountry } from '../../services/accountSettings';
import { listMyJobs } from '@ned/core/jobs/queries.ts';
import { LOAD_ERROR, useFunds } from '../../hooks/useFunds';
import { useAccountStore } from '../../stores/useAccountStore';
import { useRegionStore } from '../../stores/useRegionStore';
import type { CountryChange } from '@ned/core/account/rules.ts';
import { useSignupDraft } from '../../stores/useSignupDraft';
import { FEATURES } from '../../constants/features';
import { OnbScreen, PrimaryButton, StepHeader } from '../../components/onboarding/ui';
import { CodeChip, CountryRows, EditHeader, FootCaption, InfoLine, StepTitle, TintNotice, accountStyles } from '../../components/onboarding/account';
import { Button, DText, Sheet } from '@/components/design';
import { elevation, fonts, palette, radius, space, status } from '../../constants/design';

export default function CountryScreen() {
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  return edit ? <CountryEdit /> : <SignupCountry />;
}

function SignupCountry() {
  const { isReady, isAuthenticated } = useAuth();
  const draft = useSignupDraft((st) => st.draft);
  const setDraft = useSignupDraft((st) => st.setDraft);
  const [query, setQuery] = useState('');
  const [askFreelancer, setAskFreelancer] = useState(false);
  const countries = useMemo(() => searchCountries(query), [query]);

  useEffect(() => {
    if (isReady && !isAuthenticated) router.replace('/welcome');
  }, [isReady, isAuthenticated]);

  if (!FEATURES.accountRoles) return <Redirect href="/setup" />;
  if (!roleChoiceOf(draft)) return <Redirect href="/role" />;

  const pick = (code: string) => {
    const r = countryChoice(draft, code);
    setDraft(r.draft);
    setAskFreelancer(r.askFreelancer);
  };

  return (
    <OnbScreen>
      <StepHeader step={2} total={signupSteps(draft)} onBack={() => router.replace('/role')} />
      <ScrollView style={accountStyles.flex} contentContainerStyle={accountStyles.scroll} keyboardShouldPersistTaps="handled">
        <StepTitle title={COUNTRY_COPY.title} sub={COUNTRY_COPY.sub} />
        <View style={[styles.search, elevation.s1]}>
          <Feather name="search" size={18} color={palette.caption} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={COUNTRY_COPY.search}
            placeholderTextColor={palette.muted}
            accessibilityLabel={COUNTRY_COPY.search}
            autoCorrect={false}
            autoCapitalize="none"
            style={styles.input}
          />
        </View>
        <View accessibilityRole="radiogroup" accessibilityLabel={COUNTRY_COPY.title} style={[styles.list, elevation.s1]}>
          {countries.length ? (
            <ScrollView nestedScrollEnabled style={styles.listScroll} keyboardShouldPersistTaps="handled">
              <CountryRows countries={countries} selected={draft.country} onPick={pick} />
            </ScrollView>
          ) : (
            <DText variant="body" tone="secondary" style={styles.empty}>
              {COUNTRY_COPY.noResult(query.trim())}
            </DText>
          )}
        </View>
        {draft.country ? (
          <TintNotice text={regionFromCountry(draft.country) === 'vn' ? COUNTRY_COPY.noteVN : COUNTRY_COPY.noteIntl} style={styles.notice} />
        ) : null}
        <InfoLine text={COUNTRY_COPY.settingsHint} style={styles.hint} />
      </ScrollView>
      <View style={accountStyles.footer}>
        <PrimaryButton title={ROLE_COPY.common.continue} onPress={() => router.push(routeAfterCountry(draft))} disabled={!draft.country} />
        {!draft.country ? <FootCaption text={ROLE_COPY.common.chooseOne} /> : null}
      </View>

      <Sheet visible={askFreelancer} onClose={() => setAskFreelancer(false)} title={COUNTRY_COPY.vnClient.title}>
        <DText variant="body" style={styles.sheetBody}>
          {COUNTRY_COPY.vnClient.body}
        </DText>
        <Button
          title={COUNTRY_COPY.vnClient.primary}
          onPress={() => {
            setDraft(draftAsVietnamFreelancer(draft));
            setAskFreelancer(false);
          }}
          style={styles.sheetPrimary}
        />
        <Button title={COUNTRY_COPY.vnClient.secondary} variant="secondary" onPress={() => setAskFreelancer(false)} style={styles.sheetSecondary} />
      </Sheet>
    </OnbScreen>
  );
}

/** Settings → Where you live: change the saved country (R5) */
function CountryEdit() {
  const { isReady, isAuthenticated, walletAddress } = useAuth();
  const profile = useAccountStore((st) => st.getProfile(walletAddress));
  const [selected, setSelected] = useState<string | null>(profile?.country ?? null);
  const [query, setQuery] = useState('');
  const countries = useMemo(() => searchCountries(query), [query]);
  const { funds, loading: fundsLoading, error: fundsError } = useFunds('client');
  const [listings, setListings] = useState<{ state: string }[] | null>(null);
  const [listingsError, setListingsError] = useState(false);
  const [decision, setDecision] = useState<CountryChange | null>(null);

  useEffect(() => {
    if (isReady && !isAuthenticated) router.replace('/welcome');
  }, [isReady, isAuthenticated]);

  // Open listings of this wallet (Open or Selected) count against a move to Vietnam
  useEffect(() => {
    if (!walletAddress) return;
    let active = true;
    listMyJobs(walletAddress)
      .then((jobs) => active && setListings(jobs))
      .catch(() => active && setListingsError(true));
    return () => {
      active = false;
    };
  }, [walletAddress]);

  if (!FEATURES.accountRoles) return <Redirect href="/settings" />;
  if (!profile || !walletAddress) return <Redirect href="/settings" />;

  const counting = fundsLoading || (listings === null && !listingsError);
  const loadError = fundsError || (listingsError ? LOAD_ERROR : '');
  const changed = selected !== null && selected !== profile.country;

  const next = () => {
    if (!selected || !changed || !listings) return;
    setDecision(countryChange(profile, selected, funds, listings));
  };
  const confirm = () => {
    if (!selected) return;
    const updated = profileWithCountry(profile, selected, Date.now());
    useAccountStore.getState().setProfile(walletAddress, updated);
    useRegionStore.getState().setRegion(walletAddress, regionFromCountry(selected));
    setDecision(null);
    router.back();
  };

  return (
    <OnbScreen>
      <EditHeader onBack={() => router.back()} />
      <ScrollView style={accountStyles.flex} contentContainerStyle={accountStyles.scroll} keyboardShouldPersistTaps="handled">
        <StepTitle title={COUNTRY_COPY.title} sub={COUNTRY_COPY.sub} />
        <View style={[styles.search, elevation.s1]}>
          <Feather name="search" size={18} color={palette.caption} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={COUNTRY_COPY.search}
            placeholderTextColor={palette.muted}
            accessibilityLabel={COUNTRY_COPY.search}
            autoCorrect={false}
            autoCapitalize="none"
            style={styles.input}
          />
        </View>
        <View accessibilityRole="radiogroup" accessibilityLabel={COUNTRY_COPY.title} style={[styles.list, elevation.s1]}>
          {countries.length ? (
            <ScrollView nestedScrollEnabled style={styles.listScroll} keyboardShouldPersistTaps="handled">
              <CountryRows countries={countries} selected={selected} onPick={setSelected} />
            </ScrollView>
          ) : (
            <DText variant="body" tone="secondary" style={styles.empty}>
              {COUNTRY_COPY.noResult(query.trim())}
            </DText>
          )}
        </View>
        {selected ? (
          <TintNotice text={regionFromCountry(selected) === 'vn' ? COUNTRY_COPY.noteVN : COUNTRY_COPY.noteIntl} style={styles.notice} />
        ) : null}
        {loadError ? <InfoLine text={loadError} style={styles.hint} /> : null}
      </ScrollView>
      <View style={accountStyles.footer}>
        <PrimaryButton title={ROLE_COPY.common.continue} onPress={next} disabled={!changed || !!loadError} loading={changed && counting} />
      </View>

      <Sheet
        visible={decision?.ok === true}
        onClose={() => setDecision(null)}
        title={SETTINGS_COPY.sheet.change.title}
      >
        <DText variant="body" style={styles.sheetBody}>
          {SETTINGS_COPY.sheet.change.body}
        </DText>
        {selected ? (
          <View style={styles.fromTo} accessibilityLabel={`${countryName(profile.country)} → ${countryName(selected)}`}>
            <CodeChip code={profile.country} on="ground" />
            <DText variant="body">{countryName(profile.country)}</DText>
            <Feather name="arrow-right" size={18} color={palette.caption} />
            <CodeChip code={selected} on="ground" />
            <DText variant="body">{countryName(selected)}</DText>
          </View>
        ) : null}
        <Button title={SETTINGS_COPY.sheet.change.primary(selected ? countryName(selected) ?? selected : '')} onPress={confirm} style={styles.sheetPrimary} />
        <Button title={SETTINGS_COPY.sheet.change.cancel} variant="secondary" onPress={() => setDecision(null)} style={styles.sheetSecondary} />
      </Sheet>

      <Sheet
        visible={decision?.ok === false && decision.reason === 'openClientWork'}
        onClose={() => setDecision(null)}
        title={decision?.ok === false && decision.copy ? decision.copy.title : SETTINGS_COPY.sheet.blocked.title}
      >
        <View style={styles.warnTile}>
          <Feather name="alert-triangle" size={24} color={status.warning.ink} />
        </View>
        <DText variant="body" style={styles.sheetBody}>
          {decision?.ok === false && decision.copy ? decision.copy.body : ''}
        </DText>
        <Button title={SETTINGS_COPY.sheet.blocked.ok} onPress={() => setDecision(null)} style={styles.sheetPrimary} />
      </Sheet>
    </OnbScreen>
  );
}

const styles = StyleSheet.create({
  search: { marginTop: 18, height: 52, paddingHorizontal: space[4], flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: radius.lg, backgroundColor: palette.card },
  input: { flex: 1, minWidth: 0, height: 50, fontFamily: fonts.body, fontSize: 16, color: palette.ink },
  list: { marginTop: space[3], borderRadius: radius.xl, backgroundColor: palette.card, overflow: 'hidden' },
  listScroll: { maxHeight: 341 },
  empty: { padding: space[4] },
  notice: { marginTop: space[3] },
  hint: { marginTop: space[3] },
  sheetBody: { color: palette.ink2, fontSize: 15, lineHeight: 22 },
  sheetPrimary: { marginTop: space[6] },
  sheetSecondary: { marginTop: 10 },
  fromTo: { marginTop: space[4], padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: radius.lg, backgroundColor: palette.field },
  warnTile: { width: 48, height: 48, marginBottom: space[3], borderRadius: radius.lg, backgroundColor: status.warning.bg, alignItems: 'center', justifyContent: 'center' },
});
