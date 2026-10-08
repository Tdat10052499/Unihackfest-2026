// D30 step 2 · Where do you live now? (board OnbCountry). Behind FEATURES.accountRoles. Residence is self-declared:
// no geolocation, no IP lookup. Vietnam with a client role opens "Join as a freelancer?".
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { COUNTRY_COPY, ROLE_COPY } from '@ned/core/account/copy.ts';
import { searchCountries } from '@ned/core/account/countries.ts';
import { regionFromCountry } from '@ned/core/account/rules.ts';
import { useAuth } from '../../services/auth';
import { countryChoice, draftAsVietnamFreelancer, roleChoiceOf, routeAfterCountry, signupSteps } from '../../services/accountOnboarding';
import { useSignupDraft } from '../../stores/useSignupDraft';
import { FEATURES } from '../../constants/features';
import { OnbScreen, PrimaryButton, StepHeader } from '../../components/onboarding/ui';
import { CountryRows, FootCaption, InfoLine, StepTitle, TintNotice, accountStyles } from '../../components/onboarding/account';
import { Button, DText, Sheet } from '@/components/design';
import { elevation, fonts, palette, radius, space } from '../../constants/design';

export default function CountryScreen() {
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
    <OnbScreen glow={false}>
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
});
